// api/session.js — Upstash Redis via REST (sem dependências externas)

const KV_URL   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const TTL = 600;

async function redisGet(key) {
  if (!KV_URL || !KV_TOKEN) throw new Error('Redis não configurado. Adicione Upstash no Vercel → Storage.');
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const json = await res.json();
  if (json.result === null || json.result === undefined) return null;
  try { return JSON.parse(json.result); } catch { return json.result; }
}

async function redisSet(key, value) {
  if (!KV_URL || !KV_TOKEN) throw new Error('Redis não configurado. Adicione Upstash no Vercel → Storage.');
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?ex=${TTL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error('Redis set failed: ' + res.status + ' ' + await res.text());
}

async function redisDel(key) {
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
  const key = 'sess_' + sessionId;

  // POST: tablet salva token / celular salva itemId+status
  if (req.method === 'POST') {
    const { token, itemId, status } = req.body || {};
    try {
      const existing = await redisGet(key).catch(() => null) || {};
      const updated = {
        ...existing,
        ...(token  && { token  }),
        ...(itemId && { itemId }),
        ...(status && { status }),
        updatedAt: new Date().toISOString(),
      };
      await redisSet(key, updated);
      return res.status(200).json({ saved: true });
    } catch(err) {
      console.error('[session POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: ?getToken=1 → celular busca token | padrão → tablet faz polling
  if (req.method === 'GET') {
    try {
      const data = await redisGet(key);
      if (req.query.getToken === '1') {
        return res.status(200).json(data || { token: null });
      }
      if (!data) return res.status(200).json({ itemId: null, status: null });
      const { token: _omit, ...rest } = data;
      return res.status(200).json(rest);
    } catch(err) {
      console.error('[session GET]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE: cleanup
  if (req.method === 'DELETE') {
    await redisDel(key);
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
