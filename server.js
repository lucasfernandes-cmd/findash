const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 5500;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain', '.xml': 'application/xml'
};

// ── Security Headers ─────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "font-src https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "form-action 'self'",
  "base-uri 'self'"
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off'
};

// ── Gzip helper ──────────────────────────────────────────────
const COMPRESSIBLE = new Set(['text/html', 'text/css', 'application/javascript', 'application/json']);

function sendWithGzip(req, res, statusCode, headers, body) {
  const contentType = headers['Content-Type'] || '';
  const baseType = contentType.split(';')[0];
  const acceptGzip = (req.headers['accept-encoding'] || '').includes('gzip');

  if (acceptGzip && COMPRESSIBLE.has(baseType) && body.length > 256) {
    zlib.gzip(body, (err, compressed) => {
      if (err) {
        res.writeHead(statusCode, headers);
        res.end(body);
      } else {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(statusCode, headers);
        res.end(compressed);
      }
    });
  } else {
    res.writeHead(statusCode, headers);
    res.end(body);
  }
}

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
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      proxyRes.pipe(res);
    } else {
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
  // API proxy routes (POST only)
  if (req.method === 'POST' && (req.url === '/api/gemini/generate' || req.url === '/api/gemini/stream')) {
    handleGeminiProxy(req, res);
    return;
  }

  // Only serve GET requests for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  // Resolve file path
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    // SPA fallback: unknown routes serve index.html
    if (err) {
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, (err2, indexData) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        const headers = {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
          ...SECURITY_HEADERS
        };
        sendWithGzip(req, res, 200, headers, indexData);
      });
      return;
    }

    // Build response headers
    const contentType = MIME[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType, ...SECURITY_HEADERS };

    // Cache policy per file type
    const basename = path.basename(filePath);
    if (basename === 'sw.js') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Service-Worker-Allowed'] = '/';
    } else if (ext === '.css' || ext === '.js') {
      headers['Cache-Control'] = 'public, max-age=604800, no-transform'; // 7 days
    } else if (ext === '.png' || ext === '.ico' || ext === '.svg') {
      headers['Cache-Control'] = 'public, max-age=2592000'; // 30 days
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    sendWithGzip(req, res, 200, headers, data);
  });
}).listen(PORT, () => console.log(`FinDash running on port ${PORT}`));
