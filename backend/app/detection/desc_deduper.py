import re
from typing import List, Optional, Any
from dataclasses import dataclass, field
import numpy as np


@dataclass
class DescriptorDeduper:
    """
    Deduplicate descriptor phrases by approximate token overlap,
    with an optional hook for semantic (embedding-based) similarity.

    Core idea:
      - Normalize each phrase to a bag-of-words token set.
      - If Jaccard similarity with an already-kept phrase >= token_jaccard_thresh,
        treat it as a near-duplicate and drop it (or keep the "better" one).
    """

    # Threshold for token-set overlap [0,1].
    token_jaccard_thresh: float = 0.6

    # Optional embedding model with `encode(List[str]) -> np.ndarray`.
    embedder: Any = None
    semantic_thresh: float = 0.9  # cosine similarity threshold if embedder is used

    # Simple stopword list used for canonicalization
    stopwords: set = field(default_factory=lambda: {
        "a", "an", "the", "of", "with", "and", "or", "to",
        "in", "on", "at", "for", "from", "by", "into", "this",
        "that", "is", "are", "was", "were", "it", "its",
        "as", "up", "down", "over", "under", "around",
    })

    def _canonical_tokens(self, phrase: str) -> List[str]:
        """
        Normalize phrase into a list of content tokens:
        - lower case
        - remove non-alphanumeirc chars
        - split on whitespace
        - drop short/stopword tokens
        """

        s = phrase.lower()
        # Replace non-alphanumeric chars with spaces
        s = re.sub(r"[^a-z0-9\s]", " ", s)
        # Collapse multiple spaces
        s = re.sub(r"\s+", " ", s).strip()
        tokens = s.split()
        tokens = [t for t in tokens if len(t) > 1 and t not in self.stopwords]

        return tokens

    def _jaccard(self, a: List[str], b: List[str]) -> float:
        if not a or not b:
            return 0.0
        set_a, set_b = set(a), set(b)
        inter = len(set_a & set_b)
        union = len(set_a | set_b)
        if union == 0:
            return 0.0
        return inter / union

    def _cosine(self, v1, v2) -> float:
        """
        Cosine similarity between two 1-D numpy arrays.
        Only used if embedder is provided.
        """

        denom = (np.linalg.norm(v1) * np.linalg.norm(v2))
        if denom == 0:
            return 0.0
        return float(np.dot(v1, v2) / denom)

    def dedup(self, phrases: List[str]) -> List[str]:
        """
        Deduplicate a list of descriptor phrases.

        Strategy:
          - Iterate in order.
          - For each candidate, compare to previously kept phrases:
              * if token Jaccard >= threshold → candidate is near-duplicate → drop it
              * if embedder is set: also compare cosine similarity of embeddings
        """
        if not phrases:
            return []

        kept_phrases: List[str] = []
        kept_token_sets: List[set] = []
        kept_embeds: Optional[List[Any]] = None
        embeds = None

        # Pre-compute embeddings if embedder is provided
        if self.embedder is not None:
            try:
                embeds = self.embedder.encode(phrases)  # shape (N, D)
                kept_embeds = []
            except Exception:
                # If embedding fails, fall back to token-only dedup
                self.embedder = None
                embeds = None

        for idx, phrase in enumerate(phrases):
            cand_tokens_list = self._canonical_tokens(phrase)
            cand_tokens_set = set(cand_tokens_list)

            is_duplicate = False

            # Token-level comparison
            for prev_tokens_set in kept_token_sets:
                if not cand_tokens_set or not prev_tokens_set:
                    j = 0.0
                else:
                    inter = len(cand_tokens_set & prev_tokens_set)
                    union = len(cand_tokens_set | prev_tokens_set)
                    if union == 0:
                        j = 0.0
                    else:
                        j = inter / union

                if j >= self.token_jaccard_thresh:
                    is_duplicate = True
                    break

            # Optional: semantic (embedding-based) comparison
            if not is_duplicate and self.embedder is not None and kept_embeds is not None:
                if embeds is not None:
                    cand_vec = embeds[idx]
                else:
                    cand_vec = self.embedder.encode([phrase])[0]  # Fallback if batch failed

                for prev_vec in kept_embeds:
                    sim = self._cosine(cand_vec, prev_vec)
                    if sim >= self.semantic_thresh:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    kept_embeds.append(cand_vec)

            if not is_duplicate:
                kept_phrases.append(phrase)
                kept_token_sets.append(cand_tokens_set)
                # kept_embeds is already updated above when embedder is used

        return kept_phrases
