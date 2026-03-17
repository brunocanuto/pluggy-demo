// api/webhook.js — Upstash Redis REST API (formato correto)

const KV_URL   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = 'pluggy_webhook_events';
const MAX = 100;

async function redisGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const json = await res.json();
  if (!json.result) return null;
  try { return JSON.parse(json.result); } catch { return null; }
}

async function redisSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return;
  const encoded = encodeURIComponent(JSON.stringify(value));
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pluggy-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const p = req.body || {};
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        receivedAt: new Date().toISOString(),
        event: p.event || 'unknown',
        paymentRequestId:      p.paymentRequestId      || null,
        paymentIntentId:       p.paymentIntentId       || null,
        scheduledPaymentId:    p.scheduledPaymentId    || null,
        automaticPixPaymentId: p.automaticPixPaymentId || null,
        itemId: p.itemId || null,
        error:  p.error  || null,
        raw: p,
      };
      let events = await redisGet(KEY) || [];
      events.unshift(event);
      if (events.length > MAX) events.splice(MAX);
      await redisSet(KEY, events);
      return res.status(200).json({ received: true, id: event.id });
    } catch(err) {
      return res.status(200).json({ received: true });
    }
  }

  if (req.method === 'GET') {
    try {
      const events = await redisGet(KEY) || [];
      const since = req.query.since ? parseInt(req.query.since) : 0;
      const filtered = since ? events.filter(e => new Date(e.receivedAt).getTime() > since) : events;
      return res.status(200).json({ events: filtered, total: events.length });
    } catch(err) {
      return res.status(200).json({ events: [], total: 0 });
    }
  }

  if (req.method === 'DELETE') {
    await redisSet(KEY, []);
    return res.status(200).json({ cleared: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
