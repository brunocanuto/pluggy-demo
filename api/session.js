// api/session.js
// POST /api/session  — phone saves itemId after successful connection
// GET  /api/session?sessionId=X  — tablet polls for itemId
// DELETE /api/session?sessionId=X  — cleanup

import { kv } from '@vercel/kv';

const TTL = 600; // 10 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sessionId = req.query.sessionId || req.body?.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const key = `pluggy_session_${sessionId}`;

  if (req.method === 'POST') {
    const { itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: 'itemId required' });
    await kv.set(key, { itemId, completedAt: new Date().toISOString() }, { ex: TTL });
    return res.status(200).json({ saved: true });
  }

  if (req.method === 'GET') {
    try {
      const data = await kv.get(key);
      return res.status(200).json(data || { itemId: null });
    } catch {
      return res.status(200).json({ itemId: null });
    }
  }

  if (req.method === 'DELETE') {
    await kv.del(key);
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
