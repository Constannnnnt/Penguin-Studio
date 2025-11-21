import spacy

from app.detection.backend import PromptBackend

class SemanticParser(PromptBackend):
    def __init__(self, model_name = "en_core_web_sm"):
        self.nlp = spacy.load(model_name)
    
    def parse(self, text: str):
        return self.nlp(text)
        