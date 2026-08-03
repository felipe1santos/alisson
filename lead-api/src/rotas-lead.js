'use strict';
const express = require('express');
const { validarLead } = require('./validacao');
const { criarLimite } = require('./limite');

const LIMITE_TEXTO = 500;

function recortar(v, max = LIMITE_TEXTO) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function criarRotasLead({ config, db, capi }) {
  const router = express.Router();
  const limite = criarLimite({ max: 10, janelaMs: 60 * 60 * 1000 });

  function cors(req, res) {
    const origem = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (origem && config.origensPermitidas.includes(origem)) {
      res.setHeader('Access-Control-Allow-Origin', origem);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      return true;
    }
    return false;
  }

  router.options('/leads', (req, res) => {
    cors(req, res);
    res.status(204).end();
  });

  router.post('/leads', express.json({ limit: '32kb' }), (req, res) => {
    cors(req, res);

    const ip = req.ip || '';
    if (!limite.permitir(ip)) {
      return res.status(429).json({ ok: false, erro: 'Muitas tentativas. Tente mais tarde.' });
    }

    const r = validarLead(req.body);
    if (!r.ok) return res.status(400).json({ ok: false, erro: r.erro });

    const lead = {
      ...r.valor,
      pagina_origem: recortar(req.body.pagina_origem),
      referrer: recortar(req.body.referrer),
      utm_source: recortar(req.body.utm_source, 120),
      utm_medium: recortar(req.body.utm_medium, 120),
      utm_campaign: recortar(req.body.utm_campaign, 120),
      utm_content: recortar(req.body.utm_content, 120),
      utm_term: recortar(req.body.utm_term, 120),
      fbclid: recortar(req.body.fbclid, 255),
      fbp: recortar(req.body.fbp, 255),
      fbc: recortar(req.body.fbc, 255),
      ip,
      user_agent: recortar(req.headers['user-agent'], 400),
      event_id: recortar(req.body.event_id, 64),
    };

    const { id } = db.inserirLead(lead);

    // A resposta sai antes da CAPI: o navegador já está indo para o WhatsApp
    // e não pode esperar a Meta responder.
    res.status(201).json({ ok: true });

    const created_at = new Date().toISOString();
    return capi
      .enviarLead({ ...lead, created_at })
      .then((status) => db.marcarCapi(id, status))
      .catch((e) => db.marcarCapi(id, `erro: ${e.message}`.slice(0, 200)));
  });

  return router;
}

module.exports = { criarRotasLead };
