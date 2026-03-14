// Pluggy API Proxy — roda no Vercel, guarda as chaves no servidor
// Rota: /api/proxy (aceita {endpoint, method, body, apiKey} no body)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, method = 'GET', body, apiKey } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

  const BASE = 'https://api.pluggy.ai';

  try {
    // ── AUTH: usa as variáveis de ambiente do Vercel ──
    if (endpoint === '/auth') {
      const r = await fetch(`${BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: process.env.PLUGGY_CLIENT_ID,
          clientSecret: process.env.PLUGGY_CLIENT_SECRET,
        }),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ── DEMAIS ENDPOINTS: usa apiKey fornecido pelo frontend ──
    if (!apiKey) return res.status(401).json({ error: 'apiKey ausente' });

    const fetchOpts = {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    };
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      fetchOpts.body = JSON.stringify(body);
    }

    const r = await fetch(`${BASE}${endpoint}`, fetchOpts);
    let data;
    try { data = await r.json(); } catch { data = {}; }
    return res.status(r.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: String(err.message) });
  }
};
