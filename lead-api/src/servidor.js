'use strict';
const express = require('express');
const { criarRotasLead } = require('./rotas-lead');
const { criarClienteCapi } = require('./capi');

function criarServidor(config, db, deps = {}) {
  const app = express();
  app.disable('x-powered-by');
  // O Coolify põe um proxy na frente; sem isso todo IP vira o do proxy e o
  // rate limit passa a valer para o mundo inteiro de uma vez só.
  app.set('trust proxy', 1);

  const capi = deps.capi || criarClienteCapi(config, {});

  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api', criarRotasLead({ config, db, capi }));

  // Corpo malformado ou grande demais vira 400, não stack trace na resposta.
  app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || err.type === 'entity.parse.failed')) {
      return res.status(400).json({ ok: false, erro: 'Requisição inválida.' });
    }
    console.error('erro não tratado:', err && err.message);
    return res.status(500).json({ ok: false, erro: 'Erro interno.' });
  });

  return app;
}

module.exports = { criarServidor };
