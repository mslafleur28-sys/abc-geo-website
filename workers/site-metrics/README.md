# Collaboration quote API

Looks up DataForSEO domain rank + US organic traffic (`etv`) and returns a suggested guest-post / niche-edit quote.

`GET /api/collaboration-quote?domain=example.com`

Credentials stay in `.env` (local Express) or Worker secrets (production). Never expose them in page JavaScript.

## Local Express API

From the repo root:

1. Copy `.env.example` to `.env` and set:
   - `DATAFORSEO_LOGIN` — your DataForSEO account email
   - `DATAFORSEO_PASSWORD` — API password from https://app.dataforseo.com/api-access
2. `npm install`
3. `npm run api`

Then open http://127.0.0.1:8788/link-building.html#pricing-calculator

The Node server serves both `/api/collaboration-quote` and the static site.

## Production (Cloudflare Worker)

1. Proxy `abcgeo.dev` through Cloudflare DNS.
2. From `workers/site-metrics`:

```bash
npx wrangler secret put DATAFORSEO_LOGIN
npx wrangler secret put DATAFORSEO_PASSWORD
npx wrangler deploy
```

Worker routes: `/api/collaboration-quote` and `/api/site-metrics`.
