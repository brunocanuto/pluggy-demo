// Receptor de webhooks da Pluggy
// POST /api/webhook  — Pluggy envia eventos aqui
// GET  /api/webhook  — frontend busca eventos
// DELETE /api/webhook — limpa eventos

const { kv } = require('@vercel/kv');

const MAX_EVENTS = 100;
const KV_KEY = 'pluggy_webhook_events';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pluggy-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: Pluggy envia evento ──
  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

      // Lê lista atual → prepend → limita → salva
      let events = [];
      try { events = (await kv.get(KV_KEY)) || []; } catch {}
      events.unshift(event);
      if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
      await kv.set(KV_KEY, events);

      console.log(`[webhook] ${event.event} — ${event.receivedAt}`);
      return res.status(200).json({ received: true, id: event.id });
    } catch (err) {
      console.error('[webhook] erro:', err);
      return res.status(200).json({ received: true }); // sempre 200 — Pluggy não retenta
    }
  }

  // ── GET: frontend busca eventos ──
  if (req.method === 'GET') {
    try {
      const events = (await kv.get(KV_KEY)) || [];
      const since = req.query.since ? parseInt(req.query.since) : 0;
      const filtered = since
        ? events.filter(e => new Date(e.receivedAt).getTime() > since)
        : events;
      return res.status(200).json({ events: filtered, total: events.length });
    } catch (err) {
      return res.status(200).json({ events: [], total: 0, error: String(err.message) });
    }
  }

  // ── DELETE: limpar todos os eventos ──
  if (req.method === 'DELETE') {
    try {
      await kv.set(KV_KEY, []);
      return res.status(200).json({ cleared: true });
    } catch (err) {
      return res.status(500).json({ error: String(err.message) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

