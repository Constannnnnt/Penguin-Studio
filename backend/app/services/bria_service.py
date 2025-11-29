"""
Bria API Service for image generation using FIBO model.

This service handles all interactions with Bria's image generation API,
including generation, refinement, caching, and rate limiting.
"""

import asyncio
import hashlib
import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from loguru import logger
from pydantic import BaseModel, Field

from app.config import settings


class StructuredPromptObject(BaseModel):
    """Object description in structured prompt."""
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
    conditions: str = ""
    direction: str = ""
    shadows: str = ""


class StructuredPromptAesthetics(BaseModel):
    """Aesthetics description in structured prompt."""
    composition: str = ""
    color_scheme: str = ""
    mood_atmosphere: str = ""
    preference_score: str = ""
    aesthetic_score: str = ""


class StructuredPromptPhotographic(BaseModel):
    """Photographic characteristics in structured prompt."""
    depth_of_field: str = ""
    focus: str = ""
    camera_angle: str = ""
    lens_focal_length: str = ""


class StructuredPromptTextRender(BaseModel):
    """Text render element in structured prompt."""
    text: str = ""
    location: str = ""
    size: str = ""
    color: str = ""
    font: str = ""
    appearance_details: str = ""


class StructuredPrompt(BaseModel):
    """Full structured prompt for Bria FIBO model."""
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


class GenerationParameters(BaseModel):
    """Parameters for image generation."""
    aspect_ratio: str = "16:9"
    resolution: int = 1024
    seed: Optional[int] = None
    num_inference_steps: int = 50


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
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class BriaService:
    """Service for interacting with Bria's image generation API."""

    BRIA_API_BASE_URL = "https://engine.prod.bria-api.com"
    IMAGE_GENERATE_ENDPOINT = "/v2/image/generate"
    STRUCTURED_PROMPT_ENDPOINT = "/v2/structured_prompt/generate"
    DEFAULT_TIMEOUT = 120.0
    RETRY_ATTEMPTS = 3
    RETRY_DELAY = 1.0
    RETRY_BACKOFF = 2.0
    CACHE_MAX_AGE = 24 * 60 * 60  # 24 hours
    MIN_REQUEST_INTERVAL = 1.0  # 1 second between requests

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.bria_api_key
        if not self.api_key:
            logger.warning("Bria API key not configured")
        
        self._cache: Dict[str, CacheEntry] = {}
        self._queue: List[asyncio.Future] = []
        self._processing = False
        self._last_request_time = 0.0
        self._lock = asyncio.Lock()

    def _get_cache_key(self, prompt: str, parameters: GenerationParameters) -> str:
        """Generate cache key from prompt and parameters."""
        key_data = f"{prompt}:{parameters.model_dump_json()}"
        return hashlib.sha256(key_data.encode()).hexdigest()

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
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(status_url, headers=headers)
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
                async with httpx.AsyncClient(timeout=timeout) as client:
                    logger.debug(f"Bria API request attempt {attempt}: {url}")
                    response = await client.post(url, json=payload, headers=headers)
                    
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
                        )
                    
                    response.raise_for_status()
                    return response.json()

            except (AuthenticationError, ValidationError):
                raise
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
            parameters: Generation parameters (aspect ratio, resolution, etc.)
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
        payload["resolution"] = params.resolution
        if params.seed is not None:
            payload["seed"] = params.seed
        payload["num_inference_steps"] = params.num_inference_steps

        logger.info(f"Generating image with prompt: {prompt[:50] if prompt else 'structured'}...")
        start_time = time.time()

        response = await self._make_request(payload)
        
        # Handle async response - poll for result if status_url is returned
        if "status_url" in response:
            response = await self._poll_for_result(response["status_url"])
        
        generation_time = (time.time() - start_time) * 1000

        # Parse response - result may be nested under "result" key
        result_data = response.get("result", response)
        
        # structured_prompt may be a JSON string, parse it
        sp_data = result_data.get("structured_prompt", {})
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
        
        # structured_prompt may be a JSON string, parse it
        sp_data = result_data.get("structured_prompt", {})
        if isinstance(sp_data, str):
            sp_data = json.loads(sp_data)

        return StructuredPrompt(**sp_data)

    async def refine_image(
        self,
        structured_prompt: StructuredPrompt,
        seed: int,
        modification_prompt: Optional[str] = None,
        parameters: Optional[GenerationParameters] = None,
    ) -> GenerationResult:
        """
        Refine an image using updated structured prompt and original seed.
        
        Args:
            structured_prompt: Updated structured prompt (will be serialized to JSON string)
            seed: Original seed for consistency
            modification_prompt: Optional prompt describing the modification (e.g., "add sunlight")
            parameters: Optional generation parameters
            
        Returns:
            GenerationResult with refined image
        """
        params = parameters or GenerationParameters()
        params.seed = seed

        # Bria API expects structured_prompt as a JSON string for refinement
        structured_prompt_json = json.dumps(
            structured_prompt.model_dump(exclude_none=True)
        )

        payload: Dict[str, Any] = {
            "structured_prompt": structured_prompt_json,
            "seed": seed,
            "aspect_ratio": params.aspect_ratio,
            "resolution": params.resolution,
        }

        # Add modification prompt if provided (e.g., "add sunlight")
        if modification_prompt:
            payload["prompt"] = modification_prompt

        logger.info(f"Refining image with seed={seed}, modification={modification_prompt or 'none'}")
        start_time = time.time()

        response = await self._make_request(payload)
        
        # Handle async response - poll for result if status_url is returned
        if "status_url" in response:
            response = await self._poll_for_result(response["status_url"])
        
        generation_time = (time.time() - start_time) * 1000

        # Parse response - result may be nested under "result" key
        result_data = response.get("result", response)
        
        # structured_prompt may be a JSON string, parse it
        sp_data = result_data.get("structured_prompt", {})
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

        if result.ip_warning:
            logger.warning(f"IP warning during refinement: {result.ip_warning}")

        logger.info(f"Image refined in {generation_time:.0f}ms")
        return result

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
        async with httpx.AsyncClient() as client:
            image_response = await client.get(result.image_url)
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


# Singleton instance
_bria_service: Optional[BriaService] = None


def get_bria_service() -> BriaService:
    """Get or create the Bria service singleton."""
    global _bria_service
    if _bria_service is None:
        _bria_service = BriaService()
    return _bria_service
