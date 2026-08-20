from __future__ import annotations

import base64
import json
import os
import random
import re
from dataclasses import dataclass
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - local environments may not have deps installed yet
    genai = None


class AnalyzeRequest(BaseModel):
    drafted_text: str = Field(min_length=50, max_length=12000)
    market: str = Field(default="United States", max_length=120)
    language: str = Field(default="English", max_length=60)


class KeywordCandidate(BaseModel):
    keyword: str
    volume: int
    kd: float
    geo_score: float
    semantic_relevance: float
    opportunity_score: float


class AnalyzeResponse(BaseModel):
    entity: str
    action: str
    best_target_keyword: str
    top_candidates: List[KeywordCandidate]


class QuestionCandidate(BaseModel):
    question: str
    volume: int
    kd: float
    geo_score: float
    opportunity_score: float


class AnalyzeQuestionResponse(BaseModel):
    entity: str
    action: str
    winning_question: str
    answer_snippet: str
    runner_up_questions: List[QuestionCandidate]


@dataclass
class ABExtraction:
    entity: str
    action: str


ACTION_BLACKLIST = {
    "is",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "can",
    "could",
    "should",
    "would",
    "will",
    "do",
    "does",
    "did",
    "be",
}


app = FastAPI(
    title="abcGEO Tools API",
    description="A+B=GEO keyword and Answer-First question recommendation engines.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _fallback_extract_ab(text: str) -> ABExtraction:
    lowered = re.sub(r"\s+", " ", text.strip())
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\-]+", lowered)
    if not tokens:
        return ABExtraction(entity="topic", action="optimize")

    # Rough noun phrase candidate: first 2-4 words.
    entity = " ".join(tokens[: min(4, len(tokens))]).lower()
    action = "optimize"
    for t in tokens:
        tl = t.lower()
        if tl.endswith(("ing", "ize", "ise", "build", "improve")) and tl not in ACTION_BLACKLIST:
            action = tl
            break
    return ABExtraction(entity=entity, action=action)


def _extract_ab_with_gemini(text: str) -> Optional[ABExtraction]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""
You are an SEO linguistics parser.
From the content below, extract:
1) entity: the primary subject/noun phrase (A)
2) action: the transitive verb that captures user intent (B)

Return strict JSON only in this shape:
{{"entity":"...","action":"..."}}

Content:
\"\"\"{text}\"\"\"
"""
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        # Lightweight cleanup for wrapped markdown blocks.
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        payload = json.loads(cleaned)

    entity = str(payload.get("entity", "")).strip().lower()
    action = str(payload.get("action", "")).strip().lower()
    if not entity or not action:
        return None
    return ABExtraction(entity=entity, action=action)


def extract_ab(text: str) -> ABExtraction:
    return _extract_ab_with_gemini(text) or _fallback_extract_ab(text)


def make_mock_candidates(entity: str, action: str) -> List[dict]:
    # Mock metric source for scaffold phase; replace with real keyword provider later.
    templates = [
        f"how to {action} {entity} for beginners",
        f"best way to {action} {entity} in 2026",
        f"{entity} tips to {action} faster",
        f"{action} {entity} checklist for teams",
        f"{entity} strategy to {action} with ai",
        f"{action} {entity} without expensive tools",
        f"{entity} examples to {action} correctly",
        f"step by step guide to {action} {entity}",
    ]
    random.seed(f"{entity}:{action}")
    random.shuffle(templates)
    output = []
    for kw in templates[:5]:
        output.append(
            {
                "keyword": kw,
                "volume": random.randint(300, 8200),
                "kd": round(random.uniform(18.0, 78.0), 1),
            }
        )
    return output


def normalize(value: float, min_value: float, max_value: float) -> float:
    if max_value <= min_value:
        return 0.0
    return (value - min_value) / (max_value - min_value)


def semantic_relevance(keyword: str, entity: str, action: str) -> float:
    kw = keyword.lower()
    has_entity = entity in kw
    has_action = action in kw
    adjacency_bonus = 1.0 if f"{action} {entity}" in kw or f"{entity} {action}" in kw else 0.0
    base = 0.2
    if has_entity:
        base += 0.35
    if has_action:
        base += 0.35
    base += 0.1 * adjacency_bonus
    return round(min(base, 1.0), 3)


def geo_score_for_keyword(keyword: str, entity: str, action: str) -> float:
    sem = semantic_relevance(keyword, entity, action)
    # GEO preference for explicit intent modifiers and direct utility language.
    intent_tokens = ("how to", "guide", "checklist", "examples", "strategy", "best way")
    utility_bonus = 0.1 if any(token in keyword.lower() for token in intent_tokens) else 0.0
    return round(min(1.0, sem + utility_bonus), 3)


def score_candidates(raw_candidates: List[dict], entity: str, action: str) -> List[KeywordCandidate]:
    volumes = [c["volume"] for c in raw_candidates]
    min_v, max_v = min(volumes), max(volumes)
    scored: List[KeywordCandidate] = []

    for c in raw_candidates:
        volume_score = normalize(c["volume"], min_v, max_v)
        kd_penalty = c["kd"] / 100.0
        sem = semantic_relevance(c["keyword"], entity, action)
        geo = geo_score_for_keyword(c["keyword"], entity, action)

        # Final opportunity score:
        # maximize GEO/semantic quality, reward volume, penalize high KD.
        opportunity = (geo * 0.45) + (sem * 0.25) + (volume_score * 0.25) - (kd_penalty * 0.2)
        scored.append(
            KeywordCandidate(
                keyword=c["keyword"],
                volume=c["volume"],
                kd=c["kd"],
                geo_score=round(geo, 3),
                semantic_relevance=round(sem, 3),
                opportunity_score=round(opportunity, 3),
            )
        )

    return sorted(scored, key=lambda k: k.opportunity_score, reverse=True)


DFS_BASE_URL = "https://api.dataforseo.com/v3"
US_LOCATION_CODE = 2840
QUESTION_FILTERS = [
    ["keyword", "like", "%how%"],
    "or",
    ["keyword", "like", "%what%"],
    "or",
    ["keyword", "like", "%why%"],
]


def _basic_auth_header(login: str, password: str) -> str:
    token = base64.b64encode(f"{login}:{password}".encode()).decode()
    return f"Basic {token}"


def geo_score_for_question(question: str, entity: str, action: str) -> float:
    sem = semantic_relevance(question, entity, action)
    q = question.lower().strip()
    question_bonus = 0.1 if re.match(r"^(how|what|why|when|where|who|which)\b", q) else 0.0
    return round(min(1.0, sem + question_bonus), 3)


def make_mock_question_candidates(entity: str, action: str) -> List[dict]:
    templates = [
        f"how to {action} {entity}",
        f"what is the best way to {action} {entity}",
        f"why should you {action} {entity}",
        f"how does {action} work for {entity}",
        f"what are {entity} tips to {action} faster",
        f"why is {action} important for {entity}",
        f"how can teams {action} {entity} in 2026",
        f"what is {entity} and how do you {action} it",
    ]
    random.seed(f"questions:{entity}:{action}")
    random.shuffle(templates)
    output = []
    for question in templates[:8]:
        output.append(
            {
                "keyword": question,
                "volume": random.randint(200, 6400),
                "kd": round(random.uniform(12.0, 72.0), 1),
            }
        )
    return output


def _parse_keyword_suggestions(data: dict) -> List[dict]:
    tasks = data.get("tasks") or []
    if not tasks:
        return []
    task = tasks[0]
    if task.get("status_code") not in (None, 20000):
        return []

    parsed: List[dict] = []
    for result in task.get("result") or []:
        for item in result.get("items") or []:
            keyword = str(item.get("keyword") or "").strip()
            if not keyword:
                continue
            keyword_info = item.get("keyword_info") or {}
            keyword_props = item.get("keyword_properties") or {}
            volume = int(keyword_info.get("search_volume") or 0)
            kd = float(keyword_props.get("keyword_difficulty") or 50)
            parsed.append({"keyword": keyword, "volume": volume, "kd": kd})
    return parsed


def fetch_question_candidates(entity: str, action: str) -> List[dict]:
    login = os.getenv("DATAFORSEO_LOGIN", "").strip()
    password = os.getenv("DATAFORSEO_PASSWORD", "").strip()
    seed = f"{action} {entity}".strip()
    if not login or not password:
        return make_mock_question_candidates(entity, action)

    payload = [
        {
            "keyword": seed,
            "location_code": US_LOCATION_CODE,
            "language_code": "en",
            "include_seed_keyword": False,
            "limit": 50,
            "filters": QUESTION_FILTERS,
        }
    ]

    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(
                f"{DFS_BASE_URL}/dataforseo_labs/google/keyword_suggestions/live",
                headers={
                    "Authorization": _basic_auth_header(login, password),
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return make_mock_question_candidates(entity, action)

    if data.get("status_code") not in (None, 20000):
        return make_mock_question_candidates(entity, action)

    candidates = _parse_keyword_suggestions(data)
    return candidates or make_mock_question_candidates(entity, action)


def score_question_candidates(raw_candidates: List[dict], entity: str, action: str) -> List[QuestionCandidate]:
    if not raw_candidates:
        return []

    volumes = [c["volume"] for c in raw_candidates]
    min_v, max_v = min(volumes), max(volumes)
    scored: List[QuestionCandidate] = []

    for c in raw_candidates:
        volume_score = normalize(c["volume"], min_v, max_v)
        kd_penalty = c["kd"] / 100.0
        geo = geo_score_for_question(c["keyword"], entity, action)
        opportunity = (geo * 0.45) + (volume_score * 0.35) - (kd_penalty * 0.2)
        scored.append(
            QuestionCandidate(
                question=c["keyword"],
                volume=c["volume"],
                kd=c["kd"],
                geo_score=geo,
                opportunity_score=round(opportunity, 3),
            )
        )

    return sorted(scored, key=lambda q: q.opportunity_score, reverse=True)


def _generate_snippet_with_gemini(question: str, drafted_text: str) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""
You are an Answer-First content editor for AI search and featured snippets.

Write a concise 2-to-3 sentence answer that directly answers the target question.
Use ONLY facts and phrasing supported by the user's draft. Do not invent details.

Return strict JSON only:
{{"answer_snippet":"..."}}

Target question:
\"\"\"{question}\"\"\"

User draft:
\"\"\"{drafted_text}\"\"\"
"""
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        payload = json.loads(cleaned)

    snippet = str(payload.get("answer_snippet", "")).strip()
    return snippet or None


def _fallback_answer_snippet(question: str, drafted_text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", drafted_text.strip())
    lead = " ".join(sentences[:2]).strip()
    if not lead:
        lead = drafted_text.strip()[:280]
    return f"{lead} This directly addresses: {question}"


def generate_answer_snippet(question: str, drafted_text: str) -> str:
    return _generate_snippet_with_gemini(question, drafted_text) or _fallback_answer_snippet(
        question, drafted_text
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    drafted_text = payload.drafted_text.strip()
    if len(drafted_text) < 50:
        raise HTTPException(status_code=400, detail="drafted_text must be at least 50 characters.")

    extracted = extract_ab(drafted_text)
    candidates_raw = make_mock_candidates(extracted.entity, extracted.action)
    candidates = score_candidates(candidates_raw, extracted.entity, extracted.action)
    if not candidates:
        raise HTTPException(status_code=500, detail="No candidates generated.")

    return AnalyzeResponse(
        entity=extracted.entity,
        action=extracted.action,
        best_target_keyword=candidates[0].keyword,
        top_candidates=candidates[:5],
    )


@app.post("/analyze-question", response_model=AnalyzeQuestionResponse)
def analyze_question(payload: AnalyzeRequest) -> AnalyzeQuestionResponse:
    drafted_text = payload.drafted_text.strip()
    if len(drafted_text) < 50:
        raise HTTPException(status_code=400, detail="drafted_text must be at least 50 characters.")

    extracted = extract_ab(drafted_text)
    raw_candidates = fetch_question_candidates(extracted.entity, extracted.action)
    scored = score_question_candidates(raw_candidates, extracted.entity, extracted.action)
    if not scored:
        raise HTTPException(status_code=500, detail="No question candidates generated.")

    winner = scored[0]
    snippet = generate_answer_snippet(winner.question, drafted_text)
    runner_ups = scored[1:5]

    return AnalyzeQuestionResponse(
        entity=extracted.entity,
        action=extracted.action,
        winning_question=winner.question,
        answer_snippet=snippet,
        runner_up_questions=runner_ups,
    )
