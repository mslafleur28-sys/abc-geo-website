"""Topical Authority Map generation: schemas, Gemini structured output, cache, rate limit."""

from __future__ import annotations

import hashlib
import json
import os
import random
import re
import threading
import time
from collections import defaultdict, deque
from enum import Enum
from typing import Deque, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:  # pragma: no cover
    genai = None
    genai_types = None


router = APIRouter(tags=["topical-map"])

RATE_LIMIT_MAX = 8
RATE_LIMIT_WINDOW_SEC = 3600
CACHE_MAX_ENTRIES = 256

_cache_lock = threading.Lock()
_rate_lock = threading.Lock()
_map_cache: Dict[str, dict] = {}
_cache_order: Deque[str] = deque()
_ip_hits: Dict[str, Deque[float]] = defaultdict(deque)


class SearchIntent(str, Enum):
    informational = "informational"
    commercial = "commercial"
    transactional = "transactional"
    navigational = "navigational"


class GenerateTopicalMapRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    audience: Optional[str] = Field(default=None, max_length=240)

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value.strip())
        if len(cleaned) < 2:
            raise ValueError("topic must be at least 2 characters")
        return cleaned

    @field_validator("audience")
    @classmethod
    def strip_audience(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = re.sub(r"\s+", " ", value.strip())
        return cleaned or None


class ArticleNode(BaseModel):
    title: str
    entity_verb_pair: str
    core_question: str
    search_intent: SearchIntent
    priority_score: int = Field(ge=1, le=100)
    search_volume: Optional[int] = None
    keyword_difficulty: Optional[float] = None


class PillarNode(BaseModel):
    name: str
    transitive_verb_relation: str
    articles: List[ArticleNode] = Field(min_length=5, max_length=7)
    search_volume: Optional[int] = None
    keyword_difficulty: Optional[float] = None


class TopicalMapPayload(BaseModel):
    """LLM structured-output schema (no transport metadata)."""

    root_topic: str
    pillars: List[PillarNode] = Field(min_length=6, max_length=8)


class TopicalMapResponse(TopicalMapPayload):
    audience: Optional[str] = None
    cached: bool = False
    source: str = "gemini"


def normalize_cache_key(topic: str, audience: Optional[str]) -> str:
    base = topic.lower().strip()
    aud = (audience or "").lower().strip()
    raw = f"{base}||{aud}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(ip: str) -> None:
    now = time.time()
    with _rate_lock:
        hits = _ip_hits[ip]
        while hits and now - hits[0] > RATE_LIMIT_WINDOW_SEC:
            hits.popleft()
        if len(hits) >= RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=429,
                detail=(
                    "You've reached the limit of 8 topical map generations per hour "
                    "from this network. Please try again later — cached topics still load instantly."
                ),
            )
        hits.append(now)


def cache_get(key: str) -> Optional[dict]:
    with _cache_lock:
        payload = _map_cache.get(key)
        return dict(payload) if payload else None


def cache_set(key: str, payload: dict) -> None:
    with _cache_lock:
        if key not in _map_cache:
            _cache_order.append(key)
            while len(_cache_order) > CACHE_MAX_ENTRIES:
                old = _cache_order.popleft()
                _map_cache.pop(old, None)
        _map_cache[key] = dict(payload)


def _build_prompt(topic: str, audience: Optional[str]) -> str:
    who = audience or "content strategists, SEO leads, and in-house GEO teams"
    return f"""You are an expert Generative Engine Optimization (GEO) content architect.

Build a complete Topical Authority Map using the A + B = GEO methodology:
- Entity A = the seed topic (root)
- Transitive Verb B = how each pillar/article acts upon Entity A
- GEO Result = answer-first, citation-ready content opportunities for AI search

Seed topic (Entity A): {topic}
Target audience: {who}

Requirements:
1. root_topic must equal the seed topic (Entity A).
2. Create 6 to 8 pillars. Each pillar needs a clear name and a transitive_verb_relation
   (e.g. "defines", "implements", "measures", "compares").
3. Each pillar must contain 5 to 7 article leaf nodes.
4. Every article must include:
   - title: compelling headline
   - entity_verb_pair: explicit string like "{topic} + implements"
   - core_question: Answer-First question suitable for RAG / LLM citation extraction
   - search_intent: one of informational, commercial, transactional, navigational
   - priority_score: integer 1–100 (higher = ship sooner)
5. Leave search_volume and keyword_difficulty as null (reserved for later enrichment).
6. Cover definitional, how-to, measurement, tools, comparisons, and conversion angles.
7. Prefer concrete, non-overlapping coverage across pillars.

Return only structured data matching the schema.
"""


def _fallback_map(topic: str, audience: Optional[str]) -> TopicalMapResponse:
    """Deterministic offline map when GEMINI_API_KEY / SDK is unavailable."""
    who = audience or "GEO practitioners"
    intents = [
        SearchIntent.informational,
        SearchIntent.commercial,
        SearchIntent.transactional,
        SearchIntent.navigational,
        SearchIntent.informational,
        SearchIntent.commercial,
        SearchIntent.informational,
    ]
    pillar_specs: List[Tuple[str, str]] = [
        (f"{topic} Fundamentals", "defines"),
        (f"Implementing {topic}", "implements"),
        (f"Measuring {topic} Impact", "measures"),
        (f"{topic} Tools & Platforms", "equips"),
        (f"{topic} vs Adjacent Strategies", "compares"),
        (f"{topic} Content Systems", "structures"),
        (f"{topic} for {who}", "serves"),
        (f"Converting with {topic}", "converts"),
    ]
    random.seed(f"tam:{topic.lower()}:{who.lower()}")
    article_angles = [
        "Playbook",
        "Checklist",
        "Examples",
        "Benchmarks",
        "Template",
        "FAQ",
        "Case Study",
    ]
    question_templates = [
        "What is the best way for {who} to use {topic} so it {verb} {focus}?",
        "How can {topic} {verb} {focus} in a way {who} can cite and reuse?",
        "Why should {who} prioritize {focus} when applying {topic}?",
        "Which {focus} steps help {topic} {verb} measurable GEO outcomes?",
        "When does {topic} {verb} {focus} better than adjacent SEO tactics?",
        "What tools help {topic} {verb} {focus} for {who}?",
        "How do you measure whether {topic} successfully {verb}s {focus}?",
    ]
    pillars: List[PillarNode] = []
    for idx, (name, verb) in enumerate(pillar_specs[:7]):
        articles: List[ArticleNode] = []
        count = 5 + (idx % 3)
        focus = name.lower()
        for ai in range(count):
            intent = intents[(idx + ai) % len(intents)]
            angle = article_angles[ai]
            q_tmpl = question_templates[(idx + ai) % len(question_templates)]
            articles.append(
                ArticleNode(
                    title=f"{name}: {angle}",
                    entity_verb_pair=f"{topic} + {verb}",
                    core_question=q_tmpl.format(topic=topic, verb=verb, who=who, focus=focus),
                    search_intent=intent,
                    priority_score=max(35, min(98, 92 - idx * 4 - ai * 3 + random.randint(-2, 2))),
                    search_volume=None,
                    keyword_difficulty=None,
                )
            )
        pillars.append(
            PillarNode(
                name=name,
                transitive_verb_relation=verb,
                articles=articles,
                search_volume=None,
                keyword_difficulty=None,
            )
        )
    return TopicalMapResponse(
        root_topic=topic,
        pillars=pillars,
        audience=audience,
        cached=False,
        source="fallback",
    )


def _generate_with_gemini(topic: str, audience: Optional[str]) -> Optional[TopicalMapResponse]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or genai is None or genai_types is None:
        return None

    client = genai.Client(api_key=api_key)
    prompt = _build_prompt(topic, audience)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.4,
                response_mime_type="application/json",
                response_schema=TopicalMapPayload,
            ),
        )
    except Exception:
        return None

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, TopicalMapPayload):
        return TopicalMapResponse(
            root_topic=topic,
            pillars=parsed.pillars,
            audience=audience,
            cached=False,
            source="gemini",
        )

    raw = (getattr(response, "text", None) or "").strip()
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return None

    try:
        payload = TopicalMapPayload.model_validate(data)
        return TopicalMapResponse(
            root_topic=topic,
            pillars=payload.pillars,
            audience=audience,
            cached=False,
            source="gemini",
        )
    except Exception:
        return None


def generate_topical_map(topic: str, audience: Optional[str]) -> TopicalMapResponse:
    return _generate_with_gemini(topic, audience) or _fallback_map(topic, audience)


@router.post("/api/generate-topical-map", response_model=TopicalMapResponse)
def generate_topical_map_endpoint(
    payload: GenerateTopicalMapRequest,
    request: Request,
) -> TopicalMapResponse:
    key = normalize_cache_key(payload.topic, payload.audience)
    cached = cache_get(key)
    if cached:
        model = TopicalMapResponse.model_validate(cached)
        model.cached = True
        return model

    enforce_rate_limit(_client_ip(request))
    result = generate_topical_map(payload.topic, payload.audience)
    result.cached = False
    cache_set(key, result.model_dump())
    return result
