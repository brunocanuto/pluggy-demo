// Receptor de webhooks da Pluggy
// POST /api/webhook  — recebe eventos da Pluggy
// GET  /api/webhook  — retorna eventos armazenados (para o frontend)

// Armazenamento em memória — persiste enquanto a função está "quente"
// Suficiente para demos e eventos ao vivo
const events = [];
const MAX_EVENTS = 100;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pluggy-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: Pluggy envia evento aqui ──
  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        receivedAt: new Date().toISOString(),
        event: payload.event || 'unknown',
        paymentRequestId: payload.paymentRequestId || null,
        paymentIntentId: payload.paymentIntentId || null,
        scheduledPaymentId: payload.scheduledPaymentId || null,
        itemId: payload.itemId || null,
        preauthorizationId: payload.preauthorizationId || null,
        paymentId: payload.paymentId || null,
        error: payload.error || null,
        raw: payload,
      };

      // Insere no início e limita tamanho
      events.unshift(event);
      if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);

      console.log(`[webhook] ${event.event} recebido — ${event.receivedAt}`);
      return res.status(200).json({ received: true, id: event.id });
    } catch (err) {
      console.error('[webhook] erro ao processar:', err);
      return res.status(200).json({ received: true }); // sempre 200 para Pluggy não retentar
    }
  }

  // ── GET: frontend busca eventos armazenados ──
  if (req.method === 'GET') {
    const since = req.query.since ? parseInt(req.query.since) : 0;
    const filtered = since
      ? events.filter(e => new Date(e.receivedAt).getTime() > since)
      : events;
    return res.status(200).json({ events: filtered, total: events.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
