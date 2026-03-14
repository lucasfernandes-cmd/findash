const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// ── Body parser (max 20MB for OCR images) ────────────────────
function readBody(req, maxSize = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ── Gemini API Proxy ─────────────────────────────────────────
function proxyToGemini(endpoint, body, res, isStream) {
  const qs = isStream ? `?alt=sse&key=${GEMINI_API_KEY}` : `?key=${GEMINI_API_KEY}`;
  const url = new URL(`${GEMINI_BASE}:${endpoint}${qs}`);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    if (isStream && proxyRes.statusCode === 200) {
      // SSE streaming — pipe directly
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      proxyRes.pipe(res);
    } else {
      // JSON response (success or error)
      const chunks = [];
      proxyRes.on('data', chunk => chunks.push(chunk));
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(Buffer.concat(chunks).toString());
      });
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Gemini proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
  });

  proxyReq.write(body);
  proxyReq.end();
}

async function handleGeminiProxy(req, res) {
  if (!GEMINI_API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'GEMINI_API_KEY não configurada no servidor.' } }));
    return;
  }
  try {
    const body = await readBody(req);
    const isStream = req.url === '/api/gemini/stream';
    const endpoint = isStream ? 'streamGenerateContent' : 'generateContent';
    proxyToGemini(endpoint, body, res, isStream);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: err.message } }));
  }
}

// ── HTTP Server ──────────────────────────────────────────────
http.createServer((req, res) => {
  // API proxy routes
  if (req.method === 'POST' && (req.url === '/api/gemini/generate' || req.url === '/api/gemini/stream')) {
    handleGeminiProxy(req, res);
    return;
  }

  // Static file serving
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}).listen(PORT, () => console.log(`FinDash running on port ${PORT}`));
