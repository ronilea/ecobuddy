"""LLM question/insights generation.

Wire a backend once at startup via ``configure`` — this module does not read env/settings.
Add a new provider by implementing ``LlmBackend``; generation/validation stay closed.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Callable, Protocol, TypeVar

from openai import APIError, APITimeoutError, OpenAI, RateLimitError
from pydantic import ValidationError

from app.schemas import GeneratedQuestion, SessionInsights
from app.services.prompts import (
    BUDDY_SYSTEM,
    INSIGHTS_USER_TEMPLATE,
    QUESTION_USER_TEMPLATE,
    adaptation_instruction,
    covered_concepts_summary,
    format_history,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
CONCEPT_OVERLAP = 0.5
STEM_OVERLAP = 0.45

STOP_WORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "is",
        "are",
        "was",
        "what",
        "which",
        "how",
        "of",
        "in",
        "to",
        "and",
        "or",
        "for",
        "on",
        "by",
        "with",
        "from",
        "that",
        "this",
        "does",
        "do",
        "most",
        "main",
        "major",
        "primary",
        "cause",
        "causes",
        "leading",
        "biggest",
        "largest",
        "why",
        "when",
        "where",
        "can",
        "has",
        "have",
        "human",
        "activity",
        "related",
        "involving",
        "driver",
        "drivers",
    }
)

# Extend this map to cluster synonyms — validation logic stays unchanged.
CONCEPT_ALIASES = {
    "trees": "forests",
    "tree": "forests",
    "deforestation": "forests",
    "logging": "forests",
    "forest": "forests",
    "warming": "climate",
    "greenhouse": "climate",
    "emission": "carbon",
    "emissions": "carbon",
    "co2": "carbon",
    "dioxide": "carbon",
    "acidification": "ocean",
    "marine": "ocean",
    "sea": "ocean",
    "solar": "renewables",
    "wind": "renewables",
    "hydro": "renewables",
    "renewable": "renewables",
    "species": "biodiversity",
    "habitat": "biodiversity",
    "wildlife": "biodiversity",
}

MOCK_QUESTIONS = [
    {
        "stem": "Which process removes the most CO₂ from the atmosphere naturally?",
        "options": [
            "Photosynthesis in plants and forests",
            "Volcanic eruptions",
            "Lightning strikes",
            "Ocean evaporation",
        ],
        "correct_index": 0,
        "explanation": "The answer is photosynthesis in plants and forests — that's nature's biggest way of pulling CO₂ out of the air.",
        "explanation_why": "During photosynthesis, plants convert CO₂ into sugars and wood, storing carbon in their biomass and in forest soils for a long time.",
        "difficulty": "medium",
        "focus_concept": "carbon sequestration",
        "buddy_intro": "Let's start with something fundamental — where does all that atmospheric carbon go?",
        "buddy_hint": "Think about what plants turn CO₂ into during photosynthesis — and what they release.",
    },
    {
        "stem": "What is ocean acidification primarily caused by?",
        "options": [
            "The ocean absorbing excess CO₂ from the atmosphere",
            "Oil spills along coastlines",
            "Plastic pollution breaking down",
            "Overfishing reducing marine life",
        ],
        "correct_index": 0,
        "explanation": "The ocean absorbing excess CO₂ from the atmosphere is the main cause of ocean acidification.",
        "explanation_why": "When seawater takes up CO₂, it forms carbonic acid, which lowers pH and makes it harder for shell-forming marine life to build their shells.",
        "difficulty": "medium",
        "focus_concept": "ocean acidification",
        "buddy_intro": "I've been curious about the oceans — this one's about a hidden climate impact.",
        "buddy_hint": "What happens when the ocean absorbs extra CO₂ from the air?",
    },
    {
        "stem": "Which energy source produces no direct carbon emissions during operation?",
        "options": ["Coal-fired power", "Solar panels", "Natural gas", "Diesel generators"],
        "correct_index": 1,
        "explanation": "Solar panels are the right pick — they produce electricity without burning fuel on site.",
        "explanation_why": "Sunlight excites electrons in the panel to create a current, so there's no combustion and no direct carbon emissions while the system is running.",
        "difficulty": "easy",
        "focus_concept": "renewable energy",
        "buddy_intro": "Let's explore clean energy — which of these runs without burning fuel?",
        "buddy_hint": "Which option generates power without burning anything on the spot?",
    },
    {
        "stem": "What is biodiversity loss mainly driven by?",
        "options": [
            "Habitat destruction and fragmentation",
            "Increased rainfall",
            "More national parks",
            "Seasonal temperature changes alone",
        ],
        "correct_index": 0,
        "explanation": "Habitat destruction and fragmentation is the main driver of biodiversity loss.",
        "explanation_why": "When forests or wetlands are cleared or broken into smaller patches, species lose food, shelter, and migration routes — and populations become too small to recover.",
        "difficulty": "medium",
        "focus_concept": "biodiversity",
        "buddy_intro": "Species are disappearing faster than ever — let's think about why.",
        "buddy_hint": "What happens to species when their homes are broken up or destroyed?",
    },
]

T = TypeVar("T")


class LlmBackend(Protocol):
    def generate_question(
        self, topic: str, history: list[dict], sequence_number: int
    ) -> tuple[GeneratedQuestion, dict]: ...

    def generate_insights(self, topic: str, history: list[dict]) -> SessionInsights: ...


_backend: LlmBackend | None = None


def configure(backend: LlmBackend) -> None:
    global _backend
    _backend = backend


def _active() -> LlmBackend:
    if _backend is None:
        raise RuntimeError("LLM backend not configured — call llm_service.configure() at startup")
    return _backend


def _parse_json(content: str) -> dict[str, Any]:
    text = content.strip()
    if not text:
        raise json.JSONDecodeError("Empty response", text, 0)
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(text)


def _keyword_set(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    normalized: set[str] = set()
    for word in words:
        if word in STOP_WORDS or len(word) <= 2:
            continue
        normalized.add(CONCEPT_ALIASES.get(word, word))
    return normalized


def _word_overlap(a: str, b: str) -> float:
    left, right = _keyword_set(a), _keyword_set(b)
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _concepts_similar(a: str, b: str) -> bool:
    left, right = a.lower().strip(), b.lower().strip()
    if left == right or left in right or right in left:
        return True
    return _word_overlap(a, b) >= CONCEPT_OVERLAP


def _stems_similar(a: str, b: str) -> bool:
    return _word_overlap(a, b) >= STEM_OVERLAP


def _validate_question(data: dict[str, Any], history: list[dict]) -> GeneratedQuestion:
    q = GeneratedQuestion.model_validate(data)
    if len(set(q.options)) != 4:
        raise ValueError("Options must be unique")
    if not q.stem.strip():
        raise ValueError("stem must not be empty")
    if any(not option.strip() for option in q.options):
        raise ValueError("options must not be empty")
    if not q.explanation.strip():
        raise ValueError("explanation must not be empty")
    if not q.explanation_why.strip():
        raise ValueError("explanation_why must not be empty")

    if not history:
        return q

    last = history[-1]
    reinforcing = not last["is_correct"]

    if reinforcing:
        if not _concepts_similar(q.focus_concept, last["focus_concept"]):
            raise ValueError(
                f"focus_concept must reinforce '{last['focus_concept']}', got '{q.focus_concept}'"
            )
        if _stems_similar(q.stem, last["stem"]):
            raise ValueError("stem too similar to the previous question — use a different framing")
        return q

    for entry in history:
        if _concepts_similar(q.focus_concept, entry["focus_concept"]):
            raise ValueError(
                f"focus_concept '{q.focus_concept}' is too similar to earlier "
                f"'{entry['focus_concept']}' — pick a new sub-topic"
            )
        if _stems_similar(q.stem, entry["stem"]):
            raise ValueError("stem too similar to a previous question — ask about a different idea")

    return q


def _retry_json(
    *,
    label: str,
    user_prompt: str,
    temperature: float,
    complete: Callable[[str, float], str],
    parse: Callable[[dict[str, Any]], T],
) -> tuple[T, int]:
    """Shared retry loop: validate → append error to prompt; backoff on transient API errors."""
    prompt = user_prompt
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            raw = complete(prompt, temperature)
            return parse(_parse_json(raw)), attempt + 1
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            logger.warning("%s attempt %s invalid: %s", label, attempt + 1, exc)
            prompt += f"\n\nPrevious attempt invalid: {exc}. Fix the JSON."
        except (RateLimitError, APITimeoutError) as exc:
            last_error = exc
            logger.warning("%s attempt %s transient: %s", label, attempt + 1, exc)
            if attempt < MAX_RETRIES - 1:
                time.sleep(min(2**attempt, 8))
                continue
            logger.exception("%s failed after retries", label)
            raise RuntimeError(f"{label} failed: {exc}") from exc
        except APIError as exc:
            logger.exception("%s API error", label)
            raise RuntimeError(f"{label} failed: {exc}") from exc

    logger.error("%s exhausted retries: %s", label, last_error)
    raise RuntimeError(f"{label} failed after {MAX_RETRIES} tries: {last_error}")


class OpenAIBackend:
    def __init__(self, *, api_key: str, model: str, timeout: float) -> None:
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required when mock LLM is disabled")
        self._model = model
        self._client = OpenAI(api_key=api_key, timeout=timeout)

    def _complete(self, user_prompt: str, temperature: float) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": BUDDY_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    def generate_question(
        self, topic: str, history: list[dict], sequence_number: int
    ) -> tuple[GeneratedQuestion, dict]:
        last = history[-1] if history else None
        user_prompt = QUESTION_USER_TEMPLATE.format(
            topic=topic,
            history=format_history(history),
            covered_concepts=covered_concepts_summary(history),
            adaptation=adaptation_instruction(last, history),
        )
        start = time.time()
        question, attempt = _retry_json(
            label="question generation",
            user_prompt=user_prompt,
            temperature=0.7,
            complete=self._complete,
            parse=lambda data: _validate_question(data, history),
        )
        return question, {
            "model": self._model,
            "latency_ms": int((time.time() - start) * 1000),
            "attempt": attempt,
        }

    def generate_insights(self, topic: str, history: list[dict]) -> SessionInsights:
        user_prompt = INSIGHTS_USER_TEMPLATE.format(
            topic=topic,
            history=format_history(history),
        )
        insights, _ = _retry_json(
            label="insights generation",
            user_prompt=user_prompt,
            temperature=0.5,
            complete=self._complete,
            parse=lambda data: SessionInsights.model_validate(data),
        )
        return insights


class MockBackend:
    """Deterministic demo backend — not a failure fallback."""

    def generate_question(
        self, topic: str, history: list[dict], sequence_number: int
    ) -> tuple[GeneratedQuestion, dict]:
        template = MOCK_QUESTIONS[(sequence_number - 1) % len(MOCK_QUESTIONS)]
        if history and not history[-1]["is_correct"]:
            template = {
                **template,
                "difficulty": "easy",
                "buddy_intro": "Let's try a similar concept together — no pressure!",
            }
        return GeneratedQuestion.model_validate(template), {
            "model": "mock",
            "latency_ms": 0,
            "attempt": 1,
        }

    def generate_insights(self, topic: str, history: list[dict]) -> SessionInsights:
        correct = [h for h in history if h["is_correct"]]
        wrong = [h for h in history if not h["is_correct"]]
        return SessionInsights(
            strengths=(
                [f"Solid grasp of {correct[0]['focus_concept']}"]
                if correct
                else ["Engaged with the material"]
            ),
            gaps=(
                [f"Worth revisiting {wrong[0]['focus_concept']}"]
                if wrong
                else ["Keep exploring new concepts"]
            ),
            recommended_next_steps=[f"Read more about {topic}", "Try another quiz set tomorrow"],
            buddy_summary=(
                f"Based on our session on {topic}, we covered some great ground together. Keep going!"
            ),
        )


def generate_question(
    topic: str,
    history: list[dict],
    sequence_number: int,
) -> tuple[GeneratedQuestion, dict]:
    return _active().generate_question(topic, history, sequence_number)


def generate_insights(topic: str, history: list[dict]) -> SessionInsights:
    return _active().generate_insights(topic, history)
