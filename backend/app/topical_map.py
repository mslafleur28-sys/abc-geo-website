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
CACHE_SCHEMA_VERSION = "v2-clusters-subtopics"

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


class ContentType(str, Enum):
    guide = "guide"
    how_to = "how-to"
    comparison = "comparison"
    checklist = "checklist"
    faq = "faq"
    case_study = "case-study"
    glossary = "glossary"
    template = "template"


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


class SubtopicNode(BaseModel):
    title: str
    entity_verb_pair: str
    core_question: str
    search_intent: SearchIntent
    content_type: ContentType
    priority_score: int = Field(ge=1, le=100)
    search_volume: Optional[int] = None
    keyword_difficulty: Optional[float] = None


class ClusterNode(BaseModel):
    name: str
    transitive_verb_relation: str
    subtopics: List[SubtopicNode] = Field(min_length=5, max_length=8)
    search_volume: Optional[int] = None
    keyword_difficulty: Optional[float] = None


class TopicalMapPayload(BaseModel):
    """LLM structured-output schema: Core Pillar → Clusters → Subtopics."""

    root_topic: str
    clusters: List[ClusterNode] = Field(min_length=6, max_length=10)


class TopicalMapResponse(TopicalMapPayload):
    audience: Optional[str] = None
    cached: bool = False
    source: str = "gemini"


def normalize_cache_key(topic: str, audience: Optional[str]) -> str:
    base = topic.lower().strip()
    aud = (audience or "").lower().strip()
    raw = f"{CACHE_SCHEMA_VERSION}|{base}||{aud}"
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

Build a comprehensive Topical Authority Map using A + B = GEO:
- Entity A = the Core Pillar Topic (seed)
- Transitive Verb B = how each cluster/subtopic acts upon Entity A
- GEO Result = answer-first, citation-ready content opportunities

Core Pillar Topic (Entity A): {topic}
Target audience: {who}

Hierarchy (exactly 3 tiers):
1. root_topic = the Core Pillar Topic
2. clusters = 7 to 9 broad Topic Clusters / Categories branching from the pillar
3. subtopics = 5 to 8 Supporting Articles / long-tail content ideas under EACH cluster

Requirements:
- Each cluster needs a clear category name and transitive_verb_relation (e.g. defines, implements, measures, compares).
- Each subtopic needs:
  - title (specific, actionable article idea — prefer concise titles like the InLinks-style topical map leaves)
  - entity_verb_pair (e.g. "{topic} + implements")
  - core_question (Answer-First question for RAG / LLM citation)
  - search_intent: informational | commercial | transactional | navigational
  - content_type: guide | how-to | comparison | checklist | faq | case-study | glossary | template
  - priority_score: integer 1–100
- Leave search_volume and keyword_difficulty null.
- Cover definitional, how-to, measurement, tools, comparisons, and conversion angles with minimal overlap.
- Cluster names should read like category labels (short, scannable), not full sentences.

Return only structured data matching the schema.
"""


def _fallback_map(topic: str, audience: Optional[str]) -> TopicalMapResponse:
    """Deterministic offline map when GEMINI_API_KEY / SDK is unavailable."""
    who = audience or "GEO practitioners"
    intents = list(SearchIntent)
    content_types = list(ContentType)

    cluster_specs: List[Tuple[str, str, List[str]]] = [
        (
            "Fundamentals",
            "defines",
            ["Core definitions", "Key entities", "Glossary terms", "Scope boundaries", "Common myths", "History & evolution"],
        ),
        (
            "Implementation",
            "implements",
            ["Starter playbook", "Workflow checklist", "Team roles", "Tech stack setup", "Pilot project", "Rollout timeline", "QA gates"],
        ),
        (
            "Measurement",
            "measures",
            ["KPI framework", "Citation tracking", "AI Overview wins", "Dashboards", "Benchmarks", "Attribution models"],
        ),
        (
            "Tools & Platforms",
            "equips",
            ["Tool comparisons", "Free vs paid", "Integration guides", "Template packs", "Automation scripts", "Vendor shortlist"],
        ),
        (
            "Comparisons",
            "compares",
            ["GEO vs SEO", "GEO vs AEO", "When to choose GEO", "Hybrid strategies", "Competitive landscape", "Migration paths"],
        ),
        (
            "Content Systems",
            "structures",
            ["Cluster architecture", "Internal linking", "Answer-first outlines", "Schema patterns", "Refresh cadence", "Brief templates", "Editorial calendar"],
        ),
        (
            "Audience Plays",
            "serves",
            [f"For {who}", "Executive briefing", "Agency delivery", "In-house enablement", "Stakeholder buy-in", "Training curriculum"],
        ),
        (
            "Conversion Paths",
            "converts",
            ["Offer mapping", "Lead magnets", "Demo CTAs", "Case studies", "Pricing pages", "Proof assets"],
        ),
    ]

    random.seed(f"tam-v2:{topic.lower()}:{who.lower()}")
    clusters: List[ClusterNode] = []
    for idx, (name, verb, leaves) in enumerate(cluster_specs):
        subtopics: List[SubtopicNode] = []
        for ai, leaf in enumerate(leaves):
            intent = intents[(idx + ai) % len(intents)]
            ctype = content_types[(idx + ai) % len(content_types)]
            subtopics.append(
                SubtopicNode(
                    title=leaf if len(leaf) < 48 else f"{name}: {leaf}",
                    entity_verb_pair=f"{topic} + {verb}",
                    core_question=f"How does {topic} {verb} {leaf.lower()} for {who}?",
                    search_intent=intent,
                    content_type=ctype,
                    priority_score=max(40, min(98, 94 - idx * 3 - ai * 2 + random.randint(-2, 2))),
                    search_volume=None,
                    keyword_difficulty=None,
                )
            )
        clusters.append(
            ClusterNode(
                name=name,
                transitive_verb_relation=verb,
                subtopics=subtopics,
                search_volume=None,
                keyword_difficulty=None,
            )
        )

    return TopicalMapResponse(
        root_topic=topic,
        clusters=clusters,
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
            clusters=parsed.clusters,
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
        # Backward-compat: accept legacy pillars/articles payloads if the model slips.
        if "clusters" not in data and "pillars" in data:
            data["clusters"] = []
            for pillar in data.get("pillars") or []:
                data["clusters"].append(
                    {
                        "name": pillar.get("name"),
                        "transitive_verb_relation": pillar.get("transitive_verb_relation"),
                        "subtopics": [
                            {
                                **article,
                                "content_type": article.get("content_type") or "guide",
                            }
                            for article in (pillar.get("articles") or pillar.get("subtopics") or [])
                        ],
                    }
                )
        payload = TopicalMapPayload.model_validate(data)
        return TopicalMapResponse(
            root_topic=topic,
            clusters=payload.clusters,
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
