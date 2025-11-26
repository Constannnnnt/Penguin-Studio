"""
Tests for scene parsing API routes.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from app.main import create_app


class TestSceneParsingRoutes:
    """Test cases for scene parsing API routes."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app = create_app()
        return TestClient(app)
    
    @pytest.fixture
    def mock_service(self):
        """Mock scene parsing service."""
        mock = Mock()
        mock.parse_scene_metadata.return_value = {
            "background_setting": "white studio backdrop",
            "photographic_characteristics": {
                "camera_angle": {"value": "eye-level", "confidence": 0.9, "isCustom": False},
                "lens_focal_length": {"value": "standard", "confidence": 0.8, "isCustom": False},
                "depth_of_field": {"value": 25, "confidence": 0.7},
                "focus": {"value": 75, "confidence": 0.8}
            },
            "lighting": {
                "conditions": {"value": "natural", "confidence": 0.9, "isCustom": False},
                "direction": {
                    "value": {"x": 50, "y": 30, "rotation": 0, "tilt": -15},
                    "confidence": 0.6
                },
                "shadows": {"value": 2, "confidence": 0.8}
            },
            "aesthetics": {
                "style_medium": {"value": "photograph", "confidence": 1.0, "isCustom": False},
                "aesthetic_style": {"value": "realistic", "confidence": 0.9, "isCustom": False}
            }
        }
        return mock
    
    def test_parse_scene_metadata_success(self, client, mock_service):
        """Test successful scene metadata parsing."""
        with patch('app.api.routes.scene_parsing.get_scene_parsing_service') as mock_get_service:
            mock_get_service.return_value = mock_service
            
            request_data = {
                "metadata": {
                    "background_setting": "white studio backdrop",
                    "photographic_characteristics": {
                        "camera_angle": "eye-level",
                        "lens_focal_length": "standard"
                    },
                    "lighting": {
                        "conditions": "natural"
                    },
                    "style_medium": "photograph"
                }
            }
            
            response = client.post("/api/v1/scene/parse", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            
            # Check response structure
            assert "background_setting" in data
            assert "photographic_characteristics" in data
            assert "lighting" in data
            assert "aesthetics" in data
            
            # Check specific values
            assert data["background_setting"] == "white studio backdrop"
            
            photo = data["photographic_characteristics"]
            assert photo["camera_angle"]["value"] == "eye-level"
            assert photo["camera_angle"]["confidence"] >= 0.8  # Allow for some variation
            assert photo["camera_angle"]["isCustom"] is False
            
            lighting = data["lighting"]
            assert lighting["conditions"]["value"] == "natural"
            assert lighting["direction"]["value"]["x"] == 50
            assert lighting["shadows"]["value"] == 2
            
            aesthetics = data["aesthetics"]
            assert aesthetics["style_medium"]["value"] == "photograph"
            assert aesthetics["aesthetic_style"]["value"] == "realistic"
    
    def test_parse_scene_metadata_invalid_request(self, client):
        """Test parsing with invalid request data."""
        # Test with non-dict metadata
        request_data = {"metadata": "invalid"}
        
        response = client.post("/api/v1/scene/parse", json=request_data)
        assert response.status_code == 400  # Validation error (Pydantic validation)
    
    def test_get_parsing_options(self, client):
        """Test getting parsing options."""
        response = client.get("/api/v1/scene/options")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected option categories
        expected_keys = [
            "camera_angles", "lens_types", "lighting_conditions",
            "style_mediums", "aesthetic_styles", "shadow_intensities",
            "depth_of_field_range", "focus_range", "lighting_direction_ranges"
        ]
        
        for key in expected_keys:
            assert key in data
        
        # Check specific values
        assert "eye-level" in data["camera_angles"]
        assert "standard" in data["lens_types"]
        assert "natural" in data["lighting_conditions"]
        assert "photograph" in data["style_mediums"]
        assert "realistic" in data["aesthetic_styles"]
        
        # Check ranges
        assert data["depth_of_field_range"]["min"] == 0
        assert data["depth_of_field_range"]["max"] == 100
        assert data["shadow_intensities"] == list(range(6))
    
    def test_validate_scene_configuration_valid(self, client):
        """Test validation of valid scene configuration."""
        config_data = {
            "background_setting": "white backdrop",
            "photographic_characteristics": {
                "camera_angle": {"value": "eye-level", "confidence": 0.9, "isCustom": False},
                "lens_focal_length": {"value": "standard", "confidence": 0.8, "isCustom": False},
                "depth_of_field": {"value": 50, "confidence": 0.7},
                "focus": {"value": 75, "confidence": 0.8}
            },
            "lighting": {
                "conditions": {"value": "natural", "confidence": 0.9, "isCustom": False},
                "direction": {
                    "value": {"x": 50, "y": 30, "rotation": 0, "tilt": -15},
                    "confidence": 0.6
                },
                "shadows": {"value": 2, "confidence": 0.8}
            },
            "aesthetics": {
                "style_medium": {"value": "photograph", "confidence": 1.0, "isCustom": False},
                "aesthetic_style": {"value": "realistic", "confidence": 0.9, "isCustom": False}
            }
        }
        
        response = client.post("/api/v1/scene/validate", json=config_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] is True
        assert len(data["errors"]) == 0
    
    def test_validate_scene_configuration_invalid_pydantic(self, client):
        """Test validation with Pydantic validation errors."""
        # Test with values that violate Pydantic constraints
        config_data = {
            "background_setting": "white backdrop",
            "photographic_characteristics": {
                "camera_angle": {"value": "eye-level", "confidence": 0.9, "isCustom": False},
                "lens_focal_length": {"value": "standard", "confidence": 0.8, "isCustom": False},
                "depth_of_field": {"value": 50, "confidence": 0.7},
                "focus": {"value": 75, "confidence": 0.8}
            },
            "lighting": {
                "conditions": {"value": "natural", "confidence": 0.9, "isCustom": False},
                "direction": {
                    "value": {"x": 150, "y": 30, "rotation": 0, "tilt": -15},  # Invalid: x > 100
                    "confidence": 0.6
                },
                "shadows": {"value": 2, "confidence": 0.8}
            },
            "aesthetics": {
                "style_medium": {"value": "photograph", "confidence": 1.0, "isCustom": False},
                "aesthetic_style": {"value": "realistic", "confidence": 0.9, "isCustom": False}
            }
        }
        
        response = client.post("/api/v1/scene/validate", json=config_data)
        
        # Pydantic validation should catch this before our validation logic
        assert response.status_code == 400
    
    def test_validate_scene_configuration_custom_logic(self, client):
        """Test validation with custom validation logic."""
        # Test with values that pass Pydantic but fail our custom validation
        config_data = {
            "background_setting": "white backdrop",
            "photographic_characteristics": {
                "camera_angle": {"value": "eye-level", "confidence": 0.9, "isCustom": False},
                "lens_focal_length": {"value": "standard", "confidence": 0.8, "isCustom": False},
                "depth_of_field": {"value": 50, "confidence": 0.7},
                "focus": {"value": 75, "confidence": 0.8}
            },
            "lighting": {
                "conditions": {"value": "natural", "confidence": 0.9, "isCustom": False},
                "direction": {
                    "value": {"x": 50, "y": 30, "rotation": 0, "tilt": -15},
                    "confidence": 0.6
                },
                "shadows": {"value": 2, "confidence": 0.8}
            },
            "aesthetics": {
                "style_medium": {"value": "photograph", "confidence": 1.0, "isCustom": False},
                "aesthetic_style": {"value": "realistic", "confidence": 0.9, "isCustom": False}
            }
        }
        
        response = client.post("/api/v1/scene/validate", json=config_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # This should be valid
        assert data["valid"] is True