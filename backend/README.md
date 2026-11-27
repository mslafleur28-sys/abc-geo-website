# abcGEO Tools API

FastAPI backend for the A+B=GEO keyword recommendation engine, Answer-First Question Recommender, and Topical Authority Map Generator.

## Endpoints

- `GET /health`
- `POST /analyze` — SEO Keyword Recommender
- `POST /analyze-question` — Answer-First Question Recommender
- `POST /api/generate-topical-map` — Topical Authority Map Generator

### SEO Keyword Recommender

Example request:

```json
{
  "drafted_text": "Your drafted paragraph goes here...",
  "market": "United States",
  "language": "English"
}
```

Response includes:

- `best_target_keyword`
- `top_candidates` (top 5 with `volume`, `kd`, `geo_score`, and `opportunity_score`)
- extracted `entity` (A) and `action` (B)

### Answer-First Question Recommender

Example request:

```json
{
  "drafted_text": "Your drafted paragraph goes here...",
  "market": "United States",
  "language": "English"
}
```

Response includes:

- `winning_question` — best market question to lead the article
- `answer_snippet` — 2–3 sentence Answer-First snippet from the draft
- `runner_up_questions` — up to 4 alternatives with `volume`, `kd`, and `geo_score`
- extracted `entity` (A) and `action` (B)

### Topical Authority Map Generator

Example request:

```json
{
  "topic": "Generative Engine Optimization",
  "audience": "SEO leads and content strategists"
}
```

Response includes:

- `root_topic` — Core Pillar Topic (Entity A)
- `clusters` (6–10) each with `name`, `transitive_verb_relation`, and 5–8 `subtopics`
- Each subtopic: `title`, `entity_verb_pair`, `core_question`, `search_intent`, `content_type`, `priority_score`
- Optional nullable enrichment fields: `search_volume`, `keyword_difficulty`
- `cached` / `source` metadata (`gemini` or `fallback`)

Guardrails:

- In-memory cache keyed by normalized topic + audience
- Rate limit: 8 generations per hour per IP (cached hits do not consume quota)

## Local Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Set `GEMINI_API_KEY` to enable LLM extraction for A (Entity) and B (Action), Answer-First snippet generation, and structured topical maps via `google-genai` (`gemini-2.5-flash`):

```bash
export GEMINI_API_KEY="your-key"
```

Set DataForSEO credentials for live question keyword data:

```bash
export DATAFORSEO_LOGIN="your-login"
export DATAFORSEO_PASSWORD="your-password"
```

Without API keys, the service falls back to heuristic extraction, mock question candidates, and a deterministic topical map.
