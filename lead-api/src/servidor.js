'use strict';
const express = require('express');

function criarServidor(config, db) {
  const app = express();
  app.disable('x-powered-by');
  // O Coolify põe um proxy na frente; sem isso todo IP vira o do proxy e o
  // rate limit passa a valer para o mundo inteiro de uma vez só.
  app.set('trust proxy', 1);

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  return app;
}

module.exports = { criarServidor };
