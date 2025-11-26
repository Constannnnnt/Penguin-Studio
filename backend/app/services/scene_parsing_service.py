"""
Scene semantic parsing service for enhanced scene tab.

This service processes JSON metadata and performs semantic similarity matching
for camera angles, lens types, lighting conditions, and aesthetic values.
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from loguru import logger
from sentence_transformers import SentenceTransformer

from app.utils.exceptions import ProcessingException, ValidationException


class SceneParsingService:
    """
    Service for parsing scene metadata using semantic similarity matching.
    
    Handles parsing of:
    - Background settings
    - Camera angles and lens types
    - Depth of field and focus values
    - Lighting conditions, direction, and shadows
    - Aesthetic styles and medium types
    """
    
    # Predefined options for semantic matching
    CAMERA_ANGLE_OPTIONS = [
        "eye-level", "overhead", "low-angle", "high-angle"
    ]
    
    LENS_TYPE_OPTIONS = [
        "wide-angle", "standard", "portrait", "macro"
    ]
    
    LIGHTING_CONDITION_OPTIONS = [
        "natural", "studio", "soft diffused", "dramatic", "golden hour"
    ]
    
    STYLE_MEDIUM_OPTIONS = [
        "photograph", "painting", "digital art", "sketch", "3D render"
    ]
    
    AESTHETIC_STYLE_OPTIONS = [
        "realistic", "artistic", "vintage", "modern", "dramatic"
    ]
    
    # Shadow intensity mapping
    SHADOW_INTENSITY_KEYWORDS = {
        0: ["none", "no shadow", "shadowless"],
        1: ["subtle", "very light", "barely visible"],
        2: ["soft", "light", "gentle"],
        3: ["moderate", "medium", "normal"],
        4: ["strong", "pronounced", "heavy"],
        5: ["dramatic", "very strong", "intense", "harsh"]
    }
    
    # Depth of field and focus keywords for 0-100 mapping
    DEPTH_OF_FIELD_KEYWORDS = {
        0: ["very shallow", "extremely shallow", "minimal depth"],
        25: ["shallow", "limited depth", "narrow focus"],
        50: ["medium", "moderate depth", "balanced"],
        75: ["deep", "extended depth", "wide focus"],
        100: ["very deep", "infinite depth", "everything in focus"]
    }
    
    FOCUS_KEYWORDS = {
        0: ["soft focus", "very soft", "blurred", "out of focus"],
        25: ["slight soft", "slightly soft", "gentle blur"],
        50: ["sharp", "clear", "in focus"],
        75: ["very sharp", "crisp", "well-defined"],
        100: ["hyper sharp", "extremely sharp", "razor sharp"]
    }
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the scene parsing service.
        
        Args:
            model_name: Name of the sentence transformer model to use
        """
        try:
            self.model = SentenceTransformer(model_name)
            logger.info(f"Loaded sentence transformer model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model: {e}")
            raise ProcessingException(f"Failed to initialize semantic parsing model: {e}")
        
        # Pre-compute embeddings for all option sets
        self._precompute_embeddings()
    
    def _precompute_embeddings(self) -> None:
        """Pre-compute embeddings for all predefined options."""
        try:
            self.camera_angle_embeddings = self.model.encode(self.CAMERA_ANGLE_OPTIONS)
            self.lens_type_embeddings = self.model.encode(self.LENS_TYPE_OPTIONS)
            self.lighting_condition_embeddings = self.model.encode(self.LIGHTING_CONDITION_OPTIONS)
            self.style_medium_embeddings = self.model.encode(self.STYLE_MEDIUM_OPTIONS)
            self.aesthetic_style_embeddings = self.model.encode(self.AESTHETIC_STYLE_OPTIONS)
            
            # Pre-compute shadow intensity embeddings
            shadow_keywords = []
            self.shadow_intensity_mapping = {}
            for intensity, keywords in self.SHADOW_INTENSITY_KEYWORDS.items():
                for keyword in keywords:
                    shadow_keywords.append(keyword)
                    self.shadow_intensity_mapping[keyword] = intensity
            self.shadow_keywords_embeddings = self.model.encode(shadow_keywords)
            
            # Pre-compute depth of field embeddings
            depth_keywords = []
            self.depth_mapping = {}
            for value, keywords in self.DEPTH_OF_FIELD_KEYWORDS.items():
                for keyword in keywords:
                    depth_keywords.append(keyword)
                    self.depth_mapping[keyword] = value
            self.depth_keywords_embeddings = self.model.encode(depth_keywords)
            
            # Pre-compute focus embeddings
            focus_keywords = []
            self.focus_mapping = {}
            for value, keywords in self.FOCUS_KEYWORDS.items():
                for keyword in keywords:
                    focus_keywords.append(keyword)
                    self.focus_mapping[keyword] = value
            self.focus_keywords_embeddings = self.model.encode(focus_keywords)
            
            logger.info("Pre-computed embeddings for all option sets")
            
        except Exception as e:
            logger.error(f"Failed to pre-compute embeddings: {e}")
            raise ProcessingException(f"Failed to initialize embeddings: {e}")
    
    def parse_scene_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse scene metadata and return structured configuration.
        
        Args:
            metadata: JSON metadata dictionary
            
        Returns:
            Parsed scene configuration with confidence scores
        """
        try:
            logger.info("Starting scene metadata parsing")
            
            result = {
                "background_setting": self._parse_background_setting(metadata),
                "photographic_characteristics": self._parse_photographic_characteristics(metadata),
                "lighting": self._parse_lighting(metadata),
                "aesthetics": self._parse_aesthetics(metadata)
            }
            
            logger.info("Scene metadata parsing completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Scene metadata parsing failed: {e}")
            raise ProcessingException(f"Failed to parse scene metadata: {e}")
    
    def _parse_background_setting(self, metadata: Dict[str, Any]) -> str:
        """Parse background setting from metadata."""
        background = metadata.get("background_setting", "")
        if isinstance(background, str) and background.strip():
            return background.strip()
        return "neutral white background"  # Default fallback
    
    def _parse_photographic_characteristics(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Parse photographic characteristics from metadata."""
        photo_chars = metadata.get("photographic_characteristics", {})
        if not isinstance(photo_chars, dict):
            photo_chars = {}
        
        result = {}
        
        # Parse camera angle
        camera_angle = photo_chars.get("camera_angle", "")
        result["camera_angle"] = self._match_semantic_option(
            camera_angle, self.CAMERA_ANGLE_OPTIONS, self.camera_angle_embeddings
        )
        
        # Parse lens focal length
        lens_focal_length = photo_chars.get("lens_focal_length", "")
        result["lens_focal_length"] = self._match_semantic_option(
            lens_focal_length, self.LENS_TYPE_OPTIONS, self.lens_type_embeddings
        )
        
        # Parse depth of field
        depth_of_field = photo_chars.get("depth_of_field", "")
        result["depth_of_field"] = self._match_numeric_value(
            depth_of_field, self.depth_mapping, self.depth_keywords_embeddings, 
            list(self.depth_mapping.keys())
        )
        
        # Parse focus
        focus = photo_chars.get("focus", "")
        result["focus"] = self._match_numeric_value(
            focus, self.focus_mapping, self.focus_keywords_embeddings,
            list(self.focus_mapping.keys())
        )
        
        return result
    
    def _parse_lighting(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Parse lighting configuration from metadata."""
        lighting = metadata.get("lighting", {})
        if not isinstance(lighting, dict):
            lighting = {}
        
        result = {}
        
        # Parse lighting conditions
        conditions = lighting.get("conditions", "")
        result["conditions"] = self._match_semantic_option(
            conditions, self.LIGHTING_CONDITION_OPTIONS, self.lighting_condition_embeddings
        )
        
        # Parse lighting direction
        direction = lighting.get("direction", "")
        result["direction"] = self._parse_lighting_direction(direction)
        
        # Parse shadows
        shadows = lighting.get("shadows", "")
        result["shadows"] = self._match_shadow_intensity(shadows)
        
        return result
    
    def _parse_aesthetics(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Parse aesthetic configuration from metadata."""
        result = {}
        
        # Parse style medium
        style_medium = metadata.get("style_medium", "")
        result["style_medium"] = self._match_semantic_option(
            style_medium, self.STYLE_MEDIUM_OPTIONS, self.style_medium_embeddings
        )
        
        # Parse aesthetic style from aesthetics field
        aesthetics = metadata.get("aesthetics", {})
        if isinstance(aesthetics, dict):
            artistic_style = aesthetics.get("artistic_style", "")
        else:
            artistic_style = str(aesthetics) if aesthetics else ""
        
        result["aesthetic_style"] = self._match_semantic_option(
            artistic_style, self.AESTHETIC_STYLE_OPTIONS, self.aesthetic_style_embeddings
        )
        
        return result
    
    def _match_semantic_option(
        self, 
        text: str, 
        options: List[str], 
        embeddings: np.ndarray,
        confidence_threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Match text to predefined options using semantic similarity.
        
        Args:
            text: Input text to match
            options: List of predefined options
            embeddings: Pre-computed embeddings for options
            confidence_threshold: Minimum confidence for match
            
        Returns:
            Dictionary with value, confidence, and isCustom flag
        """
        if not text or not isinstance(text, str):
            return {
                "value": options[0] if options else "custom",
                "confidence": 0.0,
                "isCustom": True
            }
        
        text = text.strip().lower()
        
        # Check for exact matches first
        for option in options:
            if text == option.lower() or option.lower() in text:
                return {
                    "value": option,
                    "confidence": 1.0,
                    "isCustom": False
                }
        
        try:
            # Compute similarity using embeddings
            text_embedding = self.model.encode([text])
            similarities = np.dot(text_embedding, embeddings.T).flatten()
            
            best_idx = np.argmax(similarities)
            best_score = similarities[best_idx]
            
            if best_score >= confidence_threshold:
                return {
                    "value": options[best_idx],
                    "confidence": float(best_score),
                    "isCustom": False
                }
            else:
                return {
                    "value": text,
                    "confidence": float(best_score),
                    "isCustom": True
                }
                
        except Exception as e:
            logger.warning(f"Semantic matching failed for '{text}': {e}")
            return {
                "value": text,
                "confidence": 0.0,
                "isCustom": True
            }
    
    def _match_numeric_value(
        self,
        text: str,
        value_mapping: Dict[str, int],
        embeddings: np.ndarray,
        keywords: List[str],
        confidence_threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Match text to numeric values using keyword mapping.
        
        Args:
            text: Input text to match
            value_mapping: Mapping from keywords to numeric values
            embeddings: Pre-computed embeddings for keywords
            keywords: List of keywords
            confidence_threshold: Minimum confidence for match
            
        Returns:
            Dictionary with numeric value and confidence
        """
        if not text or not isinstance(text, str):
            return {"value": 50, "confidence": 0.0}  # Default middle value
        
        text = text.strip().lower()
        
        # Check for exact keyword matches
        for keyword, value in value_mapping.items():
            if keyword.lower() in text:
                return {"value": value, "confidence": 1.0}
        
        try:
            # Compute similarity using embeddings
            text_embedding = self.model.encode([text])
            similarities = np.dot(text_embedding, embeddings.T).flatten()
            
            best_idx = np.argmax(similarities)
            best_score = similarities[best_idx]
            
            if best_score >= confidence_threshold:
                best_keyword = keywords[best_idx]
                return {
                    "value": value_mapping[best_keyword],
                    "confidence": float(best_score)
                }
            else:
                return {"value": 50, "confidence": float(best_score)}  # Default middle
                
        except Exception as e:
            logger.warning(f"Numeric value matching failed for '{text}': {e}")
            return {"value": 50, "confidence": 0.0}
    
    def _match_shadow_intensity(self, text: str) -> Dict[str, Any]:
        """Match shadow description to intensity level (0-5)."""
        if not text or not isinstance(text, str):
            return {"value": 2, "confidence": 0.0}  # Default moderate
        
        text = text.strip().lower()
        
        # Check for exact keyword matches
        for keyword, intensity in self.shadow_intensity_mapping.items():
            if keyword.lower() in text:
                return {"value": intensity, "confidence": 1.0}
        
        try:
            # Compute similarity using embeddings
            text_embedding = self.model.encode([text])
            similarities = np.dot(text_embedding, self.shadow_keywords_embeddings.T).flatten()
            
            best_idx = np.argmax(similarities)
            best_score = similarities[best_idx]
            
            if best_score >= 0.3:
                best_keyword = list(self.shadow_intensity_mapping.keys())[best_idx]
                return {
                    "value": self.shadow_intensity_mapping[best_keyword],
                    "confidence": float(best_score)
                }
            else:
                return {"value": 2, "confidence": float(best_score)}  # Default moderate
                
        except Exception as e:
            logger.warning(f"Shadow intensity matching failed for '{text}': {e}")
            return {"value": 2, "confidence": 0.0}
    
    def _parse_lighting_direction(self, direction_text: str) -> Dict[str, Any]:
        """
        Parse lighting direction from text description.
        
        Args:
            direction_text: Text description of lighting direction
            
        Returns:
            Dictionary with x, y, rotation, tilt values and confidence
        """
        if not direction_text or not isinstance(direction_text, str):
            return {
                "value": {"x": 50, "y": 30, "rotation": 0, "tilt": -15},
                "confidence": 0.0
            }
        
        text = direction_text.strip().lower()
        
        # Default lighting direction (slightly above and front)
        result = {"x": 50, "y": 30, "rotation": 0, "tilt": -15}
        confidence = 0.5  # Default confidence
        
        try:
            # Parse directional keywords
            if any(word in text for word in ["above", "overhead", "top"]):
                result["y"] = 10
                result["tilt"] = -45
                confidence = 0.8
            elif any(word in text for word in ["below", "underneath", "bottom"]):
                result["y"] = 90
                result["tilt"] = 45
                confidence = 0.8
            elif any(word in text for word in ["front", "forward"]):
                result["y"] = 50
                result["tilt"] = 0
                confidence = 0.7
            
            if any(word in text for word in ["left", "west"]):
                result["x"] = 20
                confidence = max(confidence, 0.7)
            elif any(word in text for word in ["right", "east"]):
                result["x"] = 80
                confidence = max(confidence, 0.7)
            elif any(word in text for word in ["center", "middle"]):
                result["x"] = 50
                confidence = max(confidence, 0.6)
            
            # Parse angle information
            if any(word in text for word in ["side", "lateral"]):
                result["rotation"] = 90 if "right" in text else 270
                confidence = max(confidence, 0.7)
            
            return {"value": result, "confidence": confidence}
            
        except Exception as e:
            logger.warning(f"Lighting direction parsing failed for '{text}': {e}")
            return {
                "value": {"x": 50, "y": 30, "rotation": 0, "tilt": -15},
                "confidence": 0.0
            }


# Global service instance
_scene_parsing_service: Optional[SceneParsingService] = None


def get_scene_parsing_service() -> SceneParsingService:
    """Get or create the global scene parsing service instance."""
    global _scene_parsing_service
    if _scene_parsing_service is None:
        _scene_parsing_service = SceneParsingService()
    return _scene_parsing_service