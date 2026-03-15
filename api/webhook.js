// api/webhook.js — sem dependência de @vercel/kv
// Usa fetch nativo do Node 18+ para a REST API do KV

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_KEY   = 'pluggy_webhook_events';
const MAX_EVENTS = 100;

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return null; }
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pluggy-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        receivedAt: new Date().toISOString(),
        event: payload.event || 'unknown',
        paymentRequestId:      payload.paymentRequestId      || null,
        paymentIntentId:       payload.paymentIntentId       || null,
        scheduledPaymentId:    payload.scheduledPaymentId    || null,
        automaticPixPaymentId: payload.automaticPixPaymentId || null,
        itemId: payload.itemId || null,
        error:  payload.error  || null,
        raw:    payload,
      };
      let events = await kvGet(KV_KEY) || [];
      events.unshift(event);
      if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
      await kvSet(KV_KEY, events);
      console.log(`[webhook] ${event.event} — ${event.receivedAt}`);
      return res.status(200).json({ received: true, id: event.id });
    } catch (err) {
      console.error('[webhook POST]', err.message);
      return res.status(200).json({ received: true }); // sempre 200
    }
  }

  if (req.method === 'GET') {
    try {
      const events = await kvGet(KV_KEY) || [];
      const since = req.query.since ? parseInt(req.query.since) : 0;
      const filtered = since
        ? events.filter(e => new Date(e.receivedAt).getTime() > since)
        : events;
      return res.status(200).json({ events: filtered, total: events.length });
    } catch (err) {
      return res.status(200).json({ events: [], total: 0, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    await kvSet(KV_KEY, []);
    return res.status(200).json({ cleared: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
