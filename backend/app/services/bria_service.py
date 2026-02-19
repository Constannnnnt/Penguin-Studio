"""
Bria API Service for image generation using FIBO model.

This service handles all interactions with Bria's image generation API,
including generation, refinement, caching, and rate limiting.
"""

import asyncio
import base64
import hashlib
import io
import json
import re
import time
import uuid
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx
from loguru import logger
from PIL import Image
from pydantic import BaseModel, Field, ConfigDict

from app.config import settings


class StructuredPromptObject(BaseModel):
    """Object description in structured prompt."""
    model_config = ConfigDict(extra="allow")

    description: str = ""
    location: str = ""
    relationship: str = ""
    relative_size: str = ""
    shape_and_color: str = ""
    texture: str = ""
    appearance_details: str = ""
    orientation: str = ""
    number_of_objects: Optional[int] = None
    pose: Optional[str] = None
    expression: Optional[str] = None
    action: Optional[str] = None


class StructuredPromptLighting(BaseModel):
    """Lighting description in structured prompt."""
    model_config = ConfigDict(extra="allow")

    conditions: str = ""
    direction: str = ""
    shadows: str = ""


class StructuredPromptAesthetics(BaseModel):
    """Aesthetics description in structured prompt."""
    model_config = ConfigDict(extra="allow")

    composition: str = ""
    color_scheme: str = ""
    mood_atmosphere: str = ""
    preference_score: str = ""
    aesthetic_score: str = ""


class StructuredPromptPhotographic(BaseModel):
    """Photographic characteristics in structured prompt."""
    model_config = ConfigDict(extra="allow")

    depth_of_field: str = ""
    focus: str = ""
    camera_angle: str = ""
    lens_focal_length: str = ""


class StructuredPromptTextRender(BaseModel):
    """Text render element in structured prompt."""
    model_config = ConfigDict(extra="allow")

    text: str = ""
    location: str = ""
    size: str = ""
    color: str = ""
    font: str = ""
    appearance_details: str = ""


class StructuredPrompt(BaseModel):
    """Full structured prompt for Bria FIBO model."""
    model_config = ConfigDict(extra="allow")

    short_description: str = ""
    objects: List[StructuredPromptObject] = Field(default_factory=list)
    background_setting: str = ""
    lighting: StructuredPromptLighting = Field(default_factory=StructuredPromptLighting)
    aesthetics: StructuredPromptAesthetics = Field(default_factory=StructuredPromptAesthetics)
    photographic_characteristics: StructuredPromptPhotographic = Field(
        default_factory=StructuredPromptPhotographic
    )
    style_medium: str = ""
    text_render: Optional[List[StructuredPromptTextRender]] = None
    context: Optional[str] = None
    artistic_style: Optional[str] = None
    edit_instruction: Optional[str] = None


class GenerationParameters(BaseModel):
    """Parameters for image generation via Bria /v2/image/generate."""

    aspect_ratio: str = "1:1"
    seed: Optional[int] = None
    steps_num: Optional[int] = Field(default=30, ge=20, le=50)
    guidance_scale: Optional[int] = Field(default=None, ge=3, le=5)
    negative_prompt: Optional[str] = None
    model_version: Optional[str] = None
    sync: Optional[bool] = None
    ip_signal: Optional[bool] = None
    prompt_content_moderation: Optional[bool] = None
    visual_input_content_moderation: Optional[bool] = None
    visual_output_content_moderation: Optional[bool] = None
    # Deprecated legacy fields kept for compatibility with old clients.
    resolution: Optional[int] = None
    num_inference_steps: Optional[int] = None


class EditParameters(BaseModel):
    """Parameters for image editing via Bria /v2/image/edit."""

    seed: Optional[int] = None
    steps_num: Optional[int] = Field(default=None, ge=20, le=50)
    guidance_scale: Optional[int] = Field(default=None, ge=3, le=5)
    negative_prompt: Optional[str] = None
    model_version: Optional[str] = None
    sync: Optional[bool] = None
    ip_signal: Optional[bool] = None
    prompt_content_moderation: Optional[bool] = None
    visual_input_content_moderation: Optional[bool] = None
    visual_output_content_moderation: Optional[bool] = None


class GenerationResult(BaseModel):
    """Result from image generation."""
    image_url: str
    structured_prompt: StructuredPrompt
    seed: int
    generation_time_ms: float
    ip_warning: Optional[str] = None
    from_cache: bool = False


class GenerationMetadata(BaseModel):
    """Metadata for a saved generation."""
    id: str
    prompt: str
    seed: int
    parameters: GenerationParameters
    timestamp: str
    ip_warning: Optional[str] = None


class CacheEntry(BaseModel):
    """Cache entry for generation results."""
    prompt: str
    parameters: GenerationParameters
    result: GenerationResult
    timestamp: float


class BriaAPIError(Exception):
    """Base exception for Bria API errors."""
    def __init__(
        self,
        message: str,
        code: str,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class AuthenticationError(BriaAPIError):
    """Authentication failed."""
    def __init__(self, message: str = "Invalid API key"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class RateLimitError(BriaAPIError):
    """Rate limit exceeded."""
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, "RATE_LIMIT_ERROR", 429)
        self.retry_after = retry_after


class ServiceUnavailableError(BriaAPIError):
    """Service temporarily unavailable."""
    def __init__(self, message: str = "Service temporarily unavailable"):
        super().__init__(message, "SERVICE_UNAVAILABLE", 500)


class ValidationError(BriaAPIError):
    """Validation error."""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 400,
    ):
        super().__init__(message, "VALIDATION_ERROR", status_code, details)


class BriaService:
    """Service for interacting with Bria's image generation API."""

    BRIA_API_BASE_URL = "https://engine.prod.bria-api.com"
    IMAGE_GENERATE_ENDPOINT = "/v2/image/generate"
    IMAGE_EDIT_ENDPOINT = "/v2/image/edit"
    STRUCTURED_PROMPT_ENDPOINT = "/v2/structured_prompt/generate"
    DEFAULT_TIMEOUT = 120.0
    RETRY_ATTEMPTS = 3
    RETRY_DELAY = 1.0
    RETRY_BACKOFF = 2.0
    CACHE_MAX_AGE = 24 * 60 * 60  # 24 hours
    MIN_REQUEST_INTERVAL = 1.0  # 1 second between requests
    VISUAL_CACHE_MAX_ENTRIES = 128

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.bria_api_key
        if not self.api_key:
            logger.warning("Bria API key not configured")

        self._cache: Dict[str, CacheEntry] = {}
        self._visual_cache: "OrderedDict[str, Tuple[float, str]]" = OrderedDict()
        self._last_request_time = 0.0
        self._lock = asyncio.Lock()
        self._http_client = httpx.AsyncClient(
            timeout=self.DEFAULT_TIMEOUT,
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20),
        )

    def _get_cache_key(self, prompt: str, parameters: GenerationParameters) -> str:
        """Generate cache key from prompt and parameters."""
        key_data = f"{prompt}:{parameters.model_dump_json()}"
        return hashlib.sha256(key_data.encode()).hexdigest()

    @staticmethod
    def _is_base64_payload(value: str) -> bool:
        """Heuristic check for raw base64-encoded image payloads."""
        if len(value) < 128:
            return False
        return bool(re.fullmatch(r"[A-Za-z0-9+/=\s]+", value))

    def _resolve_local_visual_path(self, value: str) -> Optional[Path]:
        """
        Resolve local /outputs or /uploads URLs/paths to a filesystem path.

        Returns None when input is not a local path or cannot be resolved safely.
        """
        parsed = urlparse(value)
        candidate_path = parsed.path if parsed.scheme and parsed.netloc else value
        normalized = candidate_path.replace("\\", "/")

        prefix_map = {
            "/outputs/": settings.outputs_dir.resolve(),
            "/uploads/": settings.uploads_dir.resolve(),
        }

        for prefix, base_dir in prefix_map.items():
            if not normalized.startswith(prefix):
                continue

            relative = Path(normalized[len(prefix):].lstrip("/"))
            resolved = (base_dir / relative).resolve()

            try:
                resolved.relative_to(base_dir)
            except ValueError:
                logger.warning(f"Rejected path traversal attempt for visual input: {value}")
                return None

            if resolved.is_file():
                return resolved

            return None

        return None

    def _get_cached_local_visual(self, local_path: Path, field_name: str) -> Optional[str]:
        """Return cached base64 payload for local image/mask if file unchanged."""
        try:
            stat = local_path.stat()
        except OSError:
            return None

        cache_key = f"{field_name}:{local_path.resolve()}:{stat.st_mtime_ns}:{stat.st_size}"
        cached = self._visual_cache.get(cache_key)
        if cached:
            # Mark as recently used
            self._visual_cache.move_to_end(cache_key)
            return cached[1]
        return None

    def _set_cached_local_visual(self, local_path: Path, field_name: str, payload: str) -> None:
        """Store local visual payload in small LRU cache."""
        try:
            stat = local_path.stat()
        except OSError:
            return

        cache_key = f"{field_name}:{local_path.resolve()}:{stat.st_mtime_ns}:{stat.st_size}"
        self._visual_cache[cache_key] = (time.time(), payload)
        self._visual_cache.move_to_end(cache_key)

        while len(self._visual_cache) > self.VISUAL_CACHE_MAX_ENTRIES:
            self._visual_cache.popitem(last=False)

    def _normalize_visual_input(self, value: str, field_name: str) -> str:
        """
        Normalize image/mask payload for Bria API.

        Accepts:
        - Public URL
        - Raw base64
        - data URI
        - Local /outputs or /uploads URL/path (converted to base64)
        """
        if not isinstance(value, str) or not value.strip():
            raise ValidationError(f"{field_name} must be a non-empty string")

        trimmed = value.strip()

        if trimmed.startswith("data:image"):
            parts = trimmed.split(",", 1)
            raw_b64 = parts[1] if len(parts) == 2 else trimmed
            if field_name == "mask":
                try:
                    mask_bytes = base64.b64decode(raw_b64)
                    normalized = self._normalize_mask_image_bytes(mask_bytes)
                    return base64.b64encode(normalized).decode("ascii")
                except Exception as exc:
                    raise ValidationError(
                        "Invalid mask image payload",
                        {"field": field_name, "reason": str(exc)},
                    ) from exc
            return raw_b64

        if self._is_base64_payload(trimmed):
            if field_name == "mask":
                try:
                    mask_bytes = base64.b64decode(trimmed)
                    normalized = self._normalize_mask_image_bytes(mask_bytes)
                    return base64.b64encode(normalized).decode("ascii")
                except Exception as exc:
                    raise ValidationError(
                        "Invalid mask image payload",
                        {"field": field_name, "reason": str(exc)},
                    ) from exc
            return trimmed

        local_path = self._resolve_local_visual_path(trimmed)
        if local_path:
            cached = self._get_cached_local_visual(local_path, field_name)
            if cached:
                return cached

            raw_bytes = local_path.read_bytes()
            if field_name == "mask":
                raw_bytes = self._normalize_mask_image_bytes(raw_bytes)
            encoded = base64.b64encode(raw_bytes).decode("ascii")
            self._set_cached_local_visual(local_path, field_name, encoded)
            logger.debug(f"Converted local {field_name} to base64: {local_path}")
            return encoded

        # Fallback: assume it's a public URL
        return trimmed

    @staticmethod
    def _should_skip_mask_for_instruction(
        modification_prompt: Optional[str],
        structured_instruction_payload: Dict[str, Any],
    ) -> bool:
        """
        Skip mask for spatial edits where destination likely falls outside source mask.
        """
        prompt_parts: List[str] = []
        if isinstance(modification_prompt, str) and modification_prompt.strip():
            prompt_parts.append(modification_prompt.strip().lower())
        edit_instruction = structured_instruction_payload.get("edit_instruction")
        if isinstance(edit_instruction, str) and edit_instruction.strip():
            prompt_parts.append(edit_instruction.strip().lower())

        if not prompt_parts:
            return False

        combined = " ".join(prompt_parts)
        return bool(
            re.search(
                r"\b(move|moved|relocate|reposition|shift|position|top|bottom|left|right|center|middle|"
                r"size|resize|resized|smaller|larger|bigger|tiny|huge|isolated|separate|apart)\b",
                combined,
            )
        )

    @staticmethod
    def _validation_error_mentions_mask(error: ValidationError) -> bool:
        details = error.details or {}
        haystack_parts: List[str] = [str(error)]
        if isinstance(details, dict):
            for key in ("details", "raw", "message"):
                value = details.get(key)
                if value is not None:
                    if isinstance(value, (dict, list)):
                        haystack_parts.append(json.dumps(value, ensure_ascii=True))
                    else:
                        haystack_parts.append(str(value))
        else:
            haystack_parts.append(str(details))

        haystack = " ".join(haystack_parts).lower()
        mask_signals = [
            "mask",
            "same size",
            "black and white",
            "binary",
            "input image and the input mask",
            "visual_input_content_moderation",
        ]
        return any(signal in haystack for signal in mask_signals)

    @classmethod
    def _should_retry_edit_without_mask(
        cls,
        error: ValidationError,
        modification_prompt: Optional[str],
        structured_instruction_payload: Dict[str, Any],
    ) -> bool:
        if error.status_code != 422:
            return False

        if cls._should_skip_mask_for_instruction(
            modification_prompt, structured_instruction_payload
        ):
            return True

        return cls._validation_error_mentions_mask(error)

    @staticmethod
    def _normalize_mask_image_bytes(mask_bytes: bytes) -> bytes:
        """
        Convert any mask image format to strict black/white PNG bytes.

        Bria expects white=edited, black=preserved.
        """
        with Image.open(io.BytesIO(mask_bytes)) as image:
            if "A" in image.getbands():
                # Our local segmentation masks are RGBA with the mask in alpha.
                grayscale = image.getchannel("A").convert("L")
            else:
                grayscale = image.convert("L")

            binary = grayscale.point(lambda p: 255 if p > 127 else 0, mode="1")
            out = io.BytesIO()
            binary.convert("L").save(out, format="PNG")
            return out.getvalue()

    def _check_cache(
        self, prompt: str, parameters: GenerationParameters
    ) -> Optional[GenerationResult]:
        """Check if a cached result exists and is valid."""
        key = self._get_cache_key(prompt, parameters)
        entry = self._cache.get(key)
        
        if not entry:
            return None
        
        age = time.time() - entry.timestamp
        if age > self.CACHE_MAX_AGE:
            del self._cache[key]
            return None
        
        logger.info(f"Cache hit for prompt: {prompt[:50]}...")
        return entry.result

    def _set_cache(
        self,
        prompt: str,
        parameters: GenerationParameters,
        result: GenerationResult,
    ) -> None:
        """Store result in cache."""
        key = self._get_cache_key(prompt, parameters)
        self._cache[key] = CacheEntry(
            prompt=prompt,
            parameters=parameters,
            result=result,
            timestamp=time.time(),
        )

    def has_cached_result(self, prompt: str, parameters: GenerationParameters) -> bool:
        """Check if a cached result exists."""
        return self._check_cache(prompt, parameters) is not None

    def get_cache_age(self, prompt: str, parameters: GenerationParameters) -> Optional[float]:
        """Get age of cached result in seconds."""
        key = self._get_cache_key(prompt, parameters)
        entry = self._cache.get(key)
        if not entry:
            return None
        return time.time() - entry.timestamp

    async def _wait_for_rate_limit(self) -> None:
        """Wait if needed to respect rate limits."""
        async with self._lock:
            now = time.time()
            elapsed = now - self._last_request_time
            if elapsed < self.MIN_REQUEST_INTERVAL:
                wait_time = self.MIN_REQUEST_INTERVAL - elapsed
                logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            self._last_request_time = time.time()

    async def _poll_for_result(
        self,
        status_url: str,
        max_attempts: int = 60,
        poll_interval: float = 2.0,
    ) -> Dict[str, Any]:
        """Poll status URL until generation is complete."""
        headers = {
            "api_token": self.api_key,
            "Content-Type": "application/json",
        }

        for attempt in range(1, max_attempts + 1):
            try:
                response = await self._http_client.get(
                    status_url,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                status = data.get("status", "").lower()

                if status == "completed" or "result" in data:
                    logger.info(f"Generation completed after {attempt} poll(s)")
                    return data

                if status == "failed":
                    error_msg = data.get("error", "Generation failed")
                    raise ServiceUnavailableError(error_msg)

                logger.debug(f"Poll attempt {attempt}: status={status}")
                await asyncio.sleep(poll_interval)

            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500:
                    logger.warning(f"Poll attempt {attempt} failed: {e}")
                    await asyncio.sleep(poll_interval)
                else:
                    raise

        raise ServiceUnavailableError(
            f"Generation timed out after {max_attempts * poll_interval}s"
        )

    async def _make_request(
        self,
        payload: Dict[str, Any],
        endpoint: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> Dict[str, Any]:
        """Make HTTP request to Bria API with retry logic."""
        if not self.api_key:
            raise AuthenticationError("Bria API key is required")

        await self._wait_for_rate_limit()

        endpoint = endpoint or self.IMAGE_GENERATE_ENDPOINT
        url = f"{self.BRIA_API_BASE_URL}{endpoint}"
        headers = {
            "api_token": self.api_key,
            "Content-Type": "application/json",
        }

        last_error: Optional[Exception] = None
        
        for attempt in range(1, self.RETRY_ATTEMPTS + 1):
            try:
                logger.debug(f"Bria API request attempt {attempt}: {url}")
                response = await self._http_client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=timeout,
                )

                if response.status_code == 401:
                    raise AuthenticationError()

                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise RateLimitError(
                        retry_after=int(retry_after) if retry_after else None
                    )

                if response.status_code >= 500:
                    raise ServiceUnavailableError()

                if response.status_code == 400:
                    error_data = response.json()
                    raise ValidationError(
                        error_data.get("error", {}).get("message", "Invalid request"),
                        error_data.get("error", {}).get("details"),
                        status_code=response.status_code,
                    )

                if 400 < response.status_code < 500:
                    try:
                        error_data = response.json()
                    except Exception:
                        error_data = {}
                    raise ValidationError(
                        error_data.get("error", {}).get("message", "Invalid request"),
                        {
                            "details": error_data.get("error", {}).get("details"),
                            "raw": error_data,
                            "endpoint": endpoint,
                        },
                        status_code=response.status_code,
                    )

                response.raise_for_status()
                return response.json()

            except (AuthenticationError, ValidationError):
                raise
            except httpx.HTTPStatusError as e:
                response = e.response
                status_code = response.status_code if response is not None else None
                error_data: Dict[str, Any] = {}
                if response is not None:
                    try:
                        error_data = response.json()
                    except Exception:
                        error_data = {"raw_text": response.text}

                raise ValidationError(
                    error_data.get("error", {}).get("message", str(e)),
                    {
                        "details": error_data.get("error", {}).get("details"),
                        "raw": error_data,
                        "endpoint": endpoint,
                    },
                    status_code=status_code or 400,
                ) from e
            except (RateLimitError, ServiceUnavailableError) as e:
                last_error = e
                if attempt < self.RETRY_ATTEMPTS:
                    delay = self.RETRY_DELAY * (self.RETRY_BACKOFF ** (attempt - 1))
                    logger.warning(f"Retrying in {delay}s after error: {e}")
                    await asyncio.sleep(delay)
            except httpx.TimeoutException:
                last_error = ServiceUnavailableError("Request timed out")
                if attempt < self.RETRY_ATTEMPTS:
                    delay = self.RETRY_DELAY * (self.RETRY_BACKOFF ** (attempt - 1))
                    logger.warning(f"Timeout, retrying in {delay}s")
                    await asyncio.sleep(delay)
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error on attempt {attempt}: {e}")
                if attempt < self.RETRY_ATTEMPTS:
                    delay = self.RETRY_DELAY * (self.RETRY_BACKOFF ** (attempt - 1))
                    await asyncio.sleep(delay)

        raise last_error or ServiceUnavailableError("Request failed after retries")

    async def generate_image(
        self,
        prompt: Optional[str] = None,
        images: Optional[List[str]] = None,
        structured_prompt: Optional[StructuredPrompt] = None,
        parameters: Optional[GenerationParameters] = None,
        skip_cache: bool = False,
    ) -> GenerationResult:
        """
        Generate an image using Bria's FIBO model.
        
        Args:
            prompt: Text prompt for generation
            images: Optional list of reference image URLs or base64 data
            structured_prompt: Optional structured prompt for precise control
            parameters: Generation parameters (aspect ratio, steps, moderation flags, etc.)
            skip_cache: Skip cache lookup
            
        Returns:
            GenerationResult with image URL, structured prompt, and seed
        """
        if not prompt and not images and not structured_prompt:
            raise ValidationError("At least one of prompt, images, or structured_prompt is required")

        params = parameters or GenerationParameters()

        # Check cache for text-only prompts
        if prompt and not images and not structured_prompt and not skip_cache:
            cached = self._check_cache(prompt, params)
            if cached:
                cached.from_cache = True
                return cached

        # Build request payload
        payload: Dict[str, Any] = {}
        
        if prompt:
            payload["prompt"] = prompt
        if images:
            payload["images"] = images
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt.model_dump(exclude_none=True)

        payload["aspect_ratio"] = params.aspect_ratio
        if params.seed is not None:
            payload["seed"] = params.seed
        if params.steps_num is not None:
            payload["steps_num"] = params.steps_num
        elif params.num_inference_steps is not None:
            # Legacy alias
            payload["steps_num"] = params.num_inference_steps

        if params.guidance_scale is not None:
            payload["guidance_scale"] = params.guidance_scale
        if params.negative_prompt:
            payload["negative_prompt"] = params.negative_prompt
        if params.model_version:
            payload["model_version"] = params.model_version
        if params.sync is not None:
            payload["sync"] = params.sync
        if params.ip_signal is not None:
            payload["ip_signal"] = params.ip_signal
        if params.prompt_content_moderation is not None:
            payload["prompt_content_moderation"] = params.prompt_content_moderation
        if params.visual_input_content_moderation is not None:
            payload["visual_input_content_moderation"] = params.visual_input_content_moderation
        if params.visual_output_content_moderation is not None:
            payload["visual_output_content_moderation"] = params.visual_output_content_moderation

        logger.info(f"Generating image with prompt: {prompt[:50] if prompt else 'structured'}...")
        start_time = time.time()

        response = await self._make_request(payload)
        
        # Handle async response - poll for result if status_url is returned
        if "status_url" in response:
            response = await self._poll_for_result(response["status_url"])
        
        generation_time = (time.time() - start_time) * 1000

        # Parse response - result may be nested under "result" key
        result_data = response.get("result", response)

        # structured prompt may be returned under either key depending on endpoint version
        sp_data = result_data.get("structured_prompt")
        if sp_data is None:
            sp_data = result_data.get("structured_instruction", {})
        if isinstance(sp_data, str):
            sp_data = json.loads(sp_data)

        result = GenerationResult(
            image_url=result_data["image_url"],
            structured_prompt=StructuredPrompt(**sp_data),
            seed=result_data["seed"],
            generation_time_ms=generation_time,
            ip_warning=response.get("warning"),
            from_cache=False,
        )

        # Log IP warning if present
        if result.ip_warning:
            logger.warning(f"IP warning detected: {result.ip_warning}")

        # Cache the result for text-only prompts
        if prompt and not images and not structured_prompt:
            self._set_cache(prompt, params, result)

        logger.info(f"Image generated in {generation_time:.0f}ms, seed={result.seed}")
        return result

    async def generate_structured_prompt(
        self,
        prompt: Optional[str] = None,
        images: Optional[List[str]] = None,
        structured_prompt: Optional[StructuredPrompt] = None,
        modification_prompt: Optional[str] = None,
    ) -> StructuredPrompt:
        """
        Generate or refine a structured prompt using Bria's VLM bridge.
        
        This endpoint generates a structured JSON prompt without generating an image.
        Useful for:
        - Converting text prompt to structured prompt
        - Analyzing reference images
        - Refining an existing structured prompt with modifications
        
        Args:
            prompt: Text prompt for generation
            images: Optional list of reference image URLs
            structured_prompt: Existing structured prompt to refine
            modification_prompt: Prompt describing modifications (e.g., "add sunlight")
            
        Returns:
            StructuredPrompt generated by the VLM bridge
        """
        if not prompt and not images and not structured_prompt:
            raise ValidationError(
                "At least one of prompt, images, or structured_prompt is required"
            )

        payload: Dict[str, Any] = {}
        
        if prompt:
            payload["prompt"] = prompt
        if images:
            payload["images"] = images
        if structured_prompt:
            # For refinement, structured_prompt should be a JSON string
            payload["structured_prompt"] = json.dumps(
                structured_prompt.model_dump(exclude_none=True)
            )
            # Add modification prompt if refining
            if modification_prompt:
                payload["prompt"] = modification_prompt

        logger.info("Generating structured prompt...")
        start_time = time.time()

        response = await self._make_request(
            payload, 
            endpoint=self.STRUCTURED_PROMPT_ENDPOINT
        )
        
        # Handle async response - poll for result if status_url is returned
        if "status_url" in response:
            response = await self._poll_for_result(response["status_url"])
        
        generation_time = (time.time() - start_time) * 1000
        logger.info(f"Structured prompt generated in {generation_time:.0f}ms")

        # Parse response - result may be nested under "result" key
        result_data = response.get("result", response)
        
        # Structured prompt/instruction may be a JSON string, parse it
        sp_data = result_data.get("structured_prompt")
        if sp_data is None:
            sp_data = result_data.get("structured_instruction", {})
        if isinstance(sp_data, str):
            sp_data = json.loads(sp_data)

        return StructuredPrompt(**sp_data)

    @staticmethod
    def _ensure_edit_context(
        structured_instruction_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Ensure structured_instruction has required context for Bria edit validation."""
        payload = dict(structured_instruction_payload)
        context_value = payload.get("context")
        if isinstance(context_value, str) and context_value.strip():
            return payload

        short_desc = payload.get("short_description")
        background = payload.get("background_setting")
        fallback_parts: List[str] = []
        if isinstance(short_desc, str) and short_desc.strip():
            fallback_parts.append(short_desc.strip())
        if isinstance(background, str) and background.strip():
            fallback_parts.append(f"Background: {background.strip()}")

        payload["context"] = (
            " ".join(fallback_parts).strip() or "Photo scene edit context."
        )
        return payload

    @staticmethod
    def _apply_edit_options(payload: Dict[str, Any], options: Optional[EditParameters]) -> None:
        """Map supported edit options to Bria /image/edit payload."""
        if not options:
            return

        if options.negative_prompt:
            payload["negative_prompt"] = options.negative_prompt
        if options.guidance_scale is not None:
            payload["guidance_scale"] = options.guidance_scale
        if options.model_version:
            payload["model_version"] = options.model_version
        if options.steps_num is not None:
            payload["steps_num"] = options.steps_num
        if options.seed is not None:
            payload["seed"] = options.seed
        if options.sync is not None:
            payload["sync"] = options.sync
        if options.ip_signal is not None:
            payload["ip_signal"] = options.ip_signal
        if options.prompt_content_moderation is not None:
            payload["prompt_content_moderation"] = options.prompt_content_moderation
        if options.visual_input_content_moderation is not None:
            payload["visual_input_content_moderation"] = (
                options.visual_input_content_moderation
            )
        if options.visual_output_content_moderation is not None:
            payload["visual_output_content_moderation"] = (
                options.visual_output_content_moderation
            )

    async def edit_image(
        self,
        source_image: str,
        structured_prompt: StructuredPrompt,
        seed: int,
        modification_prompt: Optional[str] = None,
        mask: Optional[str] = None,
        parameters: Optional[EditParameters] = None,
    ) -> GenerationResult:
        """
        Edit an image using updated structured prompt and original seed.
        
        Args:
            source_image: Source image URL/base64 (single image)
            structured_prompt: Updated structured prompt (serialized as structured_instruction JSON string)
            seed: Original seed for consistency
            modification_prompt: Optional prompt describing the modification (e.g., "add sunlight")
            mask: Optional mask URL/base64 for localized edits
            parameters: Optional generation parameters
            
        Returns:
            GenerationResult with edited image
        """
        params = parameters or EditParameters()
        if params.seed is None:
            params.seed = seed

        # Bria edit endpoint expects structured_instruction as a JSON string.
        structured_instruction_payload = self._ensure_edit_context(
            structured_prompt.model_dump(exclude_none=True)
        )

        # Always prefer the latest user intent for this edit request.
        # Re-using an older edit_instruction causes stale refinements.
        if modification_prompt and modification_prompt.strip():
            structured_instruction_payload["edit_instruction"] = modification_prompt.strip()
        structured_instruction_json = json.dumps(structured_instruction_payload)

        normalized_image = self._normalize_visual_input(source_image, "source_image")
        payload: Dict[str, Any] = {
            "images": [normalized_image],
            "structured_instruction": structured_instruction_json,
            "seed": params.seed,
        }
        self._apply_edit_options(payload, params)

        if mask:
            if self._should_skip_mask_for_instruction(
                modification_prompt, structured_instruction_payload
            ):
                logger.info(
                    "Skipping refinement mask for spatial edit instruction "
                    "to avoid constraining relocation outside masked area."
                )
            else:
                payload["mask"] = self._normalize_visual_input(mask, "mask")

        if "steps_num" not in payload:
            payload["steps_num"] = 30

        logger.info(
            "Editing image with Bria /image/edit endpoint, "
            f"seed={params.seed}, has_mask={'mask' in payload}, "
            f"modification={modification_prompt or 'none'}"
        )
        logger.debug(
            "Bria edit payload summary: images={}, has_mask={}, steps_num={}, guidance_scale={}",
            len(payload.get("images", [])),
            "mask" in payload,
            payload.get("steps_num"),
            payload.get("guidance_scale"),
        )
        start_time = time.time()

        try:
            response = await self._make_request(payload, endpoint=self.IMAGE_EDIT_ENDPOINT)
        except ValidationError as error:
            if (
                "mask" in payload
                and self._should_retry_edit_without_mask(
                    error, modification_prompt, structured_instruction_payload
                )
            ):
                retry_payload = dict(payload)
                retry_payload.pop("mask", None)
                logger.warning(
                    "Bria edit returned 422 and mask looked incompatible; "
                    "retrying once without mask for this request."
                )
                response = await self._make_request(
                    retry_payload, endpoint=self.IMAGE_EDIT_ENDPOINT
                )
            else:
                raise
        
        # Handle async response - poll for result if status_url is returned
        if "status_url" in response:
            response = await self._poll_for_result(response["status_url"])
        
        generation_time = (time.time() - start_time) * 1000

        # Parse response - result may be nested under "result" key
        result_data = response.get("result", response)
        
        # structured_instruction may be returned as string JSON
        sp_data = result_data.get("structured_instruction")
        if sp_data is None:
            sp_data = result_data.get("structured_prompt", {})
        if isinstance(sp_data, str):
            sp_data = json.loads(sp_data)

        result = GenerationResult(
            image_url=result_data["image_url"],
            structured_prompt=StructuredPrompt(**sp_data),
            seed=result_data.get("seed", params.seed or seed),
            generation_time_ms=generation_time,
            ip_warning=response.get("warning"),
            from_cache=False,
        )

        if result.ip_warning:
            logger.warning(f"IP warning during refinement: {result.ip_warning}")

        logger.info(f"Image edited in {generation_time:.0f}ms")
        return result

    async def refine_image(
        self,
        source_image: str,
        structured_prompt: StructuredPrompt,
        seed: int,
        modification_prompt: Optional[str] = None,
        mask: Optional[str] = None,
        parameters: Optional[EditParameters] = None,
    ) -> GenerationResult:
        """
        Backward-compatible alias for edit workflow.
        """
        return await self.edit_image(
            source_image=source_image,
            structured_prompt=structured_prompt,
            seed=seed,
            modification_prompt=modification_prompt,
            mask=mask,
            parameters=parameters,
        )

    async def save_generation(
        self,
        result: GenerationResult,
        prompt: str,
        parameters: GenerationParameters,
    ) -> str:
        """
        Save generation result to disk.
        
        Args:
            result: Generation result to save
            prompt: Original text prompt
            parameters: Generation parameters used
            
        Returns:
            Generation ID
        """
        generation_id = f"gen-{uuid.uuid4().hex[:12]}"
        generation_dir = settings.outputs_dir / generation_id
        generation_dir.mkdir(parents=True, exist_ok=True)

        # Download and save image
        image_response = await self._http_client.get(
            result.image_url,
            timeout=30.0,
        )
        image_response.raise_for_status()
        image_path = generation_dir / "generated.png"
        image_path.write_bytes(image_response.content)

        # Save structured prompt
        prompt_path = generation_dir / "structured_prompt.json"
        prompt_path.write_text(
            json.dumps(result.structured_prompt.model_dump(exclude_none=True), indent=2)
        )

        # Save metadata
        metadata = GenerationMetadata(
            id=generation_id,
            prompt=prompt,
            seed=result.seed,
            parameters=parameters,
            timestamp=datetime.utcnow().isoformat(),
            ip_warning=result.ip_warning,
        )
        metadata_path = generation_dir / "metadata.json"
        metadata_path.write_text(json.dumps(metadata.model_dump(), indent=2))

        logger.info(f"Saved generation {generation_id} to {generation_dir}")
        return generation_id

    def clear_cache(self) -> int:
        """Clear all cached results. Returns number of entries cleared."""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cleared {count} cache entries")
        return count

    def clean_stale_cache(self) -> int:
        """Remove stale cache entries. Returns number of entries removed."""
        now = time.time()
        stale_keys = [
            key for key, entry in self._cache.items()
            if now - entry.timestamp > self.CACHE_MAX_AGE
        ]
        for key in stale_keys:
            del self._cache[key]
        if stale_keys:
            logger.info(f"Removed {len(stale_keys)} stale cache entries")
        return len(stale_keys)

    async def close(self) -> None:
        """Close shared HTTP client."""
        await self._http_client.aclose()


# Singleton instance
_bria_service: Optional[BriaService] = None


def get_bria_service() -> BriaService:
    """Get or create the Bria service singleton."""
    global _bria_service
    if _bria_service is None:
        _bria_service = BriaService()
    return _bria_service


async def cleanup_bria_service() -> None:
    """Cleanup Bria service shared resources."""
    global _bria_service
    if _bria_service is not None:
        await _bria_service.close()
        _bria_service = None
