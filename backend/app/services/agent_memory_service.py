"""
Persistent memory service for agentic sessions.

Stores:
- session snapshots (latest context per session_id)
- append-only events (global + per-session JSONL)

Used to provide retrieval context for analyzer/orchestrator.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from loguru import logger

from app.config import settings


class AgentMemoryService:
    """Lightweight persisted memory for agentic workflows."""

    MAX_RETRIEVAL_EVENTS = 600
    MAX_RECENT_EVENTS = 12

    def __init__(self, memory_dir: Optional[Path] = None):
        self.memory_dir = (memory_dir or settings.agent_memory_dir).resolve()
        self.sessions_dir = self.memory_dir / "sessions"
        self.events_path = self.memory_dir / "events.jsonl"
        self._lock = threading.RLock()
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        if not self.events_path.exists():
            self.events_path.touch()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _safe_json_text(value: Any) -> str:
        try:
            return json.dumps(value, ensure_ascii=True)
        except Exception:
            return str(value)

    @staticmethod
    def _coerce_seed(value: Any) -> Optional[int]:
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, str):
            try:
                parsed = int(value.strip())
                return parsed
            except Exception:
                return None
        return None

    @staticmethod
    def _tokenize(text: str) -> Set[str]:
        if not text:
            return set()
        out: Set[str] = set()
        token = []
        for ch in text.lower():
            if ch.isalnum() or ch in {"#", "_", "-"}:
                token.append(ch)
                continue
            if token:
                t = "".join(token)
                if len(t) >= 2:
                    out.add(t)
                token = []
        if token:
            t = "".join(token)
            if len(t) >= 2:
                out.add(t)
        return out

    @staticmethod
    def _extract_generation_id(
        image_context: Optional[Dict[str, Any]],
    ) -> Optional[str]:
        if not isinstance(image_context, dict):
            return None

        for key in ("generation_id", "current_generation_id"):
            raw = image_context.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()

        source_image = image_context.get("source_image")
        if isinstance(source_image, str):
            marker = "/outputs/"
            if marker in source_image:
                tail = source_image.split(marker, 1)[1]
                generation_id = tail.split("/", 1)[0].strip()
                if generation_id:
                    return generation_id

            source_image_normalized = source_image.replace("\\", "/")
            marker_local = "outputs/"
            if marker_local in source_image_normalized:
                tail = source_image_normalized.split(marker_local, 1)[1]
                generation_id = tail.split("/", 1)[0].strip()
                if generation_id:
                    return generation_id

        return None

    def _extract_project_key(
        self, image_context: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        generation_id = self._extract_generation_id(image_context)
        if generation_id:
            return f"generation:{generation_id}"
        return None

    def _session_path(self, session_id: str) -> Path:
        return self.sessions_dir / f"{session_id}.json"

    def _session_events_path(self, session_id: str) -> Path:
        return self.sessions_dir / f"{session_id}.events.jsonl"

    @staticmethod
    def _read_json(path: Path) -> Optional[Dict[str, Any]]:
        if not path.exists():
            return None
        try:
            raw = path.read_text(encoding="utf-8")
            if not raw.strip():
                return None
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
            return None
        except Exception:
            return None

    @staticmethod
    def _write_json(path: Path, payload: Dict[str, Any]) -> None:
        path.write_text(
            json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8"
        )

    @staticmethod
    def _append_jsonl(path: Path, payload: Dict[str, Any]) -> None:
        line = json.dumps(payload, ensure_ascii=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    @staticmethod
    def _tail_jsonl(path: Path, limit: int) -> List[Dict[str, Any]]:
        if not path.exists():
            return []
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
            if limit > 0:
                lines = lines[-limit:]
            out: List[Dict[str, Any]] = []
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    parsed = json.loads(line)
                except Exception:
                    continue
                if isinstance(parsed, dict):
                    out.append(parsed)
            return out
        except Exception:
            return []

    def get_session_context(
        self, session_id: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        if not isinstance(session_id, str) or not session_id.strip():
            return None
        with self._lock:
            snapshot = self._read_json(self._session_path(session_id.strip()))
            if not snapshot:
                return None
            image_context = snapshot.get("image_context")
            if not isinstance(image_context, dict):
                return None
            return image_context

    def upsert_session_context(
        self,
        *,
        session_id: str,
        image_context: Optional[Dict[str, Any]] = None,
        client_id: Optional[str] = None,
        query: Optional[str] = None,
    ) -> Dict[str, Any]:
        session_id = session_id.strip()
        if not session_id:
            raise ValueError("session_id is required")

        with self._lock:
            path = self._session_path(session_id)
            existing = self._read_json(path) or {
                "session_id": session_id,
                "created_at": self._now_iso(),
            }

            existing["session_id"] = session_id
            existing["last_seen_at"] = self._now_iso()
            if isinstance(client_id, str) and client_id.strip():
                existing["client_id"] = client_id.strip()
            if isinstance(query, str) and query.strip():
                existing["last_query"] = query.strip()

            previous_context = existing.get("image_context")
            merged_context: Dict[str, Any] = {}
            if isinstance(previous_context, dict):
                merged_context.update(previous_context)
            if isinstance(image_context, dict):
                merged_context.update(image_context)
            if merged_context:
                existing["image_context"] = merged_context

            project_key = self._extract_project_key(
                merged_context if merged_context else None
            )
            if project_key:
                existing["project_key"] = project_key

            generation_id = self._extract_generation_id(
                merged_context if merged_context else None
            )
            if generation_id:
                existing["generation_id"] = generation_id

            seed = self._coerce_seed((merged_context or {}).get("seed"))
            if seed is not None:
                existing["seed"] = seed

            source_image = (merged_context or {}).get("source_image")
            if isinstance(source_image, str) and source_image.strip():
                existing["source_image"] = source_image.strip()

            selected_mask_id = (merged_context or {}).get("selected_mask_id")
            if isinstance(selected_mask_id, str) and selected_mask_id.strip():
                existing["selected_mask_id"] = selected_mask_id.strip()

            self._write_json(path, existing)
            return existing

    def append_event(
        self,
        *,
        event_type: str,
        session_id: Optional[str] = None,
        client_id: Optional[str] = None,
        query: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        image_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        event_type_clean = str(event_type or "").strip() or "unknown"
        session_id_clean = str(session_id or "").strip() or None

        with self._lock:
            session_snapshot: Optional[Dict[str, Any]] = None
            if session_id_clean:
                session_snapshot = self.upsert_session_context(
                    session_id=session_id_clean,
                    image_context=image_context,
                    client_id=client_id,
                    query=query,
                )

            project_key = self._extract_project_key(image_context)
            if not project_key and isinstance(session_snapshot, dict):
                existing_project = session_snapshot.get("project_key")
                if isinstance(existing_project, str) and existing_project.strip():
                    project_key = existing_project.strip()

            event: Dict[str, Any] = {
                "event_id": str(uuid.uuid4()),
                "timestamp": self._now_iso(),
                "event_type": event_type_clean,
            }
            if session_id_clean:
                event["session_id"] = session_id_clean
            if isinstance(client_id, str) and client_id.strip():
                event["client_id"] = client_id.strip()
            if isinstance(query, str) and query.strip():
                event["query"] = query.strip()
            if isinstance(project_key, str) and project_key.strip():
                event["project_key"] = project_key.strip()
            if isinstance(payload, dict) and payload:
                event["payload"] = payload

            self._append_jsonl(self.events_path, event)
            if session_id_clean:
                self._append_jsonl(self._session_events_path(session_id_clean), event)
            return event

    @staticmethod
    def _compact_event_for_prompt(event: Dict[str, Any]) -> Dict[str, Any]:
        compact: Dict[str, Any] = {
            "timestamp": event.get("timestamp"),
            "event_type": event.get("event_type"),
        }
        query = event.get("query")
        if isinstance(query, str) and query.strip():
            compact["query"] = query.strip()

        payload = event.get("payload")
        if isinstance(payload, dict):
            payload_summary: Dict[str, Any] = {}
            for key in (
                "intent",
                "status",
                "tool",
                "tools",
                "error",
                "generation_id",
                "mask_id",
                "modification_prompt",
            ):
                if key in payload:
                    payload_summary[key] = payload.get(key)
            if payload_summary:
                compact["payload"] = payload_summary

        return compact

    def _score_related_event(
        self,
        *,
        query_tokens: Set[str],
        event: Dict[str, Any],
        project_key: Optional[str],
    ) -> float:
        if not query_tokens:
            return 0.0

        search_blob_parts: List[str] = []
        for key in ("query", "event_type"):
            value = event.get(key)
            if isinstance(value, str):
                search_blob_parts.append(value)

        payload = event.get("payload")
        if payload is not None:
            search_blob_parts.append(self._safe_json_text(payload))

        blob = " ".join(search_blob_parts)
        event_tokens = self._tokenize(blob)
        if not event_tokens:
            return 0.0

        overlap = len(query_tokens.intersection(event_tokens))
        if overlap == 0:
            return 0.0

        score = overlap / max(len(query_tokens), 1)
        if project_key and event.get("project_key") == project_key:
            score += 0.35
        return score

    MAX_PROJECT_SESSIONS = 5  # Bound cross-session lookup

    def _find_project_sessions(
        self, project_key: str, exclude_session_id: Optional[str] = None
    ) -> List[str]:
        """Find session IDs that share the same project_key, bounded by MAX_PROJECT_SESSIONS."""
        if not project_key:
            return []
        session_ids: List[str] = []
        try:
            for path in sorted(
                self.sessions_dir.glob("*.json"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            ):
                if path.name.endswith(".events.jsonl"):
                    continue
                snapshot = self._read_json(path)
                if not isinstance(snapshot, dict):
                    continue
                if snapshot.get("project_key") != project_key:
                    continue
                sid = snapshot.get("session_id")
                if not isinstance(sid, str) or not sid.strip():
                    continue
                if exclude_session_id and sid.strip() == exclude_session_id.strip():
                    continue
                session_ids.append(sid.strip())
                if len(session_ids) >= self.MAX_PROJECT_SESSIONS:
                    break
        except Exception:
            logger.debug("Error scanning sessions for project_key={}", project_key)
        return session_ids

    def build_memory_context(
        self,
        *,
        query: str,
        session_id: Optional[str],
        image_context: Optional[Dict[str, Any]],
        recent_limit: int = 6,
        related_limit: int = 6,
    ) -> Dict[str, Any]:
        if not isinstance(query, str):
            query = ""

        session_snapshot: Optional[Dict[str, Any]] = None
        if isinstance(session_id, str) and session_id.strip():
            session_snapshot = self.upsert_session_context(
                session_id=session_id.strip(),
                image_context=image_context,
                query=query,
            )

        project_key = self._extract_project_key(image_context)
        if not project_key and isinstance(session_snapshot, dict):
            raw_project_key = session_snapshot.get("project_key")
            if isinstance(raw_project_key, str) and raw_project_key.strip():
                project_key = raw_project_key.strip()

        with self._lock:
            recent_events: List[Dict[str, Any]] = []
            if isinstance(session_id, str) and session_id.strip():
                recent_events = self._tail_jsonl(
                    self._session_events_path(session_id.strip()),
                    limit=max(1, recent_limit),
                )

            related_candidates = self._tail_jsonl(
                self.events_path, limit=self.MAX_RETRIEVAL_EVENTS
            )

            # Cross-session: include events from other sessions on the same project
            if project_key:
                sibling_session_ids = self._find_project_sessions(
                    project_key,
                    exclude_session_id=session_id
                    if isinstance(session_id, str)
                    else None,
                )
                for sibling_sid in sibling_session_ids:
                    sibling_events = self._tail_jsonl(
                        self._session_events_path(sibling_sid),
                        limit=self.MAX_RECENT_EVENTS,
                    )
                    related_candidates.extend(sibling_events)

        query_tokens = self._tokenize(query)
        scored: List[tuple[float, Dict[str, Any]]] = []
        for event in related_candidates:
            if not isinstance(event, dict):
                continue
            score = self._score_related_event(
                query_tokens=query_tokens, event=event, project_key=project_key
            )
            if score <= 0:
                continue
            scored.append((score, event))

        scored.sort(key=lambda item: item[0], reverse=True)

        seen_event_ids: Set[str] = set()
        recent_compact: List[Dict[str, Any]] = []
        for event in recent_events[-max(1, recent_limit) :]:
            compact = self._compact_event_for_prompt(event)
            event_id = str(event.get("event_id") or "")
            if event_id:
                seen_event_ids.add(event_id)
            recent_compact.append(compact)

        related_compact: List[Dict[str, Any]] = []
        for score, event in scored:
            event_id = str(event.get("event_id") or "")
            if event_id and event_id in seen_event_ids:
                continue
            compact = self._compact_event_for_prompt(event)
            compact["relevance_score"] = round(score, 3)
            related_compact.append(compact)
            if len(related_compact) >= max(1, related_limit):
                break

        output: Dict[str, Any] = {}
        if project_key:
            output["project_key"] = project_key
        if isinstance(session_snapshot, dict):
            session_summary: Dict[str, Any] = {
                "session_id": session_snapshot.get("session_id"),
                "seed": session_snapshot.get("seed"),
                "generation_id": session_snapshot.get("generation_id"),
                "selected_mask_id": session_snapshot.get("selected_mask_id"),
            }
            cleaned_summary = {
                key: value
                for key, value in session_summary.items()
                if value not in (None, "", [], {})
            }
            if cleaned_summary:
                output["session"] = cleaned_summary
        if recent_compact:
            output["recent_events"] = recent_compact
        if related_compact:
            output["related_events"] = related_compact

        if output:
            logger.debug(
                "Built agent memory context: session_id={}, project_key={}, recent={}, related={}",
                session_id,
                project_key,
                len(recent_compact),
                len(related_compact),
            )
        return output
