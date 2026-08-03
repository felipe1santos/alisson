# Captura de Leads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar o Meta Pixel no site, capturar leads por formulário antes do redirecionamento ao WhatsApp e servir a lista de leads num painel protegido por senha em `lead.alissonbrandao.com.br`.

**Architecture:** Três peças. O site estático ganha `js/pixel.js` (Pixel + `PageView`) e `js/leads.js` (modal injetado por JS, interceptação dos CTAs por seletor, envio do lead e redirecionamento). Um serviço Node novo em `lead-api/` — mesmo repositório, deploy separado no Coolify — valida e grava o lead em SQLite num volume persistente, dispara a Conversions API com o mesmo `event_id` do Pixel para deduplicação, e serve o painel. Nenhum segredo entra no repositório: tudo por variável de ambiente.

**Tech Stack:** Node 22 LTS, Express 4, better-sqlite3, `node:test`, `node:crypto` (scrypt e HMAC), Docker. No front: JavaScript puro, sem framework, sem build.

## Global Constraints

- Domínio canônico `https://www.alissonbrandao.com.br`. Nunca `alissonbrandao.adv.br`.
- Meta Pixel ID: `2516505455429077`.
- WhatsApp: `5527992291973`.
- Áreas do direito, exatamente estes sete rótulos: `Previdenciário`, `Consumidor`, `Trabalhista`, `Família`, `Cível`, `Criminal`, `Outro`.
- Status de lead, exatamente estes três: `novo`, `atendido`, `fechado`.
- Nenhum segredo em arquivo versionado. `PANEL_PASSWORD_HASH`, `SESSION_SECRET` e `META_CAPI_TOKEN` só existem como variável de ambiente no Coolify.
- Dependências de produção do `lead-api` limitadas a `express` e `better-sqlite3`. CORS, cookies e rate limit são escritos à mão.
- Testes com `node --test`, sem framework de teste externo.
- O site é estático e não tem build. Nada de bundler, nada de transpilação. O JavaScript do site precisa rodar direto no navegador.
- Nenhuma alteração no `noindex` do `privacidade.html` nem na sua ausência do `sitemap.xml`.
- Commits em português, no padrão Conventional Commits já usado no repositório.

## File Structure

**Backend — tudo novo, dentro de `lead-api/`:**

| Arquivo | Responsabilidade |
|---|---|
| `lead-api/package.json` | dependências e scripts |
| `lead-api/Dockerfile` | imagem de produção |
| `lead-api/.dockerignore` | exclui `node_modules` e `test` |
| `lead-api/src/config.js` | lê e valida as variáveis de ambiente, um lugar só |
| `lead-api/src/db.js` | abre o SQLite, cria o schema, expõe as consultas |
| `lead-api/src/validacao.js` | valida o corpo do lead, normaliza telefone para E.164 |
| `lead-api/src/hash.js` | SHA-256 dos dados de usuário da Conversions API |
| `lead-api/src/capi.js` | cliente da Conversions API |
| `lead-api/src/limite.js` | rate limit em memória |
| `lead-api/src/sessao.js` | scrypt e cookie de sessão assinado |
| `lead-api/src/rotas-lead.js` | `POST /api/leads` e o CORS dele |
| `lead-api/src/rotas-painel.js` | login, listagem, status, CSV |
| `lead-api/src/painel-html.js` | HTML do login e do painel |
| `lead-api/src/servidor.js` | monta o Express e junta as rotas |
| `lead-api/src/index.js` | entrada; só sobe o servidor |
| `lead-api/test/*.test.js` | um arquivo de teste por módulo |
| `lead-api/README.md` | passo a passo do Coolify e da Cloudflare |

A divisão é por responsabilidade, não por camada: `validacao.js` é testável sem HTTP, `capi.js` sem banco, `sessao.js` sem Express. Nenhum arquivo passa de ~150 linhas.

**Site estático:**

| Arquivo | Mudança |
|---|---|
| `js/pixel.js` | criar |
| `js/leads.js` | criar |
| `js/main.js` | remover o bloco do modal (linhas 1–21); carrossel e badge de cidade ficam |
| `index.html` | remover o `<div id="whatsappModal">`; o modal passa a ser injetado |
| 36 arquivos `.html` | `<script src="/js/pixel.js"></script>` antes de `</head>` |
| 35 arquivos `.html` | `<script src="/js/leads.js" defer></script>` depois do `main.js` (todos menos `privacidade.html`) |
| 33 arquivos `.html` | atributo `data-area` no `<body>` |
| `css/style.css` | estilos do `<select>` e do checkbox de consentimento |
| `privacidade.html` | seção nova sobre o formulário |

---

### Task 1: Esqueleto do serviço e configuração

**Files:**
- Create: `lead-api/package.json`, `lead-api/.gitignore`, `lead-api/.dockerignore`, `lead-api/Dockerfile`, `lead-api/src/config.js`, `lead-api/src/index.js`, `lead-api/src/servidor.js`
- Test: `lead-api/test/config.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `config.js` exporta `carregarConfig(env)` que devolve `{ porta, dbPath, origensPermitidas, pixelId, capiToken, capiVersao, whatsappNumero, senhaHash, sessaoSegredo }` e lança `Error` se faltar variável obrigatória. `servidor.js` exporta `criarServidor(config, db)` que devolve uma instância Express.

- [ ] **Step 1: Escrever o teste que falha**

`lead-api/test/config.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { carregarConfig } = require('../src/config');

const envValido = {
  PANEL_PASSWORD_HASH: 'scrypt$16384$8$1$c2FsdA$aGFzaA',
  SESSION_SECRET: 'x'.repeat(32),
  META_PIXEL_ID: '2516505455429077',
  META_CAPI_TOKEN: 'token',
  META_API_VERSION: 'v21.0',
  ALLOWED_ORIGINS: 'https://www.alissonbrandao.com.br,https://alissonbrandao.com.br',
  WHATSAPP_NUMBER: '5527992291973',
  DB_PATH: '/data/leads.db',
};

test('carrega a configuração completa', () => {
  const c = carregarConfig(envValido);
  assert.strictEqual(c.pixelId, '2516505455429077');
  assert.deepStrictEqual(c.origensPermitidas, [
    'https://www.alissonbrandao.com.br',
    'https://alissonbrandao.com.br',
  ]);
  assert.strictEqual(c.porta, 3000);
});

test('porta vem do ambiente quando informada', () => {
  const c = carregarConfig({ ...envValido, PORT: '8080' });
  assert.strictEqual(c.porta, 8080);
});

test('falha quando falta variável obrigatória', () => {
  const { SESSION_SECRET, ...semSegredo } = envValido;
  assert.throws(() => carregarConfig(semSegredo), /SESSION_SECRET/);
});

test('falha quando o segredo de sessão é curto demais', () => {
  assert.throws(
    () => carregarConfig({ ...envValido, SESSION_SECRET: 'curto' }),
    /SESSION_SECRET/
  );
});

test('a CAPI é opcional e desliga sem token', () => {
  const { META_CAPI_TOKEN, ...semToken } = envValido;
  const c = carregarConfig(semToken);
  assert.strictEqual(c.capiToken, null);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Rodar: `cd lead-api && node --test test/config.test.js`
Esperado: FAIL, `Cannot find module '../src/config'`

- [ ] **Step 3: Criar o `package.json`**

`lead-api/package.json`:

```json
{
  "name": "lead-api",
  "version": "1.0.0",
  "private": true,
  "description": "Captura de leads e painel de consulta — Alisson Brandão Advocacia",
  "main": "src/index.js",
  "engines": { "node": ">=22" },
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test test/",
    "hash-senha": "node scripts/hash-senha.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "express": "^4.21.0"
  }
}
```

- [ ] **Step 4: Criar `lead-api/.gitignore` e `lead-api/.dockerignore`**

`lead-api/.gitignore`:

```
node_modules/
*.db
*.db-journal
.env
```

`lead-api/.dockerignore`:

```
node_modules
test
*.db
.env
README.md
```

- [ ] **Step 5: Implementar `src/config.js`**

```js
'use strict';

// Uma única porta de entrada para o ambiente. Se uma variável obrigatória
// faltar, o processo morre no boot com mensagem clara — é muito melhor do que
// descobrir em produção que os leads estão sendo gravados num caminho errado.
function obrigatoria(env, nome) {
  const v = env[nome];
  if (!v || !String(v).trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return String(v).trim();
}

function carregarConfig(env) {
  const sessaoSegredo = obrigatoria(env, 'SESSION_SECRET');
  if (sessaoSegredo.length < 32) {
    throw new Error('SESSION_SECRET precisa ter no mínimo 32 caracteres');
  }

  const origens = obrigatoria(env, 'ALLOWED_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    porta: Number(env.PORT || 3000),
    dbPath: obrigatoria(env, 'DB_PATH'),
    origensPermitidas: origens,
    pixelId: obrigatoria(env, 'META_PIXEL_ID'),
    // Sem token a CAPI fica desligada e só o Pixel do navegador reporta.
    // O serviço continua gravando leads normalmente.
    capiToken: env.META_CAPI_TOKEN ? String(env.META_CAPI_TOKEN).trim() : null,
    capiVersao: (env.META_API_VERSION || 'v21.0').trim(),
    whatsappNumero: obrigatoria(env, 'WHATSAPP_NUMBER'),
    senhaHash: obrigatoria(env, 'PANEL_PASSWORD_HASH'),
    sessaoSegredo,
  };
}

module.exports = { carregarConfig };
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Rodar: `cd lead-api && node --test test/config.test.js`
Esperado: PASS, 5 testes

- [ ] **Step 7: Implementar `src/servidor.js` com o healthcheck**

```js
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
```

- [ ] **Step 8: Implementar `src/index.js`**

```js
'use strict';
const { carregarConfig } = require('./config');
const { abrirBanco } = require('./db');
const { criarServidor } = require('./servidor');

const config = carregarConfig(process.env);
const db = abrirBanco(config.dbPath);
const app = criarServidor(config, db);

app.listen(config.porta, () => {
  console.log(`lead-api ouvindo na porta ${config.porta}`);
});
```

Nota: `abrirBanco` chega na Task 2. Até lá o `index.js` não roda — os testes não dependem dele.

- [ ] **Step 9: Criar o `Dockerfile`**

```dockerfile
# better-sqlite3 é um módulo nativo: precisa de compilador no build,
# mas não na imagem final.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
# O volume persistente do Coolify é montado aqui. Sem ele, todo redeploy
# apaga a base de leads.
VOLUME ["/data"]
ENV DB_PATH=/data/leads.db
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
```

- [ ] **Step 10: Commit**

```bash
git add lead-api/package.json lead-api/.gitignore lead-api/.dockerignore lead-api/Dockerfile lead-api/src/config.js lead-api/src/index.js lead-api/src/servidor.js lead-api/test/config.test.js
git commit -m "feat(lead-api): esqueleto do servico, configuracao e Dockerfile"
```

---

### Task 2: Banco de dados e consultas

**Files:**
- Create: `lead-api/src/db.js`
- Test: `lead-api/test/db.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `db.js` exporta `abrirBanco(caminho)`. O objeto devolvido tem `inserirLead(lead)` → `{ id }`, `listarLeads({ q, area, status })` → array, `atualizarStatus(id, status)` → `boolean`, `marcarCapi(id, capiStatus)` → `void`, `contarPorIp(ip, desdeIso)` → `number`, e `fechar()`.

- [ ] **Step 1: Escrever o teste que falha**

`lead-api/test/db.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { abrirBanco } = require('../src/db');

function bancoNaMemoria() {
  return abrirBanco(':memory:');
}

const leadBase = {
  nome: 'Maria Silva',
  telefone: '(27) 99999-1234',
  telefone_e164: '5527999991234',
  area: 'Previdenciário',
  descricao: 'Meu auxílio-doença foi negado na perícia.',
  consentimento: 1,
  pagina_origem: 'https://www.alissonbrandao.com.br/blog/bpc-loas-negado-inss-como-recorrer.html',
  referrer: 'https://www.google.com/',
  utm_source: 'facebook',
  utm_medium: 'cpc',
  utm_campaign: 'previdenciario-es',
  utm_content: null,
  utm_term: null,
  fbclid: 'IwAR123',
  fbp: 'fb.1.1700000000000.123456789',
  fbc: 'fb.1.1700000000000.IwAR123',
  ip: '187.10.10.10',
  user_agent: 'Mozilla/5.0',
  event_id: 'evt-1',
};

test('insere um lead e devolve o id', () => {
  const db = bancoNaMemoria();
  const { id } = db.inserirLead(leadBase);
  assert.ok(id > 0);
  db.fechar();
});

test('o lead nasce com status novo e data preenchida', () => {
  const db = bancoNaMemoria();
  db.inserirLead(leadBase);
  const [lead] = db.listarLeads({});
  assert.strictEqual(lead.status, 'novo');
  assert.match(lead.created_at, /^\d{4}-\d{2}-\d{2}T/);
  db.fechar();
});

test('lista do mais recente para o mais antigo', () => {
  const db = bancoNaMemoria();
  db.inserirLead({ ...leadBase, nome: 'Primeiro' });
  db.inserirLead({ ...leadBase, nome: 'Segundo' });
  const nomes = db.listarLeads({}).map((l) => l.nome);
  assert.deepStrictEqual(nomes, ['Segundo', 'Primeiro']);
  db.fechar();
});

test('filtra por área', () => {
  const db = bancoNaMemoria();
  db.inserirLead({ ...leadBase, area: 'Previdenciário' });
  db.inserirLead({ ...leadBase, area: 'Trabalhista' });
  const r = db.listarLeads({ area: 'Trabalhista' });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].area, 'Trabalhista');
  db.fechar();
});

test('filtra por status', () => {
  const db = bancoNaMemoria();
  const { id } = db.inserirLead(leadBase);
  db.inserirLead(leadBase);
  db.atualizarStatus(id, 'fechado');
  assert.strictEqual(db.listarLeads({ status: 'fechado' }).length, 1);
  assert.strictEqual(db.listarLeads({ status: 'novo' }).length, 1);
  db.fechar();
});

test('busca por nome, telefone ou descrição', () => {
  const db = bancoNaMemoria();
  db.inserirLead({ ...leadBase, nome: 'João Pereira', descricao: 'horas extras' });
  db.inserirLead({ ...leadBase, nome: 'Maria Silva', descricao: 'auxílio negado' });
  assert.strictEqual(db.listarLeads({ q: 'joão' }).length, 1);
  assert.strictEqual(db.listarLeads({ q: 'horas' }).length, 1);
  assert.strictEqual(db.listarLeads({ q: '99999' }).length, 2);
  db.fechar();
});

test('atualizarStatus recusa status desconhecido', () => {
  const db = bancoNaMemoria();
  const { id } = db.inserirLead(leadBase);
  assert.throws(() => db.atualizarStatus(id, 'arquivado'), /status/i);
  db.fechar();
});

test('atualizarStatus devolve false para id inexistente', () => {
  const db = bancoNaMemoria();
  assert.strictEqual(db.atualizarStatus(999, 'atendido'), false);
  db.fechar();
});

test('marcarCapi grava o resultado do envio', () => {
  const db = bancoNaMemoria();
  const { id } = db.inserirLead(leadBase);
  db.marcarCapi(id, 'ok');
  assert.strictEqual(db.listarLeads({})[0].capi_status, 'ok');
  db.fechar();
});

test('contarPorIp conta só o que veio depois do corte', () => {
  const db = bancoNaMemoria();
  db.inserirLead(leadBase);
  db.inserirLead(leadBase);
  const passado = new Date(Date.now() - 3600000).toISOString();
  const futuro = new Date(Date.now() + 3600000).toISOString();
  assert.strictEqual(db.contarPorIp('187.10.10.10', passado), 2);
  assert.strictEqual(db.contarPorIp('187.10.10.10', futuro), 0);
  assert.strictEqual(db.contarPorIp('1.1.1.1', passado), 0);
  db.fechar();
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Rodar: `cd lead-api && npm install && node --test test/db.test.js`
Esperado: FAIL, `Cannot find module '../src/db'`

- [ ] **Step 3: Implementar `src/db.js`**

```js
'use strict';
const Database = require('better-sqlite3');

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
  const sqlite = new Database(caminho);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(SCHEMA);

  const stmtInserir = sqlite.prepare(
    `INSERT INTO leads (created_at, ${CAMPOS.join(', ')})
     VALUES (@created_at, ${CAMPOS.map((c) => '@' + c).join(', ')})`
  );
  const stmtStatus = sqlite.prepare('UPDATE leads SET status = ? WHERE id = ?');
  const stmtCapi = sqlite.prepare('UPDATE leads SET capi_status = ? WHERE id = ?');
  const stmtContarIp = sqlite.prepare(
    'SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND created_at >= ?'
  );

  return {
    inserirLead(lead) {
      const linha = { created_at: new Date().toISOString() };
      for (const campo of CAMPOS) {
        const v = lead[campo];
        linha[campo] = v === undefined ? null : v;
      }
      const r = stmtInserir.run(linha);
      return { id: Number(r.lastInsertRowid) };
    },

    listarLeads({ q, area, status } = {}) {
      let sql = 'SELECT * FROM leads WHERE 1=1';
      const params = [];
      if (area) { sql += ' AND area = ?'; params.push(area); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (q) {
        // LIKE do SQLite só é insensível a caixa em ASCII; o lower() do
        // JavaScript resolve acento e maiúscula antes de chegar aqui.
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
      return stmtContarIp.get(ip, desdeIso).n;
    },

    fechar() { sqlite.close(); },
  };
}

module.exports = { abrirBanco, STATUS_VALIDOS };
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Rodar: `cd lead-api && node --test test/db.test.js`
Esperado: PASS, 10 testes

Se o teste de busca por `'joão'` falhar, o motivo é o `lower()` do SQLite não tratar acento: a busca precisa comparar `lower(nome)` com o termo já em minúsculas vindo do JavaScript, que é o que o código faz. Confira se o termo está sendo passado com `.toLowerCase()`.

- [ ] **Step 5: Commit**

```bash
git add lead-api/src/db.js lead-api/test/db.test.js
git commit -m "feat(lead-api): schema SQLite e consultas de lead"
```

---

### Task 3: Validação, normalização de telefone e hash

**Files:**
- Create: `lead-api/src/validacao.js`, `lead-api/src/hash.js`
- Test: `lead-api/test/validacao.test.js`, `lead-api/test/hash.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `validacao.js` exporta `AREAS` (array dos sete rótulos), `normalizarTelefone(bruto)` → string de dígitos com DDI `55` ou `null`, e `validarLead(corpo)` → `{ ok: true, valor }` ou `{ ok: false, erro }`. `hash.js` exporta `sha256(texto)` → hex, `hashTelefone(e164)`, `hashNome(nomeCompleto)` → `{ fn, ln }`.

- [ ] **Step 1: Escrever os testes que falham**

`lead-api/test/validacao.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { normalizarTelefone, validarLead, AREAS } = require('../src/validacao');

test('normaliza celular com DDD e máscara', () => {
  assert.strictEqual(normalizarTelefone('(27) 99229-1973'), '5527992291973');
});

test('normaliza fixo de 10 dígitos', () => {
  assert.strictEqual(normalizarTelefone('2733334444'), '552733334444');
});

test('aceita número que já vem com o 55', () => {
  assert.strictEqual(normalizarTelefone('+55 27 99229-1973'), '5527992291973');
});

test('recusa telefone curto', () => {
  assert.strictEqual(normalizarTelefone('99229197'), null);
});

test('recusa DDD inexistente', () => {
  assert.strictEqual(normalizarTelefone('(01) 99229-1973'), null);
});

test('recusa celular de 11 dígitos que não começa com 9', () => {
  assert.strictEqual(normalizarTelefone('27 88229-1973'), null);
});

test('recusa entrada vazia ou não textual', () => {
  assert.strictEqual(normalizarTelefone(''), null);
  assert.strictEqual(normalizarTelefone(null), null);
  assert.strictEqual(normalizarTelefone({}), null);
});

const corpoValido = {
  nome: 'Maria Silva',
  telefone: '(27) 99999-1234',
  area: 'Previdenciário',
  descricao: 'Meu auxílio-doença foi negado na perícia médica.',
  consentimento: true,
};

test('aceita corpo válido e normaliza o telefone', () => {
  const r = validarLead(corpoValido);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.valor.telefone_e164, '5527999991234');
  assert.strictEqual(r.valor.consentimento, 1);
});

test('recusa nome com menos de 2 caracteres', () => {
  const r = validarLead({ ...corpoValido, nome: 'A' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /nome/i);
});

test('recusa área fora da lista', () => {
  const r = validarLead({ ...corpoValido, area: 'Tributário' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /área/i);
});

test('recusa sem consentimento', () => {
  const r = validarLead({ ...corpoValido, consentimento: false });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /consentimento/i);
});

test('recusa descrição vazia', () => {
  const r = validarLead({ ...corpoValido, descricao: '   ' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /descri/i);
});

test('corta campos absurdamente longos em vez de aceitar', () => {
  const r = validarLead({ ...corpoValido, descricao: 'x'.repeat(5000) });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /descri/i);
});

test('as sete áreas estão declaradas', () => {
  assert.deepStrictEqual(AREAS, [
    'Previdenciário', 'Consumidor', 'Trabalhista', 'Família',
    'Cível', 'Criminal', 'Outro',
  ]);
});
```

`lead-api/test/hash.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { sha256, hashTelefone, hashNome } = require('../src/hash');

test('sha256 confere com o vetor conhecido', () => {
  assert.strictEqual(
    sha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('hashTelefone usa só os dígitos', () => {
  assert.strictEqual(hashTelefone('5527999991234'), sha256('5527999991234'));
  assert.strictEqual(hashTelefone('+55 (27) 99999-1234'), sha256('5527999991234'));
});

test('hashNome separa primeiro e último nome, sem acento e em minúsculas', () => {
  const r = hashNome('José da Silva Júnior');
  assert.strictEqual(r.fn, sha256('jose'));
  assert.strictEqual(r.ln, sha256('junior'));
});

test('hashNome com nome único repete o valor no sobrenome', () => {
  const r = hashNome('Madonna');
  assert.strictEqual(r.fn, sha256('madonna'));
  assert.strictEqual(r.ln, null);
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Rodar: `cd lead-api && node --test test/validacao.test.js test/hash.test.js`
Esperado: FAIL, `Cannot find module '../src/validacao'`

- [ ] **Step 3: Implementar `src/hash.js`**

```js
'use strict';
const crypto = require('node:crypto');

// A Conversions API exige os dados de usuário em SHA-256, normalizados:
// minúsculas, sem espaço nas pontas e sem acento. Normalização errada não dá
// erro — só derruba silenciosamente a taxa de correspondência do público.
function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function sha256(texto) {
  return crypto.createHash('sha256').update(String(texto), 'utf8').digest('hex');
}

function hashTelefone(bruto) {
  const digitos = String(bruto || '').replace(/\D/g, '');
  return digitos ? sha256(digitos) : null;
}

function hashNome(nomeCompleto) {
  const partes = semAcento(nomeCompleto).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { fn: null, ln: null };
  return {
    fn: sha256(partes[0]),
    ln: partes.length > 1 ? sha256(partes[partes.length - 1]) : null,
  };
}

module.exports = { sha256, hashTelefone, hashNome };
```

Atenção ao `replace`: a classe de caracteres é o intervalo de marcas combinantes Unicode. Se o editor embaralhar os caracteres, escreva `/[̀-ͯ]/g` — é o mesmo intervalo em escape, e é a forma segura de digitar.

- [ ] **Step 4: Implementar `src/validacao.js`**

```js
'use strict';

const AREAS = [
  'Previdenciário', 'Consumidor', 'Trabalhista', 'Família',
  'Cível', 'Criminal', 'Outro',
];

const LIMITES = { nome: 120, telefone: 40, descricao: 2000 };

// Converte qualquer formato brasileiro para dígitos com DDI: 55DDNNNNNNNNN.
// Devolve null quando o número não pode existir — é assim que se barra robô
// que preenche o campo com lixo.
function normalizarTelefone(bruto) {
  if (typeof bruto !== 'string' && typeof bruto !== 'number') return null;
  let n = String(bruto).replace(/\D/g, '');
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) n = n.slice(2);
  if (n.length !== 10 && n.length !== 11) return null;
  const ddd = Number(n.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  // Celular brasileiro tem 11 dígitos e o nono é sempre 9.
  if (n.length === 11 && n[2] !== '9') return null;
  return '55' + n;
}

function texto(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validarLead(corpo) {
  if (!corpo || typeof corpo !== 'object') {
    return { ok: false, erro: 'Corpo da requisição inválido.' };
  }

  const nome = texto(corpo.nome);
  if (nome.length < 2) return { ok: false, erro: 'Informe o nome.' };
  if (nome.length > LIMITES.nome) return { ok: false, erro: 'Nome longo demais.' };

  const telefoneBruto = texto(corpo.telefone);
  if (telefoneBruto.length > LIMITES.telefone) {
    return { ok: false, erro: 'Telefone inválido.' };
  }
  const e164 = normalizarTelefone(telefoneBruto);
  if (!e164) return { ok: false, erro: 'Telefone inválido.' };

  const area = texto(corpo.area);
  if (!AREAS.includes(area)) return { ok: false, erro: 'Área do direito inválida.' };

  const descricao = texto(corpo.descricao);
  if (descricao.length < 3) return { ok: false, erro: 'Escreva a descrição do caso.' };
  if (descricao.length > LIMITES.descricao) {
    return { ok: false, erro: 'Descrição longa demais.' };
  }

  // O consentimento é a base legal do tratamento (LGPD art. 7º, I).
  // Sem ele o lead não pode ser gravado, ponto.
  if (corpo.consentimento !== true && corpo.consentimento !== 1) {
    return { ok: false, erro: 'É necessário aceitar a política de privacidade.' };
  }

  return {
    ok: true,
    valor: { nome, telefone: telefoneBruto, telefone_e164: e164, area, descricao, consentimento: 1 },
  };
}

module.exports = { AREAS, LIMITES, normalizarTelefone, validarLead };
```

- [ ] **Step 5: Rodar e confirmar que passam**

Rodar: `cd lead-api && node --test test/validacao.test.js test/hash.test.js`
Esperado: PASS, 18 testes

- [ ] **Step 6: Commit**

```bash
git add lead-api/src/validacao.js lead-api/src/hash.js lead-api/test/validacao.test.js lead-api/test/hash.test.js
git commit -m "feat(lead-api): validacao do lead, normalizacao de telefone e hash da CAPI"
```

---

### Task 4: Cliente da Conversions API

**Files:**
- Create: `lead-api/src/capi.js`
- Test: `lead-api/test/capi.test.js`

**Interfaces:**
- Consumes: `hash.js` (`hashTelefone`, `hashNome`)
- Produces: `capi.js` exporta `montarEvento(lead)` → objeto do evento, e `criarClienteCapi(config, { fetch })` → `{ enviarLead(lead) }` que resolve para `'ok'`, `'desligado'` ou `'erro: <motivo>'`. Nunca rejeita.

- [ ] **Step 1: Escrever o teste que falha**

`lead-api/test/capi.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { montarEvento, criarClienteCapi } = require('../src/capi');
const { sha256 } = require('../src/hash');

const lead = {
  nome: 'Maria Silva',
  telefone_e164: '5527999991234',
  pagina_origem: 'https://www.alissonbrandao.com.br/',
  ip: '187.10.10.10',
  user_agent: 'Mozilla/5.0',
  fbp: 'fb.1.1700000000000.1',
  fbc: 'fb.1.1700000000000.IwAR1',
  event_id: 'evt-1',
  created_at: '2026-08-02T12:00:00.000Z',
};

const config = {
  pixelId: '2516505455429077',
  capiToken: 'token-secreto',
  capiVersao: 'v21.0',
};

test('monta o evento Lead com os dados hasheados', () => {
  const e = montarEvento(lead);
  assert.strictEqual(e.event_name, 'Lead');
  assert.strictEqual(e.action_source, 'website');
  assert.strictEqual(e.event_id, 'evt-1');
  assert.strictEqual(e.event_source_url, 'https://www.alissonbrandao.com.br/');
  assert.deepStrictEqual(e.user_data.ph, [sha256('5527999991234')]);
  assert.deepStrictEqual(e.user_data.fn, [sha256('maria')]);
  assert.deepStrictEqual(e.user_data.ln, [sha256('silva')]);
  assert.strictEqual(e.user_data.client_ip_address, '187.10.10.10');
  assert.strictEqual(e.user_data.fbp, 'fb.1.1700000000000.1');
});

test('o event_time vai em segundos, não em milissegundos', () => {
  const e = montarEvento(lead);
  assert.strictEqual(e.event_time, Math.floor(Date.parse('2026-08-02T12:00:00.000Z') / 1000));
  assert.ok(String(e.event_time).length === 10);
});

test('campos ausentes não viram undefined no payload', () => {
  const e = montarEvento({ ...lead, fbp: null, fbc: null });
  assert.ok(!('fbp' in e.user_data));
  assert.ok(!('fbc' in e.user_data));
});

test('envia para a URL do pixel com o token', async () => {
  let chamada = null;
  const fetchFalso = async (url, opcoes) => {
    chamada = { url, opcoes };
    return { ok: true, status: 200, text: async () => '{"events_received":1}' };
  };
  const cliente = criarClienteCapi(config, { fetch: fetchFalso });
  const r = await cliente.enviarLead(lead);
  assert.strictEqual(r, 'ok');
  assert.strictEqual(
    chamada.url,
    'https://graph.facebook.com/v21.0/2516505455429077/events'
  );
  const corpo = JSON.parse(chamada.opcoes.body);
  assert.strictEqual(corpo.access_token, 'token-secreto');
  assert.strictEqual(corpo.data.length, 1);
});

test('sem token a CAPI fica desligada e não chama a rede', async () => {
  let chamou = false;
  const cliente = criarClienteCapi(
    { ...config, capiToken: null },
    { fetch: async () => { chamou = true; } }
  );
  assert.strictEqual(await cliente.enviarLead(lead), 'desligado');
  assert.strictEqual(chamou, false);
});

test('tenta uma segunda vez quando a primeira falha', async () => {
  let tentativas = 0;
  const fetchFalso = async () => {
    tentativas += 1;
    if (tentativas === 1) throw new Error('rede caiu');
    return { ok: true, status: 200, text: async () => '{}' };
  };
  const cliente = criarClienteCapi(config, { fetch: fetchFalso });
  assert.strictEqual(await cliente.enviarLead(lead), 'ok');
  assert.strictEqual(tentativas, 2);
});

test('devolve erro sem lançar quando as duas tentativas falham', async () => {
  const cliente = criarClienteCapi(config, {
    fetch: async () => ({ ok: false, status: 400, text: async () => 'token inválido' }),
  });
  const r = await cliente.enviarLead(lead);
  assert.match(r, /^erro:/);
  assert.match(r, /400/);
});

test('o token nunca aparece no texto de erro', async () => {
  const cliente = criarClienteCapi(config, {
    fetch: async () => ({ ok: false, status: 400, text: async () => 'falhou com token-secreto' }),
  });
  const r = await cliente.enviarLead(lead);
  assert.strictEqual(r.includes('token-secreto'), false);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar: `cd lead-api && node --test test/capi.test.js`
Esperado: FAIL, `Cannot find module '../src/capi'`

- [ ] **Step 3: Implementar `src/capi.js`**

```js
'use strict';
const { hashTelefone, hashNome } = require('./hash');

function montarEvento(lead) {
  const { fn, ln } = hashNome(lead.nome);
  const userData = {
    client_ip_address: lead.ip || undefined,
    client_user_agent: lead.user_agent || undefined,
  };
  const ph = hashTelefone(lead.telefone_e164);
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbc) userData.fbc = lead.fbc;
  for (const k of Object.keys(userData)) {
    if (userData[k] === undefined) delete userData[k];
  }

  const quando = lead.created_at ? Date.parse(lead.created_at) : Date.now();
  return {
    event_name: 'Lead',
    // A Meta exige segundos. Mandar milissegundos faz o evento ser descartado
    // por estar "no futuro", e o erro não é óbvio no painel.
    event_time: Math.floor(quando / 1000),
    event_id: lead.event_id,
    event_source_url: lead.pagina_origem || undefined,
    action_source: 'website',
    user_data: userData,
  };
}

function criarClienteCapi(config, deps = {}) {
  const buscar = deps.fetch || globalThis.fetch;

  // O token não pode vazar para log nem para o banco. Toda mensagem de erro
  // passa por aqui antes de sair.
  function limpar(texto) {
    const s = String(texto).slice(0, 300);
    return config.capiToken ? s.split(config.capiToken).join('[token]') : s;
  }

  async function tentar(evento) {
    const url = `https://graph.facebook.com/${config.capiVersao}/${config.pixelId}/events`;
    const resposta = await buscar(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [evento], access_token: config.capiToken }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`HTTP ${resposta.status} ${limpar(corpo)}`);
    }
    return 'ok';
  }

  return {
    async enviarLead(lead) {
      if (!config.capiToken) return 'desligado';
      const evento = montarEvento(lead);
      try {
        return await tentar(evento);
      } catch (primeiroErro) {
        try {
          return await tentar(evento);
        } catch (segundoErro) {
          return `erro: ${limpar(segundoErro.message)}`;
        }
      }
    },
  };
}

module.exports = { montarEvento, criarClienteCapi };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Rodar: `cd lead-api && node --test test/capi.test.js`
Esperado: PASS, 8 testes

- [ ] **Step 5: Commit**

```bash
git add lead-api/src/capi.js lead-api/test/capi.test.js
git commit -m "feat(lead-api): cliente da Conversions API com deduplicacao por event_id"
```

---

### Task 5: Rate limit e rota pública de lead

**Files:**
- Create: `lead-api/src/limite.js`, `lead-api/src/rotas-lead.js`
- Modify: `lead-api/src/servidor.js`
- Test: `lead-api/test/limite.test.js`, `lead-api/test/rotas-lead.test.js`

**Interfaces:**
- Consumes: `db.js`, `validacao.js`, `capi.js`
- Produces: `limite.js` exporta `criarLimite({ max, janelaMs, agora })` → `{ permitir(chave) }` → `boolean`. `rotas-lead.js` exporta `criarRotasLead({ config, db, capi })` → Express Router montado em `/api`.

- [ ] **Step 1: Escrever os testes que falham**

`lead-api/test/limite.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { criarLimite } = require('../src/limite');

test('permite até o máximo e bloqueia o excedente', () => {
  const l = criarLimite({ max: 3, janelaMs: 60000, agora: () => 1000 });
  assert.strictEqual(l.permitir('ip'), true);
  assert.strictEqual(l.permitir('ip'), true);
  assert.strictEqual(l.permitir('ip'), true);
  assert.strictEqual(l.permitir('ip'), false);
});

test('chaves diferentes têm cotas independentes', () => {
  const l = criarLimite({ max: 1, janelaMs: 60000, agora: () => 1000 });
  assert.strictEqual(l.permitir('a'), true);
  assert.strictEqual(l.permitir('b'), true);
  assert.strictEqual(l.permitir('a'), false);
});

test('libera de novo depois que a janela passa', () => {
  let t = 1000;
  const l = criarLimite({ max: 1, janelaMs: 60000, agora: () => t });
  assert.strictEqual(l.permitir('ip'), true);
  assert.strictEqual(l.permitir('ip'), false);
  t += 60001;
  assert.strictEqual(l.permitir('ip'), true);
});
```

`lead-api/test/rotas-lead.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { abrirBanco } = require('../src/db');
const { criarServidor } = require('../src/servidor');

const CONFIG = {
  porta: 0,
  origensPermitidas: ['https://www.alissonbrandao.com.br'],
  pixelId: '2516505455429077',
  capiToken: null,
  capiVersao: 'v21.0',
  whatsappNumero: '5527992291973',
  senhaHash: 'scrypt$16384$8$1$c2FsdA$aGFzaA',
  sessaoSegredo: 'x'.repeat(32),
};

const CORPO = {
  nome: 'Maria Silva',
  telefone: '(27) 99999-1234',
  area: 'Previdenciário',
  descricao: 'Meu auxílio-doença foi negado.',
  consentimento: true,
  pagina_origem: 'https://www.alissonbrandao.com.br/',
  event_id: 'evt-1',
};

async function subir() {
  const db = abrirBanco(':memory:');
  const app = criarServidor(CONFIG, db);
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { db, base, fechar: () => { servidor.close(); db.fechar(); } };
}

function postar(base, corpo, cabecalhos = {}) {
  return fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.alissonbrandao.com.br',
      ...cabecalhos,
    },
    body: JSON.stringify(corpo),
  });
}

test('grava o lead e responde 201', async () => {
  const s = await subir();
  const r = await postar(s.base, CORPO);
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(await r.json(), { ok: true });
  assert.strictEqual(s.db.listarLeads({}).length, 1);
  s.fechar();
});

test('guarda origem, UTMs e cookies do Meta', async () => {
  const s = await subir();
  await postar(s.base, {
    ...CORPO,
    utm_source: 'facebook',
    utm_campaign: 'previdenciario',
    fbp: 'fb.1.1.1',
    fbc: 'fb.1.1.IwAR1',
  });
  const [lead] = s.db.listarLeads({});
  assert.strictEqual(lead.utm_source, 'facebook');
  assert.strictEqual(lead.utm_campaign, 'previdenciario');
  assert.strictEqual(lead.fbp, 'fb.1.1.1');
  assert.strictEqual(lead.event_id, 'evt-1');
  assert.ok(lead.user_agent);
  s.fechar();
});

test('recusa corpo inválido com 400 e não grava', async () => {
  const s = await subir();
  const r = await postar(s.base, { ...CORPO, consentimento: false });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(s.db.listarLeads({}).length, 0);
  s.fechar();
});

test('responde o CORS para a origem permitida', async () => {
  const s = await subir();
  const r = await postar(s.base, CORPO);
  assert.strictEqual(
    r.headers.get('access-control-allow-origin'),
    'https://www.alissonbrandao.com.br'
  );
  s.fechar();
});

test('não libera CORS para origem desconhecida', async () => {
  const s = await subir();
  const r = await postar(s.base, CORPO, { Origin: 'https://site-clonado.com' });
  assert.strictEqual(r.headers.get('access-control-allow-origin'), null);
  s.fechar();
});

test('responde ao preflight OPTIONS', async () => {
  const s = await subir();
  const r = await fetch(`${s.base}/api/leads`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://www.alissonbrandao.com.br',
      'Access-Control-Request-Method': 'POST',
    },
  });
  assert.strictEqual(r.status, 204);
  assert.strictEqual(
    r.headers.get('access-control-allow-origin'),
    'https://www.alissonbrandao.com.br'
  );
  s.fechar();
});

test('bloqueia com 429 depois de 10 leads do mesmo IP', async () => {
  const s = await subir();
  for (let i = 0; i < 10; i += 1) {
    const r = await postar(s.base, CORPO);
    assert.strictEqual(r.status, 201);
  }
  const r = await postar(s.base, CORPO);
  assert.strictEqual(r.status, 429);
  s.fechar();
});

test('recusa corpo maior que o limite', async () => {
  const s = await subir();
  const r = await postar(s.base, { ...CORPO, descricao: 'x'.repeat(200000) });
  assert.ok(r.status === 400 || r.status === 413);
  assert.strictEqual(s.db.listarLeads({}).length, 0);
  s.fechar();
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Rodar: `cd lead-api && node --test test/limite.test.js test/rotas-lead.test.js`
Esperado: FAIL, `Cannot find module '../src/limite'`

- [ ] **Step 3: Implementar `src/limite.js`**

```js
'use strict';

// Rate limit em memória. O serviço roda numa instância só no Coolify, então
// não há por que trazer Redis para isso.
function criarLimite({ max, janelaMs, agora = Date.now }) {
  const registros = new Map();

  return {
    permitir(chave) {
      const t = agora();
      const corte = t - janelaMs;
      const anteriores = (registros.get(chave) || []).filter((x) => x > corte);
      if (anteriores.length >= max) {
        registros.set(chave, anteriores);
        return false;
      }
      anteriores.push(t);
      registros.set(chave, anteriores);
      // Poda oportunista: sem isso o Map cresce para sempre com IP que passou
      // uma vez e nunca voltou.
      if (registros.size > 5000) {
        for (const [k, v] of registros) {
          if (v.every((x) => x <= corte)) registros.delete(k);
        }
      }
      return true;
    },
  };
}

module.exports = { criarLimite };
```

- [ ] **Step 4: Implementar `src/rotas-lead.js`**

```js
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
    if (origem && config.origensPermitidas.includes(origem)) {
      res.setHeader('Access-Control-Allow-Origin', origem);
      res.setHeader('Vary', 'Origin');
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
    capi
      .enviarLead({ ...lead, created_at })
      .then((status) => db.marcarCapi(id, status))
      .catch((e) => db.marcarCapi(id, `erro: ${e.message}`.slice(0, 200)));
  });

  return router;
}

module.exports = { criarRotasLead };
```

- [ ] **Step 5: Ligar as rotas no `src/servidor.js`**

Substituir o conteúdo por:

```js
'use strict';
const express = require('express');
const { criarRotasLead } = require('./rotas-lead');
const { criarClienteCapi } = require('./capi');

function criarServidor(config, db, deps = {}) {
  const app = express();
  app.disable('x-powered-by');
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
```

- [ ] **Step 6: Rodar e confirmar que passam**

Rodar: `cd lead-api && node --test test/`
Esperado: PASS, todos os testes das tasks 1–5

- [ ] **Step 7: Commit**

```bash
git add lead-api/src/limite.js lead-api/src/rotas-lead.js lead-api/src/servidor.js lead-api/test/limite.test.js lead-api/test/rotas-lead.test.js
git commit -m "feat(lead-api): rota publica de captura com CORS e rate limit"
```

---

### Task 6: Sessão, senha e login do painel

**Files:**
- Create: `lead-api/src/sessao.js`, `lead-api/scripts/hash-senha.js`
- Test: `lead-api/test/sessao.test.js`

**Interfaces:**
- Consumes: `config.js`
- Produces: `sessao.js` exporta `gerarHashSenha(senha)` → string `scrypt$N$r$p$saltB64$hashB64`, `conferirSenha(senha, hashGuardado)` → `boolean`, `assinarSessao(segredo, agoraMs)` → string do cookie, `verificarSessao(segredo, valor, agoraMs)` → `boolean`, `lerCookie(cabecalho, nome)` → string ou `null`, e a constante `COOKIE_NOME = 'ab_sessao'`.

- [ ] **Step 1: Escrever o teste que falha**

`lead-api/test/sessao.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const {
  gerarHashSenha, conferirSenha, assinarSessao, verificarSessao, lerCookie, COOKIE_NOME,
} = require('../src/sessao');

test('a senha correta confere com o hash gerado', () => {
  const h = gerarHashSenha('senha-forte-do-alisson');
  assert.strictEqual(conferirSenha('senha-forte-do-alisson', h), true);
});

test('a senha errada não confere', () => {
  const h = gerarHashSenha('senha-forte-do-alisson');
  assert.strictEqual(conferirSenha('senha-errada', h), false);
});

test('dois hashes da mesma senha são diferentes — o sal é aleatório', () => {
  assert.notStrictEqual(gerarHashSenha('igual'), gerarHashSenha('igual'));
});

test('hash malformado devolve false em vez de explodir', () => {
  assert.strictEqual(conferirSenha('x', 'lixo'), false);
  assert.strictEqual(conferirSenha('x', ''), false);
  assert.strictEqual(conferirSenha('x', 'scrypt$a$b$c$d$e'), false);
});

test('a sessão assinada é aceita', () => {
  const segredo = 'x'.repeat(32);
  const c = assinarSessao(segredo, 1000);
  assert.strictEqual(verificarSessao(segredo, c, 2000), true);
});

test('a sessão expira depois de 7 dias', () => {
  const segredo = 'x'.repeat(32);
  const c = assinarSessao(segredo, 1000);
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  assert.strictEqual(verificarSessao(segredo, c, 1000 + seteDias + 1), false);
});

test('sessão adulterada é rejeitada', () => {
  const segredo = 'x'.repeat(32);
  const c = assinarSessao(segredo, 1000);
  const [carga] = c.split('.');
  assert.strictEqual(verificarSessao(segredo, `${carga}.assinaturafalsa`, 2000), false);
  assert.strictEqual(verificarSessao(segredo, '9999999.', 2000), false);
  assert.strictEqual(verificarSessao(segredo, 'lixo', 2000), false);
});

test('sessão assinada com outro segredo é rejeitada', () => {
  const c = assinarSessao('x'.repeat(32), 1000);
  assert.strictEqual(verificarSessao('y'.repeat(32), c, 2000), false);
});

test('lerCookie encontra o cookie certo entre vários', () => {
  const cabecalho = `outro=1; ${COOKIE_NOME}=abc.def; mais=2`;
  assert.strictEqual(lerCookie(cabecalho, COOKIE_NOME), 'abc.def');
  assert.strictEqual(lerCookie(cabecalho, 'inexistente'), null);
  assert.strictEqual(lerCookie(undefined, COOKIE_NOME), null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar: `cd lead-api && node --test test/sessao.test.js`
Esperado: FAIL, `Cannot find module '../src/sessao'`

- [ ] **Step 3: Implementar `src/sessao.js`**

```js
'use strict';
const crypto = require('node:crypto');

const COOKIE_NOME = 'ab_sessao';
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const N = 16384, R = 8, P = 1, TAM = 32;

// scrypt é nativo do Node. Evita mais uma dependência nativa para compilar no
// Docker, e é KDF adequado para senha.
function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const derivado = crypto.scryptSync(String(senha), sal, TAM, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${derivado.toString('base64')}`;
}

function conferirSenha(senha, hashGuardado) {
  try {
    const partes = String(hashGuardado || '').split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
    const n = Number(partes[1]), r = Number(partes[2]), p = Number(partes[3]);
    if (!n || !r || !p) return false;
    const sal = Buffer.from(partes[4], 'base64');
    const esperado = Buffer.from(partes[5], 'base64');
    if (sal.length === 0 || esperado.length === 0) return false;
    const derivado = crypto.scryptSync(String(senha), sal, esperado.length, { N: n, r, p });
    // timingSafeEqual evita que o tempo de resposta revele quantos bytes
    // da senha estavam certos.
    return crypto.timingSafeEqual(derivado, esperado);
  } catch {
    return false;
  }
}

function assinar(segredo, carga) {
  return crypto.createHmac('sha256', segredo).update(carga).digest('base64url');
}

function assinarSessao(segredo, agoraMs = Date.now()) {
  const carga = String(agoraMs);
  return `${carga}.${assinar(segredo, carga)}`;
}

function verificarSessao(segredo, valor, agoraMs = Date.now()) {
  try {
    const [carga, assinatura] = String(valor || '').split('.');
    if (!carga || !assinatura) return false;
    const esperada = Buffer.from(assinar(segredo, carga));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length) return false;
    if (!crypto.timingSafeEqual(esperada, recebida)) return false;
    const emitida = Number(carga);
    if (!Number.isFinite(emitida)) return false;
    return agoraMs - emitida <= VALIDADE_MS;
  } catch {
    return false;
  }
}

function lerCookie(cabecalho, nome) {
  if (!cabecalho) return null;
  for (const parte of String(cabecalho).split(';')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

module.exports = {
  COOKIE_NOME, VALIDADE_MS,
  gerarHashSenha, conferirSenha, assinarSessao, verificarSessao, lerCookie,
};
```

- [ ] **Step 4: Criar `scripts/hash-senha.js`**

```js
'use strict';
// Uso: node scripts/hash-senha.js 'a senha aqui'
// Imprime o valor de PANEL_PASSWORD_HASH para colar no Coolify.
// A senha em texto nunca é gravada em lugar nenhum.
const { gerarHashSenha } = require('../src/sessao');

const senha = process.argv[2];
if (!senha || senha.length < 10) {
  console.error('Informe uma senha com no mínimo 10 caracteres.');
  process.exit(1);
}
console.log(gerarHashSenha(senha));
```

- [ ] **Step 5: Rodar e confirmar que passam**

Rodar: `cd lead-api && node --test test/sessao.test.js`
Esperado: PASS, 9 testes

- [ ] **Step 6: Commit**

```bash
git add lead-api/src/sessao.js lead-api/scripts/hash-senha.js lead-api/test/sessao.test.js
git commit -m "feat(lead-api): hash scrypt da senha e cookie de sessao assinado"
```

---

### Task 7: Painel — login, listagem, status e CSV

**Files:**
- Create: `lead-api/src/rotas-painel.js`, `lead-api/src/painel-html.js`
- Modify: `lead-api/src/servidor.js`
- Test: `lead-api/test/rotas-painel.test.js`

**Interfaces:**
- Consumes: `sessao.js`, `db.js`, `limite.js`, `validacao.js` (`AREAS`)
- Produces: `rotas-painel.js` exporta `criarRotasPainel({ config, db })` → Express Router montado na raiz. `painel-html.js` exporta `paginaLogin({ erro })` → string HTML e `paginaPainel({ areas })` → string HTML.

- [ ] **Step 1: Escrever o teste que falha**

`lead-api/test/rotas-painel.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { abrirBanco } = require('../src/db');
const { criarServidor } = require('../src/servidor');
const { gerarHashSenha } = require('../src/sessao');

const SENHA = 'senha-de-teste-123';

const CONFIG = {
  porta: 0,
  origensPermitidas: ['https://www.alissonbrandao.com.br'],
  pixelId: '2516505455429077',
  capiToken: null,
  capiVersao: 'v21.0',
  whatsappNumero: '5527992291973',
  senhaHash: gerarHashSenha(SENHA),
  sessaoSegredo: 'x'.repeat(32),
};

const LEAD = {
  nome: 'Maria Silva', telefone: '(27) 99999-1234', telefone_e164: '5527999991234',
  area: 'Previdenciário', descricao: 'auxílio negado', consentimento: 1,
  pagina_origem: 'https://www.alissonbrandao.com.br/', ip: '1.1.1.1',
};

async function subir() {
  const db = abrirBanco(':memory:');
  const app = criarServidor(CONFIG, db);
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  return {
    db,
    base: `http://127.0.0.1:${servidor.address().port}`,
    fechar: () => { servidor.close(); db.fechar(); },
  };
}

async function entrar(base, senha = SENHA) {
  const r = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ senha }).toString(),
    redirect: 'manual',
  });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return { resposta: r, cookie };
}

test('a raiz sem sessão devolve a tela de login e nenhum dado', async () => {
  const s = await subir();
  s.db.inserirLead(LEAD);
  const r = await fetch(`${s.base}/`);
  const html = await r.text();
  assert.strictEqual(r.status, 200);
  assert.match(html, /senha/i);
  assert.strictEqual(html.includes('Maria Silva'), false);
  s.fechar();
});

test('o painel manda noindex e proíbe cache', async () => {
  const s = await subir();
  const r = await fetch(`${s.base}/`);
  assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
  assert.match(r.headers.get('cache-control') || '', /no-store/);
  s.fechar();
});

test('login com a senha certa cria cookie httpOnly e redireciona', async () => {
  const s = await subir();
  const { resposta, cookie } = await entrar(s.base);
  assert.strictEqual(resposta.status, 302);
  assert.match(resposta.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(resposta.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.ok(cookie.startsWith('ab_sessao='));
  s.fechar();
});

test('login com senha errada não cria sessão', async () => {
  const s = await subir();
  const { resposta } = await entrar(s.base, 'errada');
  assert.strictEqual(resposta.status, 401);
  assert.strictEqual(resposta.headers.get('set-cookie'), null);
  s.fechar();
});

test('a API do painel sem sessão devolve 401', async () => {
  const s = await subir();
  const r = await fetch(`${s.base}/api/panel/leads`);
  assert.strictEqual(r.status, 401);
  s.fechar();
});

test('com sessão a API lista os leads', async () => {
  const s = await subir();
  s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads`, { headers: { Cookie: cookie } });
  const dados = await r.json();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(dados.leads.length, 1);
  assert.strictEqual(dados.leads[0].nome, 'Maria Silva');
  s.fechar();
});

test('a listagem aceita busca e filtro', async () => {
  const s = await subir();
  s.db.inserirLead(LEAD);
  s.db.inserirLead({ ...LEAD, nome: 'João Pereira', area: 'Trabalhista' });
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads?area=Trabalhista`, { headers: { Cookie: cookie } });
  const dados = await r.json();
  assert.strictEqual(dados.leads.length, 1);
  assert.strictEqual(dados.leads[0].nome, 'João Pereira');
  s.fechar();
});

test('altera o status de um lead', async () => {
  const s = await subir();
  const { id } = s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'atendido' }),
  });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(s.db.listarLeads({})[0].status, 'atendido');
  s.fechar();
});

test('recusa status desconhecido com 400', async () => {
  const s = await subir();
  const { id } = s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'arquivado' }),
  });
  assert.strictEqual(r.status, 400);
  s.fechar();
});

test('exporta CSV com cabeçalho e a linha do lead', async () => {
  const s = await subir();
  s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/export.csv`, { headers: { Cookie: cookie } });
  const csv = await r.text();
  assert.match(r.headers.get('content-type') || '', /text\/csv/);
  assert.match(csv, /nome/);
  assert.match(csv, /Maria Silva/);
  s.fechar();
});

test('o CSV neutraliza fórmula que o Excel executaria', async () => {
  const s = await subir();
  s.db.inserirLead({ ...LEAD, nome: '=HYPERLINK("http://mau.com")' });
  const { cookie } = await entrar(s.base);
  const csv = await (await fetch(`${s.base}/api/panel/export.csv`, { headers: { Cookie: cookie } })).text();
  assert.strictEqual(csv.includes('\n=HYPERLINK'), false);
  assert.strictEqual(csv.includes('"=HYPERLINK'), false);
  s.fechar();
});

test('o CSV sem sessão devolve 401', async () => {
  const s = await subir();
  const r = await fetch(`${s.base}/api/panel/export.csv`);
  assert.strictEqual(r.status, 401);
  s.fechar();
});

test('sair invalida o cookie', async () => {
  const s = await subir();
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/logout`, {
    method: 'POST', headers: { Cookie: cookie }, redirect: 'manual',
  });
  assert.strictEqual(r.status, 302);
  assert.match(r.headers.get('set-cookie'), /ab_sessao=;/);
  s.fechar();
});

test('bloqueia com 429 depois de 5 tentativas de senha errada', async () => {
  const s = await subir();
  for (let i = 0; i < 5; i += 1) {
    const { resposta } = await entrar(s.base, 'errada');
    assert.strictEqual(resposta.status, 401);
  }
  const { resposta } = await entrar(s.base, SENHA);
  assert.strictEqual(resposta.status, 429);
  s.fechar();
});

test('o HTML do painel escapa conteúdo do lead', async () => {
  const s = await subir();
  s.db.inserirLead({ ...LEAD, nome: '<script>alert(1)</script>' });
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads`, { headers: { Cookie: cookie } });
  const dados = await r.json();
  // A API devolve o dado cru; quem escapa é o front do painel.
  assert.strictEqual(dados.leads[0].nome, '<script>alert(1)</script>');
  const html = await (await fetch(`${s.base}/`, { headers: { Cookie: cookie } })).text();
  // O HTML do painel é estático: o lead entra por textContent, nunca por innerHTML.
  assert.strictEqual(html.includes('<script>alert(1)</script>'), false);
  s.fechar();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar: `cd lead-api && node --test test/rotas-painel.test.js`
Esperado: FAIL, `Cannot find module '../src/rotas-painel'`

- [ ] **Step 3: Implementar `src/painel-html.js`**

```js
'use strict';

const ESTILO = `
:root { --azul:#0b1c2e; --ouro:#b9975b; --verde:#25d366; }
* { box-sizing:border-box; }
body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:#f4f5f7; color:#1a1a1a; }
header { background:var(--azul); color:#fff; padding:16px 20px;
  display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
header h1 { font-size:1.1rem; margin:0; flex:1; }
header a, header button { color:#fff; background:transparent; border:1px solid rgba(255,255,255,.4);
  border-radius:6px; padding:8px 14px; font-size:.85rem; cursor:pointer; text-decoration:none; }
main { padding:20px; max-width:1400px; margin:0 auto; }
.filtros { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.filtros input, .filtros select { padding:10px; border:1px solid #d7d7d7; border-radius:6px;
  font-size:.95rem; background:#fff; }
.filtros input { flex:1; min-width:200px; }
.contagem { color:#666; font-size:.85rem; margin-bottom:10px; }
table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.08); }
th, td { padding:12px; text-align:left; font-size:.9rem; border-bottom:1px solid #eee;
  vertical-align:top; }
th { background:#fafafa; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color:#666; }
td.desc { max-width:320px; white-space:pre-wrap; }
.zap { color:var(--verde); font-weight:700; text-decoration:none; }
select.status { padding:6px; border-radius:6px; border:1px solid #d7d7d7; font-size:.85rem; }
tr[data-status="novo"] td:first-child { border-left:3px solid var(--ouro); }
.vazio { padding:40px; text-align:center; color:#888; }
.login { max-width:360px; margin:12vh auto; background:#fff; padding:32px; border-radius:8px;
  box-shadow:0 4px 20px rgba(0,0,0,.1); }
.login h1 { font-size:1.3rem; color:var(--azul); margin:0 0 20px; }
.login input { width:100%; padding:12px; border:1px solid #ddd; border-radius:6px; font-size:1rem; }
.login button { width:100%; margin-top:14px; padding:12px; border:0; border-radius:6px;
  background:var(--azul); color:#fff; font-size:1rem; cursor:pointer; }
.erro { background:#fdecea; color:#b3261e; padding:10px; border-radius:6px; font-size:.9rem;
  margin-bottom:14px; }
@media (max-width:760px) {
  table, thead, tbody, th, td, tr { display:block; }
  thead { display:none; }
  tr { margin-bottom:12px; background:#fff; border-radius:8px; padding:8px; }
  td { border:0; padding:6px 10px; }
  td::before { content:attr(data-rotulo); display:block; font-size:.7rem; text-transform:uppercase;
    color:#999; }
}
`;

function paginaLogin({ erro } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-br"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Leads — Alisson Brandão</title>
<style>${ESTILO}</style></head>
<body><form class="login" method="post" action="/login">
<h1>Painel de Leads</h1>
${erro ? '<p class="erro">Senha incorreta.</p>' : ''}
<label for="senha">Senha</label>
<input type="password" id="senha" name="senha" autocomplete="current-password" required autofocus>
<button type="submit">Entrar</button>
</form></body></html>`;
}

function paginaPainel({ areas }) {
  const opcoesArea = areas.map((a) => `<option value="${a}">${a}</option>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-br"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Leads — Alisson Brandão</title>
<style>${ESTILO}</style></head>
<body>
<header>
  <h1>Leads</h1>
  <a href="/api/panel/export.csv">Exportar CSV</a>
  <form method="post" action="/logout" style="margin:0"><button type="submit">Sair</button></form>
</header>
<main>
  <div class="filtros">
    <input id="busca" type="search" placeholder="Buscar por nome, telefone ou texto">
    <select id="area"><option value="">Todas as áreas</option>${opcoesArea}</select>
    <select id="status">
      <option value="">Todos os status</option>
      <option value="novo">Novo</option>
      <option value="atendido">Atendido</option>
      <option value="fechado">Fechado</option>
    </select>
  </div>
  <p class="contagem" id="contagem"></p>
  <table>
    <thead><tr>
      <th>Data</th><th>Nome</th><th>WhatsApp</th><th>Área</th>
      <th>Descrição</th><th>Origem</th><th>Status</th>
    </tr></thead>
    <tbody id="corpo"></tbody>
  </table>
  <div class="vazio" id="vazio" hidden>Nenhum lead encontrado.</div>
</main>
<script>
// Todo dado de lead entra por textContent. innerHTML com conteúdo de
// formulário público seria XSS armazenado direto no painel do escritório.
var busca = document.getElementById('busca');
var area = document.getElementById('area');
var status = document.getElementById('status');
var corpo = document.getElementById('corpo');
var vazio = document.getElementById('vazio');
var contagem = document.getElementById('contagem');
var timer = null;

function dataBr(iso) {
  var d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function celula(linha, rotulo, texto) {
  var td = document.createElement('td');
  td.setAttribute('data-rotulo', rotulo);
  td.textContent = texto == null ? '' : String(texto);
  linha.appendChild(td);
  return td;
}

function desenhar(leads) {
  corpo.textContent = '';
  vazio.hidden = leads.length > 0;
  contagem.textContent = leads.length + (leads.length === 1 ? ' lead' : ' leads');
  leads.forEach(function (l) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-status', l.status);
    celula(tr, 'Data', dataBr(l.created_at));
    celula(tr, 'Nome', l.nome);

    var tdZap = document.createElement('td');
    tdZap.setAttribute('data-rotulo', 'WhatsApp');
    var a = document.createElement('a');
    a.className = 'zap';
    a.target = '_blank';
    a.rel = 'noopener';
    a.href = 'https://wa.me/' + encodeURIComponent(l.telefone_e164);
    a.textContent = l.telefone;
    tdZap.appendChild(a);
    tr.appendChild(tdZap);

    celula(tr, 'Área', l.area);
    celula(tr, 'Descrição', l.descricao).className = 'desc';
    celula(tr, 'Origem', (l.utm_source ? l.utm_source + ' · ' : '') + (l.pagina_origem || ''));

    var tdStatus = document.createElement('td');
    tdStatus.setAttribute('data-rotulo', 'Status');
    var sel = document.createElement('select');
    sel.className = 'status';
    ['novo', 'atendido', 'fechado'].forEach(function (s) {
      var o = document.createElement('option');
      o.value = s;
      o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (l.status === s) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      fetch('/api/panel/leads/' + l.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sel.value })
      }).then(function (r) {
        if (!r.ok) { sel.value = l.status; return; }
        l.status = sel.value;
        tr.setAttribute('data-status', l.status);
      });
    });
    tdStatus.appendChild(sel);
    tr.appendChild(tdStatus);
    corpo.appendChild(tr);
  });
}

function carregar() {
  var p = new URLSearchParams();
  if (busca.value.trim()) p.set('q', busca.value.trim());
  if (area.value) p.set('area', area.value);
  if (status.value) p.set('status', status.value);
  fetch('/api/panel/leads?' + p.toString())
    .then(function (r) { if (r.status === 401) { location.href = '/'; return null; } return r.json(); })
    .then(function (d) { if (d) desenhar(d.leads); });
}

busca.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(carregar, 250); });
area.addEventListener('change', carregar);
status.addEventListener('change', carregar);
carregar();
</script>
</body></html>`;
}

module.exports = { paginaLogin, paginaPainel };
```

- [ ] **Step 4: Implementar `src/rotas-painel.js`**

```js
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
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
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
```

- [ ] **Step 5: Ligar o painel no `src/servidor.js`**

Depois da linha `app.get('/healthz', ...)`, e **antes** do `app.use('/api', criarRotasLead(...))`, adicionar:

```js
  app.use('/', criarRotasPainel({ config, db }));
```

E o `require` no topo:

```js
const { criarRotasPainel } = require('./rotas-painel');
```

Ordem importa: `rotas-painel` registra `/api/panel/*`, `rotas-lead` registra `/api/leads`. Não colidem, mas os cabeçalhos `no-store` do painel não devem cair na rota pública.

- [ ] **Step 6: Rodar a suíte inteira**

Rodar: `cd lead-api && node --test test/`
Esperado: PASS, todos os testes das tasks 1–7

- [ ] **Step 7: Commit**

```bash
git add lead-api/src/rotas-painel.js lead-api/src/painel-html.js lead-api/src/servidor.js lead-api/test/rotas-painel.test.js
git commit -m "feat(lead-api): painel com login, busca, filtro, status e exportacao CSV"
```

---

### Task 8: Meta Pixel no site estático

**Files:**
- Create: `js/pixel.js`
- Modify: as 36 páginas `.html` do repositório

**Interfaces:**
- Consumes: nada
- Produces: `window.fbq` disponível em todas as páginas; `window.abPixel` com `{ id, rastrear(evento, params, eventId) }` para o `leads.js` da Task 9 usar.

- [ ] **Step 1: Criar `js/pixel.js`**

```js
/* Meta Pixel — Alisson Brandão Advocacia.
   Carregado no <head> de todas as páginas. O ID mora só aqui. */
(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
}(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'));

(function () {
    var PIXEL_ID = '2516505455429077';
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');

    // Fachada usada pelo js/leads.js. Existir aqui evita que o leads.js
    // precise saber o formato da chamada do fbq — e evita erro se o
    // fbevents.js for bloqueado por extensão do visitante.
    window.abPixel = {
        id: PIXEL_ID,
        rastrear: function (evento, parametros, eventId) {
            try {
                if (typeof window.fbq !== 'function') return;
                if (eventId) {
                    window.fbq('track', evento, parametros || {}, { eventID: eventId });
                } else {
                    window.fbq('track', evento, parametros || {});
                }
            } catch (e) { /* rastreamento nunca pode quebrar a página */ }
        }
    };
}());
```

- [ ] **Step 2: Inserir a tag nas 36 páginas**

Rodar da raiz do repositório, no Git Bash:

```bash
for f in $(find . -name "*.html" -not -path "./.git/*"); do
  grep -q 'js/pixel.js' "$f" || \
  perl -0pi -e 's{(\n\s*)</head>}{$1    <script src="/js/pixel.js"></script>$1</head>}' "$f"
done
```

- [ ] **Step 3: Conferir que as 36 páginas receberam a tag**

Rodar: `grep -rlc 'js/pixel.js' --include=*.html . | wc -l`
Esperado: `36`

Rodar também: `grep -c 'js/pixel.js' index.html`
Esperado: `1` — se der `2`, o script rodou duas vezes; desfaça com `git checkout` e rode de novo.

- [ ] **Step 4: Verificar no navegador**

Abrir `index.html` no navegador e conferir no console que `window.fbq` é função e `window.abPixel.id` é `'2516505455429077'`.

- [ ] **Step 5: Commit**

```bash
git add js/pixel.js *.html blog/*.html
git commit -m "feat(meta): instala o Pixel 2516505455429077 em todas as paginas"
```

---

### Task 9: Formulário de lead no site estático

**Files:**
- Create: `js/leads.js`
- Modify: `js/main.js` (remover linhas 1–21), `index.html` (remover o `<div id="whatsappModal">`), `css/style.css` (acrescentar estilos), 35 páginas `.html` (tag do `leads.js`)

**Interfaces:**
- Consumes: `window.abPixel` da Task 8; `POST https://lead.alissonbrandao.com.br/api/leads` da Task 5
- Produces: nada consumido por tasks posteriores

- [ ] **Step 1: Criar `js/leads.js`**

```js
/* Captura de leads — Alisson Brandão Advocacia.
   Intercepta os CTAs de WhatsApp, coleta os dados, manda para a lead-api,
   dispara o evento Lead e leva o visitante para o WhatsApp. */
(function () {
    'use strict';

    var API = 'https://lead.alissonbrandao.com.br/api/leads';
    var WHATSAPP = '5527992291973';
    var AREAS = ['Previdenciário', 'Consumidor', 'Trabalhista', 'Família', 'Cível', 'Criminal', 'Outro'];
    var FILA = 'ab_leads_pendentes';

    function cookie(nome) {
        var m = document.cookie.match(new RegExp('(^|;\\s*)' + nome + '=([^;]*)'));
        return m ? decodeURIComponent(m[2]) : null;
    }

    function param(nome) {
        try { return new URLSearchParams(location.search).get(nome); } catch (e) { return null; }
    }

    function idEvento() {
        try {
            if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
        } catch (e) { /* segue para o plano B */ }
        return 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    // O _fbc só existe se o Pixel já rodou; quando o visitante chega pelo
    // anúncio o fbclid está na URL antes disso. Montar na mão recupera a
    // atribuição desses primeiros segundos.
    function fbcAtual() {
        var existente = cookie('_fbc');
        if (existente) return existente;
        var fbclid = param('fbclid');
        return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : null;
    }

    function enviar(dados) {
        return fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
            keepalive: true
        });
    }

    // Se a API estiver fora do ar o visitante não pode perceber: ele vai para
    // o WhatsApp do mesmo jeito e o lead é reenviado na próxima página.
    function enfileirar(dados) {
        try {
            var fila = JSON.parse(localStorage.getItem(FILA) || '[]');
            fila.push(dados);
            localStorage.setItem(FILA, JSON.stringify(fila.slice(-20)));
        } catch (e) { /* localStorage cheio ou bloqueado: desiste */ }
    }

    function esvaziarFila() {
        var fila;
        try { fila = JSON.parse(localStorage.getItem(FILA) || '[]'); } catch (e) { return; }
        if (!fila.length) return;
        try { localStorage.removeItem(FILA); } catch (e) { /* segue */ }
        fila.forEach(function (dados) {
            enviar(dados).catch(function () { enfileirar(dados); });
        });
    }

    function areaDaPagina() {
        var a = document.body.getAttribute('data-area');
        return AREAS.indexOf(a) !== -1 ? a : 'Outro';
    }

    function montarModal() {
        var opcoes = AREAS.map(function (a) {
            return '<option value="' + a + '"' + (a === areaDaPagina() ? ' selected' : '') + '>' + a + '</option>';
        }).join('');

        var div = document.createElement('div');
        div.id = 'whatsappModal';
        div.className = 'modal';
        div.innerHTML =
            '<div class="modal-content">' +
            '<span class="close-btn" role="button" aria-label="Fechar">&times;</span>' +
            '<div class="modal-header"><h3>Iniciar Atendimento</h3>' +
            '<p>Preencha os dados abaixo para direcionarmos seu atendimento.</p></div>' +
            '<form id="waForm" novalidate>' +
            '<div class="form-group"><label for="lead-nome">Nome Completo</label>' +
            '<input type="text" id="lead-nome" name="nome" placeholder="Digite seu nome" required maxlength="120"></div>' +
            '<div class="form-group"><label for="lead-telefone">Telefone / WhatsApp</label>' +
            '<input type="tel" id="lead-telefone" name="telefone" placeholder="(27) 99999-9999" required maxlength="20" inputmode="tel"></div>' +
            '<div class="form-group"><label for="lead-area">Área do seu caso</label>' +
            '<select id="lead-area" name="area" required>' + opcoes + '</select></div>' +
            '<div class="form-group"><label for="lead-descricao">Do que se trata?</label>' +
            '<textarea id="lead-descricao" name="descricao" placeholder="Descreva brevemente seu caso..." required maxlength="2000"></textarea></div>' +
            '<div class="form-group form-consent">' +
            '<label for="lead-consent"><input type="checkbox" id="lead-consent" name="consentimento" required> ' +
            'Autorizo o contato e o tratamento dos meus dados conforme a ' +
            '<a href="/privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</label></div>' +
            '<p class="form-erro" id="lead-erro" role="alert" hidden></p>' +
            '<button type="submit" class="btn-submit">Ir para o WhatsApp</button>' +
            '</form></div>';
        document.body.appendChild(div);
        return div;
    }

    function mascararTelefone(input) {
        input.addEventListener('input', function () {
            var d = input.value.replace(/\D/g, '').slice(0, 11);
            if (d.length <= 2) { input.value = d; return; }
            if (d.length <= 6) { input.value = '(' + d.slice(0, 2) + ') ' + d.slice(2); return; }
            if (d.length <= 10) {
                input.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
                return;
            }
            input.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        });
    }

    function iniciar() {
        var modal = montarModal();
        var form = modal.querySelector('#waForm');
        var erroEl = modal.querySelector('#lead-erro');
        var fechar = modal.querySelector('.close-btn');
        var textoOriginal = null;

        mascararTelefone(modal.querySelector('#lead-telefone'));

        function abrir(e) {
            if (e) {
                e.preventDefault();
                var alvo = e.currentTarget;
                // O texto do CTA já traz o contexto do caso ("meu BPC foi
                // negado..."). Aproveita como mensagem inicial do WhatsApp.
                var href = alvo.getAttribute('href') || '';
                var m = href.match(/[?&]text=([^&]*)/);
                textoOriginal = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
            }
            erroEl.hidden = true;
            modal.style.display = 'block';
            modal.querySelector('#lead-nome').focus();
        }

        function fecharModal() { modal.style.display = 'none'; }

        fechar.addEventListener('click', fecharModal);
        window.addEventListener('click', function (e) { if (e.target === modal) fecharModal(); });
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'block') fecharModal();
        });

        // Todo CTA de texto abre o formulário. O botão flutuante do canto não:
        // quem clica ali quer falar agora, e o formulário só faria perder o contato.
        var alvos = document.querySelectorAll('a[href*="wa.me"]:not(.whatsapp-float)');
        Array.prototype.forEach.call(alvos, function (a) { a.addEventListener('click', abrir); });

        var botao = document.getElementById('openModalBtn');
        if (botao) botao.addEventListener('click', abrir);

        var flutuante = document.querySelector('.whatsapp-float');
        if (flutuante) {
            flutuante.addEventListener('click', function () {
                if (window.abPixel) window.abPixel.rastrear('Contact', { content_name: 'botao-flutuante' });
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var nome = form.nome.value.trim();
            var telefone = form.telefone.value.trim();
            var area = form.area.value;
            var descricao = form.descricao.value.trim();

            if (nome.length < 2) return falhar('Informe seu nome.');
            if (telefone.replace(/\D/g, '').length < 10) return falhar('Informe um telefone válido com DDD.');
            if (descricao.length < 3) return falhar('Conte brevemente o seu caso.');
            if (!form.consentimento.checked) return falhar('É preciso aceitar a Política de Privacidade.');

            var eventId = idEvento();
            var dados = {
                nome: nome, telefone: telefone, area: area, descricao: descricao,
                consentimento: true,
                pagina_origem: location.href.slice(0, 500),
                referrer: document.referrer ? document.referrer.slice(0, 500) : null,
                utm_source: param('utm_source'), utm_medium: param('utm_medium'),
                utm_campaign: param('utm_campaign'), utm_content: param('utm_content'),
                utm_term: param('utm_term'), fbclid: param('fbclid'),
                fbp: cookie('_fbp'), fbc: fbcAtual(),
                event_id: eventId
            };

            // Nada é aguardado daqui para baixo: se houvesse await, o navegador
            // perderia o contexto de gesto e bloquearia a janela do WhatsApp.
            enviar(dados).catch(function () { enfileirar(dados); });

            if (window.abPixel) {
                window.abPixel.rastrear('Lead', { content_category: area }, eventId);
            }

            var mensagem = textoOriginal
                || ('Olá, meu nome é ' + nome + '.\nTelefone: ' + telefone
                    + '.\nÁrea: ' + area + '.\n\nGostaria de falar sobre: ' + descricao);
            window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensagem), '_blank');

            fecharModal();
            form.reset();
            form.area.value = areaDaPagina();
            return undefined;
        });

        function falhar(mensagem) {
            erroEl.textContent = mensagem;
            erroEl.hidden = false;
            return undefined;
        }

        esvaziarFila();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
}());
```

- [ ] **Step 2: Remover o bloco do modal do `js/main.js`**

Apagar as linhas 1 a 21 (do comentário `// Modal WhatsApp` até o `}` que fecha o `if (modal && btn && form)`). O arquivo passa a começar em `// Carrossel`. O carrossel e o badge de cidade ficam intactos.

- [ ] **Step 3: Remover o modal estático do `index.html`**

Apagar o bloco inteiro `<div id="whatsappModal" class="modal"> ... </div>` (do `<div id="whatsappModal"` até o `</div>` que o fecha, imediatamente antes de `<script src="js/main.js"></script>`). O `<button id="openModalBtn">` **permanece** — o `leads.js` liga nele.

- [ ] **Step 4: Acrescentar os estilos ao fim do bloco `/* --- MODAL --- */` do `css/style.css`**

Inserir logo após a regra `.btn-submit:hover { ... }`:

```css
.form-group select {
    width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;
    font-size: 1rem; font-family: var(--font-body); background-color: #f9f9f9;
    color: #1a1a1a; appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath fill='%230b1c2e' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
}
.form-group select:focus {
    outline: none; border-color: var(--primary-blue); background-color: #fff;
    box-shadow: 0 0 0 2px rgba(11, 28, 46, 0.1);
}
.form-consent label {
    display: flex; align-items: flex-start; gap: 8px; font-weight: 400;
    font-size: 0.82rem; color: #555; line-height: 1.45; cursor: pointer;
}
.form-consent input[type="checkbox"] {
    width: auto; margin: 2px 0 0; flex-shrink: 0; accent-color: var(--primary-blue);
}
.form-consent a { color: var(--primary-blue); text-decoration: underline; }
.form-erro {
    background: #fdecea; color: #b3261e; padding: 10px 12px; border-radius: 6px;
    font-size: 0.85rem; margin: 12px 0 0; text-align: left;
}
```

- [ ] **Step 5: Inserir a tag do `leads.js` nas 35 páginas que carregam o `main.js`**

```bash
for f in $(grep -rl 'js/main.js' --include=*.html .); do
  grep -q 'js/leads.js' "$f" || \
  perl -0pi -e 's{(<script src="js/main\.js"></script>)}{$1\n    <script src="/js/leads.js" defer></script>}' "$f"
done
```

- [ ] **Step 6: Conferir a contagem**

Rodar: `grep -rl 'js/leads.js' --include=*.html . | wc -l`
Esperado: `35`

Rodar: `grep -c 'whatsappModal' index.html`
Esperado: `0`

- [ ] **Step 7: Testar no navegador com a API ainda fora do ar**

Abrir `blog/bpc-loas-negado-inss-como-recorrer.html` no navegador e conferir:
1. clicar em "Falar no WhatsApp" no meio do texto abre o modal;
2. enviar com o checkbox desmarcado mostra a mensagem de erro e não redireciona;
3. preenchido corretamente, abre a aba do WhatsApp mesmo com a API inacessível;
4. no console, `JSON.parse(localStorage.getItem('ab_leads_pendentes')).length` é `1` — o lead foi para a fila;
5. clicar no botão flutuante do canto vai direto para o WhatsApp, sem modal.

- [ ] **Step 8: Commit**

```bash
git add js/leads.js js/main.js css/style.css index.html blog/*.html advogado-*.html blog.html
git commit -m "feat(leads): formulario de captura em todo o site com fila de reenvio"
```

---

### Task 10: Área do direito por página

**Files:**
- Modify: 33 páginas `.html` — as 29 do `blog/` e as 4 landings da raiz

**Interfaces:**
- Consumes: `js/leads.js` lê `document.body.getAttribute('data-area')`
- Produces: nada

- [ ] **Step 1: Aplicar o `data-area` conforme a tabela**

| Página | `data-area` |
|---|---|
| `advogado-emprestimo-indevido-vitoria-es.html` | Consumidor |
| `advogado-extravio-de-bagagem-vitoria-es.html` | Consumidor |
| `advogado-negativacao-indevida-vitoria-es.html` | Consumidor |
| `advogado-trabalhista-vitoria-es.html` | Trabalhista |
| `blog/aposentadoria-por-invalidez-incapacidade-permanente.html` | Previdenciário |
| `blog/assedio-moral-no-trabalho-indenizacao.html` | Trabalhista |
| `blog/atraso-de-voo-mais-de-4-horas-indenizacao-valor.html` | Consumidor |
| `blog/auxilio-doenca-negado-pericia-inss-o-que-fazer.html` | Previdenciário |
| `blog/auxilio-doenca-ou-aposentadoria-por-incapacidade-qual-pedir.html` | Previdenciário |
| `blog/bagagem-extraviada-voo-internacional-indenizacao.html` | Consumidor |
| `blog/bpc-loas-negado-inss-como-recorrer.html` | Previdenciário |
| `blog/cartao-consignado-rmc-cancelamento.html` | Consumidor |
| `blog/desconto-inss-associativo-indevido.html` | Previdenciário |
| `blog/divorcio-consensual-cartorio-vitoria.html` | Família |
| `blog/emprestimo-consignado-nao-contratado.html` | Consumidor |
| `blog/extravio-de-bagagem-indenizacao.html` | Consumidor |
| `blog/golpe-falso-advogado.html` | Cível |
| `blog/golpe-pix-cobranca-indevida-banco.html` | Consumidor |
| `blog/horas-extras-nao-pagas-como-cobrar.html` | Trabalhista |
| `blog/inss-nao-analisou-pedido-prazo-acao-judicial.html` | Previdenciário |
| `blog/inventario-cartorio-espirito-santo.html` | Família |
| `blog/isencao-imposto-de-renda-doenca-grave-aposentado.html` | Cível |
| `blog/negativacao-indevida-nome-sujo.html` | Consumidor |
| `blog/pensao-alimenticia-revisao-execucao.html` | Família |
| `blog/plano-de-saude-recusou-internacao-liminar.html` | Consumidor |
| `blog/plano-saude-negou-cobertura.html` | Consumidor |
| `blog/rescisao-indireta-trabalhista.html` | Trabalhista |
| `blog/seguro-de-automovel-negativa-de-pagamento-sinistro.html` | Consumidor |
| `blog/seguro-de-vida-negativa-de-pagamento-o-que-fazer.html` | Consumidor |
| `blog/superendividamento-renegociacao-dividas.html` | Consumidor |
| `blog/verbas-rescisorias-demissao-sem-justa-causa.html` | Trabalhista |
| `blog/voo-cancelado-atrasado-indenizacao.html` | Consumidor |
| `blog/voo-cancelado-companhia-nao-avisou-o-que-fazer.html` | Consumidor |

`index.html` e `blog.html` ficam **sem** o atributo: tratam de várias áreas e o formulário cai em `Outro`.

Em cada arquivo, trocar a tag `<body>` (ou `<body class="...">`) acrescentando o atributo. Exemplo:

```html
<body data-area="Previdenciário">
```

Quando já houver classe:

```html
<body class="pagina-blog" data-area="Trabalhista">
```

- [ ] **Step 2: Conferir a contagem e a ausência de duplicata**

Rodar: `grep -rl 'data-area=' --include=*.html . | wc -l`
Esperado: `33`

Rodar: `grep -rn 'data-area' index.html blog.html`
Esperado: nenhuma saída

- [ ] **Step 3: Conferir que só valores válidos foram usados**

Rodar: `grep -rho 'data-area="[^"]*"' --include=*.html . | sort -u`
Esperado: exatamente cinco linhas — `Cível`, `Consumidor`, `Família`, `Previdenciário`, `Trabalhista`

- [ ] **Step 4: Commit**

```bash
git add blog/*.html advogado-*.html
git commit -m "feat(leads): marca a area do direito de cada pagina para pre-selecionar o formulario"
```

---

### Task 11: Política de privacidade e documentação

**Files:**
- Modify: `privacidade.html`, `docs/PAGINAS.md`, `docs/PENDENCIAS.md`, `CLAUDE.md`
- Create: `lead-api/README.md`

**Interfaces:**
- Consumes: nada
- Produces: nada

- [ ] **Step 1: Acrescentar a seção ao `privacidade.html`**

Inserir antes da seção de direitos do titular, seguindo a marcação já usada no arquivo:

```html
<h2>Formulário de atendimento</h2>
<p>Ao preencher o formulário de atendimento deste site, você fornece nome, telefone
de WhatsApp, a área do direito relacionada ao seu caso e uma descrição do que
pretende tratar. Coletamos também dados técnicos da navegação: endereço IP,
identificação do navegador, a página em que o formulário foi preenchido, a origem
do acesso e identificadores de campanha publicitária.</p>

<p><strong>Finalidade.</strong> Esses dados são usados exclusivamente para
retornar o seu contato, organizar o atendimento e mensurar o desempenho das
campanhas de divulgação do escritório.</p>

<p><strong>Base legal.</strong> O tratamento se dá mediante o seu consentimento,
nos termos do art. 7º, I, da Lei nº 13.709/2018 (LGPD), manifestado ao marcar a
declaração no formulário. Você pode revogar o consentimento a qualquer momento.</p>

<p><strong>Compartilhamento.</strong> Os dados de contato são transmitidos, de
forma criptografada e irreversível (hash SHA-256), à Meta Platforms Ireland
Limited, para mensuração e otimização de campanhas publicitárias. A Meta não
recebe o conteúdo da descrição do seu caso.</p>

<p><strong>Retenção.</strong> Os registros ficam armazenados em servidor de acesso
restrito, protegido por senha, pelo prazo de 5 (cinco) anos contados do último
contato, e depois são eliminados.</p>

<p><strong>Sigilo.</strong> O envio do formulário não constitui contratação de
serviços advocatícios nem estabelece relação cliente-advogado. Ainda assim, todo
o conteúdo informado é tratado com a confidencialidade exigida pelo Estatuto da
Advocacia e pelo Código de Ética e Disciplina da OAB.</p>

<p><strong>Exclusão.</strong> Para solicitar acesso, correção ou eliminação dos
seus dados, escreva para <a href="mailto:alissonbrandao.adv@gmail.com">alissonbrandao.adv@gmail.com</a>.</p>
```

Não alterar a meta tag `robots` da página nem incluí-la no `sitemap.xml`.

- [ ] **Step 2: Criar `lead-api/README.md`**

````markdown
# lead-api

Captura de leads do site e painel de consulta em `https://lead.alissonbrandao.com.br`.

## Rodar local

```bash
cd lead-api
npm install
npm test

PANEL_PASSWORD_HASH="$(node scripts/hash-senha.js 'uma-senha-de-teste')" \
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
META_PIXEL_ID=2516505455429077 \
META_API_VERSION=v21.0 \
ALLOWED_ORIGINS=http://localhost:8080 \
WHATSAPP_NUMBER=5527992291973 \
DB_PATH=./leads.db \
npm start
```

## Deploy no Coolify

1. **Cloudflare** — registro `A` com nome `lead` apontando para `187.77.34.112`, proxy ligado.
2. **Coolify → New Resource → Application**, repositório `felipe1santos/alisson`, branch `main`.
3. **Build Pack:** Dockerfile. **Base Directory:** `/lead-api`.
4. **Domains:** `https://lead.alissonbrandao.com.br`. **Port:** `3000`.
5. **Storages → Add volume:** origem nomeada, destino `/data`.
6. **Environment Variables** — ver tabela abaixo.
7. **Health check path:** `/healthz`.
8. Deploy.

> **O volume do passo 5 não é opcional.** Sem ele o arquivo SQLite fica dentro do
> container e **todo redeploy apaga a base de leads inteira**. Confira antes do
> primeiro lead entrar.

## Variáveis de ambiente

| Variável | Como obter |
|---|---|
| `PANEL_PASSWORD_HASH` | `node scripts/hash-senha.js 'a senha'` — cole a saída, nunca a senha |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `META_PIXEL_ID` | `2516505455429077` |
| `META_CAPI_TOKEN` | Gerenciador de Eventos → Configurações → Conversions API → Gerar token |
| `META_API_VERSION` | versão atual mostrada no Gerenciador de Eventos, ex. `v21.0` |
| `ALLOWED_ORIGINS` | `https://www.alissonbrandao.com.br,https://alissonbrandao.com.br` |
| `WHATSAPP_NUMBER` | `5527992291973` |
| `DB_PATH` | `/data/leads.db` |

Nenhuma delas entra no Git.

## Trocar a senha do painel

```bash
node scripts/hash-senha.js 'nova senha'
```

Cole a saída em `PANEL_PASSWORD_HASH` no Coolify e redeploy. Sessões abertas
continuam válidas até expirar; para derrubar todas, troque também o
`SESSION_SECRET`.

## Backup

Os leads são o ativo do projeto. O volume `/data` precisa entrar na rotina de
backup do servidor. O botão **Exportar CSV** do painel é a saída manual.
````

- [ ] **Step 3: Atualizar `docs/PAGINAS.md`**

Acrescentar uma seção no fim:

```markdown
## Captura de leads

| Item | Onde | Status |
|---|---|---|
| Meta Pixel `2516505455429077` | `js/pixel.js`, carregado nas 36 páginas | ativo |
| Formulário de lead | `js/leads.js`, modal injetado nas 35 páginas com `main.js` | ativo |
| Painel de leads | `lead-api/`, servido em `lead.alissonbrandao.com.br` | ativo |

O `data-area` no `<body>` de cada página pré-seleciona a área do direito no
formulário. Página nova deve receber o atributo — sem ele o lead cai em `Outro`.
Os valores válidos são os sete de `lead-api/src/validacao.js`.
```

- [ ] **Step 4: Atualizar `docs/PENDENCIAS.md`**

Acrescentar:

```markdown
- [ ] **Coolify: criar o serviço `lead-api`** com volume persistente em `/data` e as variáveis de ambiente listadas em `lead-api/README.md`. Sem o volume, todo redeploy apaga a base de leads.
- [ ] **Cloudflare: registro A `lead` → 187.77.34.112**, proxy ligado.
- [ ] **Meta: gerar o Access Token da Conversions API** no Gerenciador de Eventos e cadastrar em `META_CAPI_TOKEN` no Coolify. Enquanto não existir, só o Pixel do navegador reporta e o campo `capi_status` fica `desligado`.
- [ ] **Meta: conferir a versão atual da Graph API** e ajustar `META_API_VERSION`.
- [ ] **Definir a senha do painel** com o Alisson e gerar o hash com `node lead-api/scripts/hash-senha.js`.
- [ ] **Backup do volume `/data`** do serviço `lead-api` na rotina do servidor.
```

- [ ] **Step 5: Acrescentar a regra ao `CLAUDE.md`**

Na seção "Regras permanentes", acrescentar:

```markdown
9. **Toda página nova recebe `data-area` no `<body>`** com uma das sete áreas de `lead-api/src/validacao.js`. É o que pré-seleciona a área no formulário de captura de leads. Sem o atributo, o lead entra como `Outro`.
10. **O `lead-api/` tem deploy próprio no Coolify**, separado do site. Mudança em `lead-api/` exige deploy daquele serviço, não do site — e vice-versa.
```

- [ ] **Step 6: Commit**

```bash
git add privacidade.html lead-api/README.md docs/PAGINAS.md docs/PENDENCIAS.md CLAUDE.md
git commit -m "docs: politica de privacidade do formulario e passo a passo do lead-api"
```

---

### Task 12: Verificação final e publicação

**Files:**
- Nenhum arquivo novo

**Interfaces:**
- Consumes: tudo
- Produces: nada

- [ ] **Step 1: Rodar a suíte inteira do backend**

Rodar: `cd lead-api && node --test test/`
Esperado: PASS em todos os arquivos, zero falhas

- [ ] **Step 2: Subir o serviço local e provar o caminho completo**

```bash
cd lead-api
PANEL_PASSWORD_HASH="$(node scripts/hash-senha.js 'teste-local-123')" \
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
META_PIXEL_ID=2516505455429077 ALLOWED_ORIGINS=http://localhost:8080 \
WHATSAPP_NUMBER=5527992291973 DB_PATH=./teste.db npm start
```

Noutro terminal:

```bash
curl -s localhost:3000/healthz
curl -s -X POST localhost:3000/api/leads \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:8080' \
  -d '{"nome":"Teste Local","telefone":"(27) 99999-1234","area":"Consumidor","descricao":"lead de teste","consentimento":true,"event_id":"evt-teste"}'
```

Esperado: `{"ok":true}` no segundo comando. Abrir `http://localhost:3000/` no navegador, entrar com `teste-local-123` e ver o lead na lista.

Apagar o banco de teste ao final: `rm lead-api/teste.db lead-api/teste.db-wal lead-api/teste.db-shm`

- [ ] **Step 3: Confirmar que nenhum segredo entrou no repositório**

Rodar da raiz:

```bash
git log --oneline -12
git grep -nE 'EAA[A-Za-z0-9]{20,}|scrypt\$[0-9]+\$' -- . ':!lead-api/test' ':!docs' ':!lead-api/README.md'
```

Esperado: o `git grep` não retorna nada. Se retornar, o segredo precisa sair do histórico antes do push.

Rodar também: `git status --porcelain` — esperado: vazio.

- [ ] **Step 4: Conferir as contagens no site**

```bash
grep -rl 'js/pixel.js' --include=*.html . | wc -l    # 36
grep -rl 'js/leads.js' --include=*.html . | wc -l    # 35
grep -rl 'data-area='  --include=*.html . | wc -l    # 33
grep -rc 'whatsappModal' index.html                  # 0
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

- [ ] **Step 6: Registrar o que depende do usuário**

Avisar, nesta ordem:

1. **Cloudflare** — criar o registro A `lead` → `187.77.34.112`, proxy ligado.
2. **Coolify** — clicar **Deploy** no serviço do site (pixel e formulário) **e** criar o serviço `lead-api` conforme `lead-api/README.md`, com o volume em `/data`.
3. **Meta** — gerar o Access Token da Conversions API e conferir a versão da Graph API.
4. **Senha do painel** — definir com o Alisson e gerar o hash.

- [ ] **Step 7: Verificação em produção, depois do deploy**

1. `https://www.alissonbrandao.com.br/js/pixel.js` responde 200.
2. Extensão *Meta Pixel Helper* mostra `PageView` na home e num post do blog.
3. Enviar um lead de teste pelo formulário: a aba do WhatsApp abre com a mensagem preenchida.
4. Gerenciador de Eventos → *Testar Eventos*: `Lead` aparece **uma vez só**, com "Deduplicado" quando a CAPI estiver ligada.
5. `https://lead.alissonbrandao.com.br` pede senha; sem entrar, nenhum dado aparece.
6. Após entrar, o lead de teste está na lista, com origem e área corretas.
7. **Redeploy do `lead-api` e conferir que o lead de teste continua lá** — é a prova de que o volume está montado.
8. Apagar o lead de teste do painel não é possível por desenho; deixá-lo com status `fechado`.

---

## Self-Review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| Pixel nas 36 páginas | 8 |
| `PageView`, `Lead`, `Contact` | 8, 9 |
| Modal injetado, interceptação por seletor | 9 |
| Campos com área e consentimento | 3, 9 |
| `data-area` por página | 10 |
| Fila de reenvio no `localStorage` | 9 |
| Tabela `leads` com UTMs, `fbp`/`fbc`, `event_id` | 2 |
| `POST /api/leads` com CORS e rate limit | 5 |
| Conversions API com deduplicação | 4 |
| Login, sessão, rate limit | 6, 7 |
| Painel com busca, filtro, status, CSV | 7 |
| Cabeçalhos `no-store` e `noindex` | 7 |
| Variáveis de ambiente | 1 |
| Dockerfile e volume | 1, 11 |
| Seção LGPD no `privacidade.html` | 11 |
| Testes | 1–7 |
| Verificação manual no Meta | 12 |

Sem lacunas.

**Desvios do spec, conscientes:**

1. **Node 22 LTS** em vez de Node 20 — o Node 20 saiu do suporte em abril de 2026.
2. **scrypt** em vez de argon2id — KDF nativo do Node, uma dependência nativa a menos para compilar no Docker. `better-sqlite3` já é a única.
3. **Sem biblioteca de CORS, cookie ou rate limit** — escritas à mão, ~40 linhas somadas, testadas. Menos superfície de supply chain num serviço que guarda dado pessoal.

**Consistência de tipos:** `criarServidor(config, db, deps)` é chamado com dois argumentos nos testes e três em `servidor.js`; o terceiro tem padrão `{}`. `db.listarLeads({})` aceita objeto vazio em todos os pontos de chamada. `AREAS` é importado de `validacao.js` tanto em `rotas-painel.js` quanto usado literal em `js/leads.js` — a duplicação é intencional: o front não tem build e não pode importar do backend. Um teste em `rotas-lead.test.js` protege contra divergência, ao recusar área fora da lista.

**Sem placeholders.** Todo passo tem o conteúdo final.
