
from app.detection.desc_deduper import DescriptorDeduper

def test_dedup_simple_duplicates():
    deduper = DescriptorDeduper(token_jaccard_thresh=0.5)
    phrases = [
        "red shiny ball",
        "shiny red ball",  # Should be deduped (high overlap)
        "blue square box",
        "red shiny ball",  # Exact duplicate
    ]
    result = deduper.dedup(phrases)
    assert len(result) == 2
    assert "red shiny ball" in result
    assert "blue square box" in result

def test_dedup_no_duplicates():
    deduper = DescriptorDeduper()
    phrases = ["cat", "dog", "bird"]
    result = deduper.dedup(phrases)
    assert len(result) == 3

def test_dedup_empty():
    deduper = DescriptorDeduper()
    assert deduper.dedup([]) == []

def test_dedup_case_insensitive():
    deduper = DescriptorDeduper(token_jaccard_thresh=0.9)
    phrases = ["Red Ball", "red ball"]
    result = deduper.dedup(phrases)
    assert len(result) == 1

def test_dedup_stopwords():
    deduper = DescriptorDeduper()
    # "a big cat" -> {"big", "cat"}
    # "the big cat" -> {"big", "cat"}
    phrases = ["a big cat", "the big cat"]
    result = deduper.dedup(phrases)
    assert len(result) == 1
