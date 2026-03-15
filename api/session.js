// api/session.js
// POST /api/session  — celular salva itemId após conexão
// GET  /api/session?sessionId=X  — tablet faz polling
// DELETE /api/session?sessionId=X  — cleanup

const { kv } = require('@vercel/kv');

const TTL = 600; // 10 minutos

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sessionId = req.query.sessionId || req.body?.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const key = `pluggy_session_${sessionId}`;

  if (req.method === 'POST') {
    const { itemId, status } = req.body || {};
    if (!itemId && !status) return res.status(400).json({ error: 'itemId or status required' });
    const existing = await kv.get(key).catch(() => null) || {};
    await kv.set(key, {
      ...existing,
      ...(itemId && { itemId }),
      ...(status && { status }),
      updatedAt: new Date().toISOString(),
    }, { ex: TTL });
    return res.status(200).json({ saved: true });
  }

  if (req.method === 'GET') {
    try {
      const data = await kv.get(key);
      return res.status(200).json(data || { itemId: null, status: null });
    } catch {
      return res.status(200).json({ itemId: null, status: null });
    }
  }

  if (req.method === 'DELETE') {
    await kv.del(key).catch(() => {});
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
