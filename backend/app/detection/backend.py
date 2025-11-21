from abc import ABC, abstractmethod

class DetectionBackend(ABC):
    @abstractmethod
    def detect(self, image_path: str, prompts: str):
        raise NotImplementedError


class PromptBackend(ABC):
    @abstractmethod
    def parse(self, text: str):
        raise NotImplementedError