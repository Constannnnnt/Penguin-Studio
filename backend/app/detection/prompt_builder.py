import re
from dataclasses import dataclass, field
from typing import List, Optional, Sequence

from app.detection.types import PromptSpec, PromptTier


@dataclass
class PromptBuilder:
    """
    Builds prompt strings for SAM3 detection from PromptSpec.
    
    Design decisions:
    - Cap visual descriptors to prevent overly long prompts (SAM3 works best with 5-15 words)
    - Prioritize distinctive visual features over generic ones
    - CORE_VISUAL_SPATIAL tier is deprecated (spatial info doesn't help visual segmentation)
    - Emit multiple prompt variants per tier to improve recall on hard objects
    """

    clause_joiner: str = ", "
    max_visual_descriptors: int = 4  # Cap to prevent verbose prompts
    max_prompt_words: int = 20  # Soft limit for total prompt length
    max_variants_per_tier: int = 5
    stopwords: set[str] = field(
        default_factory=lambda: {
            "a",
            "an",
            "the",
            "this",
            "that",
            "these",
            "those",
            "of",
            "to",
            "in",
            "on",
            "at",
            "for",
            "from",
            "by",
            "with",
            "within",
            "inside",
            "outside",
            "across",
            "around",
            "through",
            "throughout",
            "and",
            "or",
            "is",
            "are",
            "was",
            "were",
            "be",
            "being",
            "been",
            "it",
            "its",
            "their",
            "his",
            "her",
            "as",
            "very",
            "slightly",
            "mostly",
            "primarily",
            "composed",
            "positioned",
            "located",
            "appears",
            "appearing",
            "showing",
        }
    )
    subject_split_words: set[str] = field(
        default_factory=lambda: {
            "with",
            "on",
            "in",
            "at",
            "by",
            "near",
            "under",
            "above",
            "behind",
            "between",
            "through",
            "while",
            "where",
            "who",
            "that",
            "which",
            "holding",
            "wearing",
            "carrying",
            "featuring",
            "falling",
            "floating",
            "standing",
            "sitting",
            "resting",
            "set",
            "placed",
        }
    )
    label_modifier_tokens: set[str] = field(
        default_factory=lambda: {
            "late",
            "early",
            "young",
            "old",
            "new",
            "small",
            "large",
            "big",
            "tiny",
            "huge",
            "vibrant",
            "delicate",
            "majestic",
            "luxurious",
            "prominent",
            "quiet",
            "snowy",
            "crisp",
            "soft",
            "hard",
            "smooth",
            "rough",
            "bright",
            "dark",
            "deep",
            "muted",
            "translucent",
            "reflective",
            "metallic",
            "wooden",
            "golden",
            "silver",
            "red",
            "blue",
            "green",
            "yellow",
            "white",
            "black",
            "brown",
            "gray",
            "grey",
            "center",
            "foreground",
            "background",
            "frame",
        }
    )
    plural_fallback_nouns: set[str] = field(
        default_factory=lambda: {
            "snowflake",
            "raindrop",
            "droplet",
            "petal",
            "leaf",
            "bubble",
            "spark",
        }
    )
    generic_visual_descriptors: set[str] = field(
        default_factory=lambda: {
            "small",
            "large",
            "medium",
            "tiny",
            "big",
            "huge",
            "small within frame",
            "medium within frame",
            "large within frame",
            "small within the ring",
            "medium within the ring",
            "large within the ring",
            "small within scene",
            "medium within scene",
            "large within scene",
        }
    )

    def _join_clause_list(self, lst: Sequence[str], max_items: Optional[int] = None) -> Optional[str]:
        cleaned = [s.strip() for s in lst if s and s.strip()]
        if not cleaned:
            return None
        if max_items is not None:
            cleaned = cleaned[:max_items]
        return self.clause_joiner.join(cleaned)

    def _truncate_to_word_limit(self, text: str, max_words: int) -> str:
        """Truncate text to approximately max_words, ending at a clean boundary."""
        words = text.split()
        if len(words) <= max_words:
            return text
        # Find a clean cut point (at comma or period)
        truncated = " ".join(words[:max_words])
        # Try to end at a comma or period
        for sep in [", ", ". "]:
            last_sep = truncated.rfind(sep)
            if last_sep > len(truncated) // 2:
                return truncated[:last_sep]
        return truncated

    @staticmethod
    def _normalize_spaces(text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def _extract_subject_phrase(self, text: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9\s\-']", " ", text or "")
        cleaned = self._normalize_spaces(cleaned)
        if not cleaned:
            return "object"

        cleaned = re.sub(
            r"^(a|an|the|this|that|these|those|some|several|many)\s+",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        words = cleaned.split()
        if not words:
            return "object"

        cut_idx = len(words)
        for idx, word in enumerate(words):
            if idx < 2:
                continue
            if word.lower() in self.subject_split_words:
                cut_idx = idx
                break

        subject = " ".join(words[:cut_idx]).strip()
        return subject or "object"

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return re.findall(r"[a-z0-9]+(?:[-'][a-z0-9]+)?", (text or "").lower())

    def _content_tokens(self, text: str) -> List[str]:
        return [t for t in self._tokenize(text) if t not in self.stopwords]

    @staticmethod
    def _singularize(token: str) -> str:
        irregular = {
            "men": "man",
            "women": "woman",
            "people": "person",
            "children": "child",
            "mice": "mouse",
            "geese": "goose",
            "teeth": "tooth",
            "feet": "foot",
        }
        if token in irregular:
            return irregular[token]
        if token.endswith("ies") and len(token) > 4:
            return token[:-3] + "y"
        if token.endswith("ses") and len(token) > 4:
            return token[:-2]
        if token.endswith("s") and len(token) > 3:
            return token[:-1]
        return token

    @staticmethod
    def _pluralize(token: str) -> str:
        irregular = {
            "man": "men",
            "woman": "women",
            "person": "people",
            "child": "children",
            "mouse": "mice",
            "goose": "geese",
            "tooth": "teeth",
            "foot": "feet",
        }
        if token in irregular:
            return irregular[token]
        if token.endswith("y") and len(token) > 2 and token[-2] not in "aeiou":
            return token[:-1] + "ies"
        if token.endswith("s"):
            return token
        return token + "s"

    @staticmethod
    def _looks_like_modifier(token: str) -> bool:
        return token.endswith("ly")

    @staticmethod
    def _is_numeric_like(token: str) -> bool:
        return any(ch.isdigit() for ch in token)

    def _extract_head_token(self, text: str) -> Optional[str]:
        tokens = self._content_tokens(text)
        if not tokens:
            return None

        for token in reversed(tokens):
            if self._is_numeric_like(token):
                continue
            if token in self.label_modifier_tokens:
                continue
            if not self._looks_like_modifier(token):
                return token

        # Fallback: keep last non-numeric token, even if adjective-like.
        for token in reversed(tokens):
            if not self._is_numeric_like(token):
                return token

        return tokens[-1]

    def _noun_variants(self, text: str) -> List[str]:
        head = self._extract_head_token(text)
        if not head:
            return []

        variants = [head]
        singular = self._singularize(head)
        if singular not in variants:
            variants.append(singular)

        # Only synthesize plural fallback for a small set of particle-like nouns.
        if singular == head and head in self.plural_fallback_nouns:
            plural = self._pluralize(head)
            if plural not in variants:
                variants.append(plural)

        return variants

    def extract_label(self, text: str) -> str:
        """
        Derive a short, human-readable object label from free text.
        Prefers head noun when available, otherwise uses subject phrase.
        """
        subject = self._extract_subject_phrase(text)
        head = self._extract_head_token(subject)
        if head:
            return head
        subject = subject.strip()
        if not subject:
            return "object"
        return " ".join(subject.split()[:4])

    def _dedup_texts(self, texts: Sequence[str]) -> List[str]:
        deduped: List[str] = []
        seen: set[str] = set()
        for text in texts:
            norm = self._normalize_spaces(text).lower()
            if not norm:
                continue
            if norm in seen:
                continue
            seen.add(norm)
            deduped.append(self._normalize_spaces(text))
        return deduped

    def _select_key_visual_descriptor(self, visuals: Sequence[str]) -> Optional[str]:
        for descriptor in visuals:
            cleaned = self._normalize_spaces(descriptor).lower()
            if not cleaned:
                continue
            if cleaned in self.generic_visual_descriptors:
                continue
            return descriptor
        return visuals[0] if visuals else None

    def _base_prompt(self, spec: PromptSpec, tier: PromptTier) -> str:
        sentences: List[str] = []

        core = (spec.core or "object").strip().rstrip(".")
        sentences.append(core)

        if tier in (PromptTier.CORE_VISUAL, PromptTier.CORE_VISUAL_SPATIAL):
            visual_clause = self._join_clause_list(spec.visual, self.max_visual_descriptors)
            if visual_clause:
                sentences.append(visual_clause.rstrip("."))

        # CORE_VISUAL_SPATIAL is retained as optional backward-compatible tier.
        if tier == PromptTier.CORE_VISUAL_SPATIAL:
            spatial_bits: List[str] = []
            if spec.locations:
                spatial_bits.append(f"located at {spec.locations[0]}")
            if spec.relations:
                spatial_bits.append(spec.relations[0])
            if spec.orientations:
                spatial_bits.append(f"oriented {spec.orientations[0]}")

            spatial_clause = self._join_clause_list(spatial_bits)
            if spatial_clause:
                sentences.append(spatial_clause.rstrip("."))

        return ". ".join(sentences)

    def build_variants(self, spec: PromptSpec, tier: PromptTier) -> List[str]:
        """
        Build several compact prompt candidates for one tier.
        This increases recall for difficult objects without changing detector API.
        """
        base_prompt = self._base_prompt(spec, tier)
        core_text = (spec.core or "object").strip().rstrip(".")
        subject = self._extract_subject_phrase(core_text)
        noun_variants = self._noun_variants(subject)

        candidates: List[str] = [subject]
        candidates.extend(noun_variants)
        candidates.append(core_text)

        if tier in (PromptTier.CORE_VISUAL, PromptTier.CORE_VISUAL_SPATIAL):
            key_visual = self._select_key_visual_descriptor(spec.visual)
            if key_visual:
                candidates.append(f"{subject}. {key_visual.rstrip('.')}")
                if noun_variants:
                    candidates.append(f"{noun_variants[0]}. {key_visual.rstrip('.')}")

        candidates.append(base_prompt)

        cleaned = [
            self._truncate_to_word_limit(text.strip().rstrip("."), self.max_prompt_words)
            for text in candidates
            if text and text.strip()
        ]
        deduped = self._dedup_texts(cleaned)
        return deduped[: self.max_variants_per_tier]

    def build_freeform_variants(self, prompt_text: str) -> List[str]:
        """
        Build fallback variants for free-form prompt input.
        """
        core = (prompt_text or "").strip()
        if not core:
            return []

        subject = self._extract_subject_phrase(core)
        variants = [core, subject]
        variants.extend(self._noun_variants(subject))
        deduped = self._dedup_texts(variants)
        return [
            self._truncate_to_word_limit(text, self.max_prompt_words)
            for text in deduped[: self.max_variants_per_tier]
        ]

    def build(self, spec: PromptSpec, tier: PromptTier) -> str:
        variants = self.build_variants(spec, tier)
        if variants:
            return variants[0]
        return "object"
