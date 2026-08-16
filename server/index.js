import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  lookupCollaborationMetrics,
  normalizeDomain,
  sanitizeError,
} from './lib/dataforseo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8788;

function allowOrigin(origin) {
  if (!origin) return 'https://abcgeo.dev';
  if (origin === 'https://abcgeo.dev' || origin === 'https://www.abcgeo.dev') return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return '';
}

function cors(req, res, next) {
  const origin = allowOrigin(req.headers.origin);
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

function readPayload(req) {
  const src = { ...req.query, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  return {
    domain: normalizeDomain(src.domain || src.url || src.target || ''),
    niche: src.niche || 'general',
    quoted: src.quoted ?? src.quotedPrice ?? src.price ?? '',
  };
}

async function quoteHandler(req, res) {
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    res.status(503).json({
      ok: false,
      error: 'Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env',
    });
    return;
  }

  const { domain, niche, quoted } = readPayload(req);
  if (!domain) {
    res.status(400).json({ ok: false, error: 'Enter a valid domain or URL.' });
    return;
  }

  try {
    const metrics = await lookupCollaborationMetrics(domain, process.env, {
      niche,
      quoted: quoted === '' ? null : quoted,
    });
    res.json({ ok: true, cached: false, ...metrics });
  } catch (err) {
    res.status(502).json({ ok: false, error: sanitizeError(err), domain });
  }
}

const app = express();
app.disable('x-powered-by');
app.use(cors);
app.use(express.json({ limit: '32kb' }));

app.get('/api/collaboration-quote', quoteHandler);
app.post('/api/collaboration-quote', quoteHandler);
app.get('/api/site-metrics', quoteHandler);
app.post('/api/site-metrics', quoteHandler);

app.use(express.static(siteRoot));

app.listen(PORT, () => {
  console.log(`abcGEO quote API + site at http://127.0.0.1:${PORT}`);
  console.log('  GET  /api/collaboration-quote?domain=example.com');
  console.log('  POST /api/collaboration-quote  { "domain": "example.com", "niche": "tech" }');
});
