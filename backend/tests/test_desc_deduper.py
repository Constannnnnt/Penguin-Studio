import sys
from unittest.mock import MagicMock

# Mock dependencies before they are imported to handle environments
# where heavy ML libraries are missing.
mock_np = MagicMock()
sys.modules["torch"] = MagicMock()
sys.modules["torchvision"] = MagicMock()
sys.modules["transformers"] = MagicMock()
sys.modules["PIL"] = MagicMock()
sys.modules["cv2"] = MagicMock()
sys.modules["spacy"] = MagicMock()

# Minimal implementation of used numpy functions for algorithmic verification
def mock_dot(a, b):
    return sum(ai * bi for ai, bi in zip(a, b))

def mock_norm(a):
    return (sum(ai**2 for ai in a))**0.5

mock_np.dot = mock_dot
mock_np.linalg = MagicMock()
mock_np.linalg.norm = mock_norm
mock_np.array = lambda x: x  # Just return the list
mock_np.bool_ = bool         # Mock bool_ as native bool

sys.modules["numpy"] = mock_np

import pytest
import numpy as np
from app.detection.desc_deduper import DescriptorDeduper

def test_canonical_tokens():
    deduper = DescriptorDeduper()

    # Test lowercase
    assert deduper._canonical_tokens("CAR") == ["car"]

    # Test non-alphanumeric removal
    assert deduper._canonical_tokens("car!") == ["car"]
    assert deduper._canonical_tokens("car-truck") == ["car", "truck"]

    # Test whitespace handling
    assert deduper._canonical_tokens("  car   truck  ") == ["car", "truck"]

    # Test stopword filtering
    assert deduper._canonical_tokens("a car and a truck") == ["car", "truck"]

    # Test short token filtering (len > 1)
    assert deduper._canonical_tokens("a car b truck") == ["car", "truck"]

def test_jaccard_logic():
    deduper = DescriptorDeduper()

    # Identical sets
    assert deduper._jaccard(["car", "red"], ["car", "red"]) == 1.0

    # Partial overlap
    # intersection: {"car"}, union: {"car", "red", "blue"} -> 1/3
    assert pytest.approx(deduper._jaccard(["car", "red"], ["car", "blue"])) == 1/3

    # No overlap
    assert deduper._jaccard(["car"], ["truck"]) == 0.0

    # Empty input
    assert deduper._jaccard([], ["car"]) == 0.0
    assert deduper._jaccard(["car"], []) == 0.0
    assert deduper._jaccard([], []) == 0.0

def test_dedup_basic():
    deduper = DescriptorDeduper()

    # Empty input
    assert deduper.dedup([]) == []

    # Single phrase
    assert deduper.dedup(["a red car"]) == ["a red car"]

    # Exact duplicates
    assert deduper.dedup(["a red car", "a red car"]) == ["a red car"]

    # Multiple distinct
    assert deduper.dedup(["a red car", "a blue truck"]) == ["a red car", "a blue truck"]

def test_dedup_token_jaccard():
    # Default threshold is 0.6
    deduper = DescriptorDeduper(token_jaccard_thresh=0.6)

    # "red car" tokens: {"red", "car"}
    # "a red car" tokens: {"red", "car"}
    # Jaccard = 1.0 -> duplicate
    assert deduper.dedup(["red car", "a red car"]) == ["red car"]

    # "big red car" tokens: {"big", "red", "car"}
    # "red car" tokens: {"red", "car"}
    # Jaccard = 2/3 = 0.666 >= 0.6 -> duplicate
    assert deduper.dedup(["big red car", "red car"]) == ["big red car"]

    # "small red car" tokens: {"small", "red", "car"}
    # "big red car" tokens: {"big", "red", "car"}
    # Jaccard = 2/4 = 0.5 < 0.6 -> NOT duplicate
    assert deduper.dedup(["big red car", "small red car"]) == ["big red car", "small red car"]

def test_dedup_custom_threshold():
    # Set threshold to 0.4
    deduper = DescriptorDeduper(token_jaccard_thresh=0.4)

    # Jaccard 0.5 should now be a duplicate
    assert deduper.dedup(["big red car", "small red car"]) == ["big red car"]

def test_cosine_similarity():
    deduper = DescriptorDeduper()
    v1 = np.array([1, 0])
    v2 = np.array([1, 0])
    assert deduper._cosine(v1, v2) == 1.0

    v3 = np.array([0, 1])
    assert deduper._cosine(v1, v3) == 0.0

    v4 = np.array([-1, 0])
    assert deduper._cosine(v1, v4) == -1.0

def test_semantic_deduplication():
    mock_embedder = MagicMock()
    # Define vectors such that v1 and v2 are similar, v1 and v3 are not.
    v1 = np.array([1.0, 0.0])
    v2 = np.array([0.95, 0.05]) # Cosine similarity should be high
    v3 = np.array([0.0, 1.0])   # Cosine similarity should be 0

    # embedder.encode is called twice in the current implementation:
    # 1. Pre-compute for all phrases: encode(phrases)
    # 2. In loop for each candidate: encode([phrase])

    def mock_encode(input_data):
        if isinstance(input_data, list):
            if len(input_data) == 3: # Pre-compute call
                return np.array([v1, v2, v3])
            if input_data == ["phrase1"]: return np.array([v1])
            if input_data == ["phrase2"]: return np.array([v2])
            if input_data == ["phrase3"]: return np.array([v3])
        return np.array([v1])

    mock_embedder.encode.side_effect = mock_encode

    deduper = DescriptorDeduper(embedder=mock_embedder, semantic_thresh=0.9)

    phrases = ["phrase1", "phrase2", "phrase3"]
    # phrase1 kept
    # phrase2: token jaccard 0 (distinct), but semantic similarity high -> dropped
    # phrase3: token jaccard 0, semantic similarity 0 -> kept

    result = deduper.dedup(phrases)
    assert result == ["phrase1", "phrase3"]

def test_embedder_failure_fallback():
    mock_embedder = MagicMock()
    mock_embedder.encode.side_effect = Exception("Embedding failed")

    deduper = DescriptorDeduper(embedder=mock_embedder)

    # It should fall back to token-only deduplication
    phrases = ["red car", "a red car"]
    # Jaccard = 1.0 -> duplicate
    result = deduper.dedup(phrases)

    assert result == ["red car"]
    assert deduper.embedder is None # Should be set to None on failure
