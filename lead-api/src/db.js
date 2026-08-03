'use strict';
// SQLite nativo do Node — sem módulo compilado, sem node-gyp.
// A API ainda é marcada experimental: este é o único arquivo que a toca,
// de propósito. Ao subir o major do Node, revisar só aqui.
const { DatabaseSync } = require('node:sqlite');

const STATUS_VALIDOS = ['novo', 'atendido', 'fechado'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT NOT NULL,
  nome          TEXT NOT NULL,
  telefone      TEXT NOT NULL,
  telefone_e164 TEXT NOT NULL,
  area          TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  consentimento INTEGER NOT NULL,
  pagina_origem TEXT,
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_content   TEXT,
  utm_term      TEXT,
  fbclid        TEXT,
  fbp           TEXT,
  fbc           TEXT,
  ip            TEXT,
  user_agent    TEXT,
  event_id      TEXT,
  capi_status   TEXT,
  status        TEXT NOT NULL DEFAULT 'novo'
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_area    ON leads(area);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ip      ON leads(ip, created_at);
`;

const CAMPOS = [
  'nome', 'telefone', 'telefone_e164', 'area', 'descricao', 'consentimento',
  'pagina_origem', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'fbclid', 'fbp', 'fbc', 'ip', 'user_agent',
  'event_id',
];

function abrirBanco(caminho) {
  const sqlite = new DatabaseSync(caminho);
  // WAL deixa a leitura do painel não travar a gravação de um lead novo.
  // Em :memory: o SQLite ignora, e tudo bem.
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec(SCHEMA);

  const stmtInserir = sqlite.prepare(
    `INSERT INTO leads (created_at, ${CAMPOS.join(', ')})
     VALUES (${new Array(CAMPOS.length + 1).fill('?').join(', ')})`
  );
  const stmtStatus = sqlite.prepare('UPDATE leads SET status = ? WHERE id = ?');
  const stmtCapi = sqlite.prepare('UPDATE leads SET capi_status = ? WHERE id = ?');
  const stmtContarIp = sqlite.prepare(
    'SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND created_at >= ?'
  );

  return {
    inserirLead(lead) {
      const valores = [new Date().toISOString()];
      for (const campo of CAMPOS) {
        const v = lead[campo];
        valores.push(v === undefined ? null : v);
      }
      const r = stmtInserir.run(...valores);
      return { id: Number(r.lastInsertRowid) };
    },

    listarLeads({ q, area, status } = {}) {
      let sql = 'SELECT * FROM leads WHERE 1=1';
      const params = [];
      if (area) { sql += ' AND area = ?'; params.push(area); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (q) {
        // O lower() do SQLite só é insensível a caixa em ASCII, então o termo
        // chega daqui já em minúsculas — é o que faz "joão" achar "João".
        sql += ' AND (lower(nome) LIKE ? OR telefone LIKE ? OR telefone_e164 LIKE ?'
             + ' OR lower(descricao) LIKE ? OR lower(area) LIKE ?)';
        const alvo = `%${String(q).toLowerCase()}%`;
        params.push(alvo, alvo, alvo, alvo, alvo);
      }
      sql += ' ORDER BY id DESC LIMIT 1000';
      return sqlite.prepare(sql).all(...params);
    },

    atualizarStatus(id, status) {
      if (!STATUS_VALIDOS.includes(status)) {
        throw new Error(`status inválido: ${status}`);
      }
      return stmtStatus.run(status, id).changes > 0;
    },

    marcarCapi(id, capiStatus) {
      stmtCapi.run(String(capiStatus).slice(0, 200), id);
    },

    contarPorIp(ip, desdeIso) {
      return Number(stmtContarIp.get(ip, desdeIso).n);
    },

    fechar() { sqlite.close(); },
  };
}

module.exports = { abrirBanco, STATUS_VALIDOS };
