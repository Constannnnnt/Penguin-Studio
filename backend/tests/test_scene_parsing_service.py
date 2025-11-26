"""
Tests for scene parsing service.
"""

import pytest
from unittest.mock import Mock, patch

from app.services.scene_parsing_service import SceneParsingService


class TestSceneParsingService:
    """Test cases for SceneParsingService."""
    
    @pytest.fixture
    def mock_model(self):
        """Mock sentence transformer model."""
        mock = Mock()
        mock.encode.return_value = [[0.1, 0.2, 0.3]]  # Mock embedding
        return mock
    
    @pytest.fixture
    def service(self, mock_model):
        """Create service with mocked model."""
        with patch('app.services.scene_parsing_service.SentenceTransformer') as mock_st:
            mock_st.return_value = mock_model
            service = SceneParsingService()
            return service
    
    def test_parse_background_setting(self, service):
        """Test background setting parsing."""
        metadata = {"background_setting": "clean white studio backdrop"}
        result = service._parse_background_setting(metadata)
        assert result == "clean white studio backdrop"
        
        # Test missing background
        metadata = {}
        result = service._parse_background_setting(metadata)
        assert result == "neutral white background"
    
    def test_parse_photographic_characteristics(self, service):
        """Test photographic characteristics parsing."""
        metadata = {
            "photographic_characteristics": {
                "camera_angle": "eye-level",
                "lens_focal_length": "standard",
                "depth_of_field": "shallow",
                "focus": "sharp"
            }
        }
        
        result = service._parse_photographic_characteristics(metadata)
        
        assert "camera_angle" in result
        assert "lens_focal_length" in result
        assert "depth_of_field" in result
        assert "focus" in result
        
        # Each should have value and confidence
        assert "value" in result["camera_angle"]
        assert "confidence" in result["camera_angle"]
    
    def test_parse_lighting(self, service):
        """Test lighting configuration parsing."""
        metadata = {
            "lighting": {
                "conditions": "natural",
                "direction": "soft light from above",
                "shadows": "soft shadows"
            }
        }
        
        result = service._parse_lighting(metadata)
        
        assert "conditions" in result
        assert "direction" in result
        assert "shadows" in result
        
        # Check structure
        assert "value" in result["conditions"]
        assert "confidence" in result["conditions"]
        assert "value" in result["direction"]
        assert "confidence" in result["direction"]
    
    def test_parse_aesthetics(self, service):
        """Test aesthetics parsing."""
        metadata = {
            "style_medium": "photograph",
            "aesthetics": {
                "artistic_style": "realistic"
            }
        }
        
        result = service._parse_aesthetics(metadata)
        
        assert "style_medium" in result
        assert "aesthetic_style" in result
        
        # Check structure
        assert "value" in result["style_medium"]
        assert "confidence" in result["style_medium"]
    
    def test_parse_lighting_direction(self, service):
        """Test lighting direction parsing."""
        # Test various direction descriptions
        test_cases = [
            ("light from above", {"y": 10, "tilt": -45}),
            ("light from the left", {"x": 20}),
            ("light from the right", {"x": 80}),
            ("front lighting", {"y": 50, "tilt": 0}),
        ]
        
        for direction_text, expected_partial in test_cases:
            result = service._parse_lighting_direction(direction_text)
            
            assert "value" in result
            assert "confidence" in result
            
            value = result["value"]
            for key, expected_value in expected_partial.items():
                assert value[key] == expected_value
    
    def test_match_shadow_intensity(self, service):
        """Test shadow intensity matching."""
        test_cases = [
            ("no shadows", 0),
            ("subtle shadows", 1),
            ("soft shadows", 2),
            ("moderate shadows", 3),
            ("strong shadows", 4),
            ("dramatic shadows", 5),
        ]
        
        for shadow_text, expected_intensity in test_cases:
            result = service._match_shadow_intensity(shadow_text)
            
            assert "value" in result
            assert "confidence" in result
            assert result["value"] == expected_intensity
            assert result["confidence"] == 1.0  # Exact match
    
    def test_parse_scene_metadata_complete(self, service):
        """Test complete scene metadata parsing."""
        metadata = {
            "background_setting": "white studio backdrop",
            "photographic_characteristics": {
                "camera_angle": "eye-level",
                "lens_focal_length": "standard",
                "depth_of_field": "shallow",
                "focus": "sharp"
            },
            "lighting": {
                "conditions": "natural",
                "direction": "soft light from above",
                "shadows": "soft shadows"
            },
            "style_medium": "photograph",
            "aesthetics": {
                "artistic_style": "realistic"
            }
        }
        
        result = service.parse_scene_metadata(metadata)
        
        # Check all main sections exist
        assert "background_setting" in result
        assert "photographic_characteristics" in result
        assert "lighting" in result
        assert "aesthetics" in result
        
        # Check background
        assert result["background_setting"] == "white studio backdrop"
        
        # Check photographic characteristics structure
        photo = result["photographic_characteristics"]
        assert all(key in photo for key in ["camera_angle", "lens_focal_length", "depth_of_field", "focus"])
        
        # Check lighting structure
        lighting = result["lighting"]
        assert all(key in lighting for key in ["conditions", "direction", "shadows"])
        
        # Check aesthetics structure
        aesthetics = result["aesthetics"]
        assert all(key in aesthetics for key in ["style_medium", "aesthetic_style"])
    
    def test_empty_metadata_handling(self, service):
        """Test handling of empty or missing metadata."""
        result = service.parse_scene_metadata({})
        
        # Should return default values without errors
        assert "background_setting" in result
        assert "photographic_characteristics" in result
        assert "lighting" in result
        assert "aesthetics" in result
        
        # Background should have default
        assert result["background_setting"] == "neutral white background"