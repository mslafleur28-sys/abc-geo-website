# abcGEO Tools API

FastAPI backend for the A+B=GEO keyword recommendation engine and Answer-First Question Recommender.

## Endpoints

- `GET /health`
- `POST /analyze` — SEO Keyword Recommender
- `POST /analyze-question` — Answer-First Question Recommender

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

## Local Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Set `GEMINI_API_KEY` to enable LLM extraction for A (Entity) and B (Action), plus Answer-First snippet generation:

```bash
export GEMINI_API_KEY="your-key"
```

Set DataForSEO credentials for live question keyword data:

```bash
export DATAFORSEO_LOGIN="your-login"
export DATAFORSEO_PASSWORD="your-password"
```

Without API keys, the service falls back to heuristic extraction and mock question candidates.
