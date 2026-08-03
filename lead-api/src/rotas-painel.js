'use strict';
const express = require('express');
const { AREAS } = require('./validacao');
const { STATUS_VALIDOS } = require('./db');
const { criarLimite } = require('./limite');
const { paginaLogin, paginaPainel } = require('./painel-html');
const {
  COOKIE_NOME, VALIDADE_MS, conferirSenha, assinarSessao, verificarSessao, lerCookie,
} = require('./sessao');

const COLUNAS_CSV = [
  'id', 'created_at', 'nome', 'telefone', 'telefone_e164', 'area', 'descricao',
  'status', 'pagina_origem', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign',
  'fbclid', 'capi_status',
];

// Excel e Google Sheets executam célula que começa com = + - @. Um lead pode
// digitar isso no formulário; sem o apóstrofo vira execução na máquina do Alisson.
function celulaCsv(valor) {
  let s = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.split('"').join('""')}"`;
}

function criarRotasPainel({ config, db }) {
  const router = express.Router();
  const limiteLogin = criarLimite({ max: 5, janelaMs: 15 * 60 * 1000 });

  // O painel serve dado pessoal de cliente: nunca em cache, nunca indexado.
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; "
      + "connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    );
    next();
  });

  function autenticado(req) {
    const bruto = lerCookie(req.headers.cookie, COOKIE_NOME);
    return verificarSessao(config.sessaoSegredo, bruto);
  }

  function exigirSessao(req, res, next) {
    if (!autenticado(req)) return res.status(401).json({ ok: false, erro: 'Sessão expirada.' });
    return next();
  }

  router.get('/', (req, res) => {
    res.type('html');
    res.send(autenticado(req) ? paginaPainel({ areas: AREAS }) : paginaLogin({}));
  });

  router.post('/login', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
    if (!limiteLogin.permitir(req.ip || '')) {
      res.status(429).type('html');
      return res.send(paginaLogin({ erro: true }));
    }
    const senha = req.body && req.body.senha ? String(req.body.senha) : '';
    if (!conferirSenha(senha, config.senhaHash)) {
      res.status(401).type('html');
      return res.send(paginaLogin({ erro: true }));
    }
    res.cookie(COOKIE_NOME, assinarSessao(config.sessaoSegredo), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: VALIDADE_MS,
      path: '/',
    });
    return res.redirect(302, '/');
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NOME, { path: '/' });
    res.redirect(302, '/');
  });

  router.get('/api/panel/leads', exigirSessao, (req, res) => {
    const area = AREAS.includes(req.query.area) ? req.query.area : null;
    const status = STATUS_VALIDOS.includes(req.query.status) ? req.query.status : null;
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : null;
    res.json({ leads: db.listarLeads({ q, area, status }) });
  });

  router.patch('/api/panel/leads/:id', exigirSessao, express.json({ limit: '4kb' }), (req, res) => {
    const id = Number(req.params.id);
    const status = req.body && req.body.status;
    if (!Number.isInteger(id) || !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ ok: false, erro: 'Requisição inválida.' });
    }
    const mudou = db.atualizarStatus(id, status);
    return mudou ? res.json({ ok: true }) : res.status(404).json({ ok: false });
  });

  router.get('/api/panel/export.csv', exigirSessao, (req, res) => {
    const leads = db.listarLeads({});
    const linhas = [COLUNAS_CSV.join(',')];
    for (const l of leads) {
      linhas.push(COLUNAS_CSV.map((c) => celulaCsv(l[c])).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    // BOM: sem ele o Excel no Windows abre "José" como "JosÃ©".
    res.send('﻿' + linhas.join('\r\n'));
  });

  return router;
}

module.exports = { criarRotasPainel };
