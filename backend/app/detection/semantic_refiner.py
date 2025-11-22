
from typing import Optional, Dict, Any

from app.detection.semantic_parser import SemanticParser
from app.detection.types import PromptSpec
from app.detection.desc_deduper import DescriptorDeduper
from app.detection.field_spec_builder import FieldSpecBuilder
class SemanticRefiner:

    """
    Refine PromptSpec using NLP.

    Responsibilities:
      - From `description`:
          - compress a richer set of visual descriptors (adjective+head-noun phrases)
          - extract spatial phrases (prepositional phrases)
      - From `shape_and_color` and `appearance_details`:
          - pull out short descriptive chunks (adjectives and nouns)
      - Deduplicate descriptors to keep prompts compact.

    """

    VISUAL_FIELDS = FieldSpecBuilder.VISUAL_FIELDS
    LOCATION_FIELDS = FieldSpecBuilder.LOCATION_FIELDS
    RELATION_FIELDS = FieldSpecBuilder.RELATION_FIELDS
    ORIENTATION_FIELDS = FieldSpecBuilder.ORIENTATION_FIELDS

    # Prepositions that strongly imply locational info
    LOC_PREPS = {
        "on", "in", "inside", "at", "over", "under", "below",
        "above", "around", "near", "beside", "behind", "between",
    }
    def __init__(self, parser:  Optional[SemanticParser] = None, deduper: Optional[DescriptorDeduper] = None):
        self.parser = parser or SemanticParser()
        self.deduper = deduper or DescriptorDeduper()
    
    def refine(self, raw: Dict[str, Any], spec: PromptSpec):
        desc = str(raw.get("description") or "").strip()
        if desc:
            self._refine_from_description(desc, spec)
        
        # Visual fields
        for key in self.VISUAL_FIELDS:
            if key in raw and raw[key]:
                self._refine_visual_field(str(raw[key]), spec)

        # Location fields
        for key in self.LOCATION_FIELDS:
            if key in raw and raw[key]:
                self._refine_location_field(str(raw[key]), spec)

        # Relation fields
        for key in self.RELATION_FIELDS:
            if key in raw and raw[key]:
                self._refine_relation_field(str(raw[key]), spec)

        for key in self.ORIENTATION_FIELDS:
            if key in raw and raw[key]:
                self._refine_orientation_field(str(raw[key]), spec)

        # Deduplicate at the end
        spec.visual = self.deduper.dedup(spec.visual)
        spec.locations = self.deduper.dedup(spec.locations)
        spec.relations = self.deduper.dedup(spec.relations)
        spec.orientations = self.deduper.dedup(spec.orientations)

        return spec
    
    def _refine_from_description(self, text: str, spec: PromptSpec):
        doc = self.parser.parse(text)
        sents = list(doc.sents)
        first_sent = sents[0] if sents else doc

        # 1) adj + noun visual phrases: "translucent red gemstone", "teardrop shape"
        for token in first_sent:
            if token.pos_ == "NOUN":
                adjs = [c for c in token.children if c.dep_ == "amod"]
                if not adjs:
                    continue
                phrase_tokens = sorted(adjs, key=lambda t: t.i) + [token]
                phrase = " ".join(t.text for t in phrase_tokens)
                spec.visual.append(phrase)

        # 2) spatial prepositional phrases: "at the top of the chain-link band"
        for token in first_sent:
            if token.dep_ == "prep":
                pobj = next((c for c in token.children if c.dep_ == "pobj"), None)
                if not pobj:
                    continue
                span = doc[token.left_edge.i : pobj.right_edge.i + 1]
                span_text = span.text.strip()
                if not span_text:
                    continue
                if token.lemma_.lower() in self.LOC_PREPS:
                    spec.locations.append(span_text)
                else:
                    spec.relations.append(span_text)

        # 3) full first sentence as a rich visual descriptor if not equal to core
        sent_text = first_sent.text.strip()
        if sent_text and sent_text != spec.core:
            spec.visual.append(sent_text)

    
    def _refine_visual_field(self, text: str, spec: PromptSpec):
        """
        For visual fields like shape_and_color / texture / appearance_details / relative_size,
        derive compact descriptive phrases centered on nouns.
        """
        doc = self.parser.parse(text)
        used_nouns = set()

        for token in doc:
            if token.pos_ != "NOUN" or token.i in used_nouns:
                continue
            adjs = [c for c in token.children if c.dep_ == "amod"]
            if adjs:
                phrase_tokens = sorted(adjs, key=lambda t: t.i) + [token]
                phrase = " ".join(t.text for t in phrase_tokens)
            else:
                phrase = token.text
            spec.visual.append(phrase)
            used_nouns.add(token.i)

        # If no noun/adjs at all (rare), just keep the whole string as-is 
    

    def _refine_location_field(self, text: str, spec: PromptSpec):
        """
        Typically locations are already concise (e.g., 'center', 'top-center of the ring').
        For longer strings, extract the most location-like span via preps.
        """
        doc = self.parser.parse(text)
        tokens = list(doc)
        if len(tokens) <= 6:
            spec.locations.append(text.strip())
            return

        for token in doc:
            if token.dep_ == "prep":
                pobj = next((c for c in token.children if c.dep_ == "pobj"), None)
                if not pobj:
                    continue
                span = doc[token.left_edge.i : pobj.right_edge.i + 1]
                span_text = span.text.strip()
                if span_text:
                    spec.locations.append(span_text)

    def _refine_relation_field(self, text: str, spec: PromptSpec):
        """
        For relationship sentences like:
          'The band holds the red gemstone securely.'
        we derive shorter action-centric snippets:
          'holds the red gemstone'
        """
        doc = self.parser.parse(text)

        # If it's very short, keep as-is.
        if len(list(doc)) <= 8:
            spec.relations.append(text.strip())
            return

        for token in doc:
            if token.pos_ == "VERB":
                obj = next((c for c in token.children if c.dep_ in {"dobj", "obj"}), None)
                if obj:
                    span = doc[token.i : obj.right_edge.i + 1]
                    span_text = span.text.strip()
                    spec.relations.append(span_text)

    def _refine_orientation_field(self, text: str, spec: PromptSpec):
        """
        Orientation fields are usually already good phrases:
          'vertical, with the pointed end facing downwards'
        We may keep as-is; NLP is mainly here for consistency.
        """
        spec.orientations.append(text.strip())