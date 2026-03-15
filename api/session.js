// api/session.js — sem dependência de @vercel/kv
// Usa a REST API do Vercel KV diretamente via fetch nativo do Node 18+

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const TTL      = 600; // segundos

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV não configurado — adicione KV_REST_API_URL e KV_REST_API_TOKEN no Vercel');
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value), ex: TTL }),
  });
  if (!res.ok) throw new Error(`KV set failed: ${res.status} ${await res.text()}`);
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV não configurado — adicione KV_REST_API_URL e KV_REST_API_TOKEN no Vercel');
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV get failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvDel(key) {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  }).catch(() => {});
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sessionId = req.query.sessionId || req.body?.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const key = `sess_${sessionId}`;

  if (req.method === 'POST') {
    const { itemId, status } = req.body || {};
    try {
      const existing = await kvGet(key).catch(() => null) || {};
      const updated = {
        ...existing,
        ...(itemId && { itemId }),
        ...(status && { status }),
        updatedAt: new Date().toISOString(),
      };
      await kvSet(key, updated);
      return res.status(200).json({ saved: true, data: updated });
    } catch (err) {
      console.error('[session POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const data = await kvGet(key);
      return res.status(200).json(data || { itemId: null, status: null });
    } catch (err) {
      console.error('[session GET]', err.message);
      return res.status(500).json({ error: err.message, kvConfigured: !!(KV_URL && KV_TOKEN) });
    }
  }

  if (req.method === 'DELETE') {
    await kvDel(key);
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
