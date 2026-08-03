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

// O finally é obrigatório: sem ele, uma asserção que falha deixa o servidor
// ouvindo e o `node --test` fica pendurado esperando o handle fechar.
async function comServidor(corpoDoTeste) {
  const db = abrirBanco(':memory:');
  const app = criarServidor(CONFIG, db);
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    await corpoDoTeste({ db, base });
  } finally {
    await new Promise((r) => servidor.close(r));
    db.fechar();
  }
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

test('grava o lead e responde 201', async () => comServidor(async (s) => {
  const r = await postar(s.base, CORPO);
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(await r.json(), { ok: true });
  assert.strictEqual(s.db.listarLeads({}).length, 1);
}));

test('guarda origem, UTMs e cookies do Meta', async () => comServidor(async (s) => {
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
}));

test('recusa corpo inválido com 400 e não grava', async () => comServidor(async (s) => {
  const r = await postar(s.base, { ...CORPO, consentimento: false });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(s.db.listarLeads({}).length, 0);
}));

test('responde o CORS para a origem permitida', async () => comServidor(async (s) => {
  const r = await postar(s.base, CORPO);
  assert.strictEqual(
    r.headers.get('access-control-allow-origin'),
    'https://www.alissonbrandao.com.br'
  );
}));

test('não libera CORS para origem desconhecida', async () => comServidor(async (s) => {
  const r = await postar(s.base, CORPO, { Origin: 'https://site-clonado.com' });
  assert.strictEqual(r.headers.get('access-control-allow-origin'), null);
}));

test('responde ao preflight OPTIONS', async () => comServidor(async (s) => {
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
}));

test('bloqueia com 429 depois de 10 leads do mesmo IP', async () => comServidor(async (s) => {
  for (let i = 0; i < 10; i += 1) {
    const r = await postar(s.base, CORPO);
    assert.strictEqual(r.status, 201);
  }
  const r = await postar(s.base, CORPO);
  assert.strictEqual(r.status, 429);
  assert.strictEqual(s.db.listarLeads({}).length, 10);
}));

test('recusa corpo maior que o limite', async () => comServidor(async (s) => {
  const r = await postar(s.base, { ...CORPO, descricao: 'x'.repeat(200000) });
  assert.ok(r.status === 400 || r.status === 413, `status inesperado: ${r.status}`);
  assert.strictEqual(s.db.listarLeads({}).length, 0);
}));

test('JSON malformado vira 400, não erro 500', async () => comServidor(async (s) => {
  const r = await fetch(`${s.base}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.alissonbrandao.com.br',
    },
    body: '{isso nao e json',
  });
  assert.strictEqual(r.status, 400);
}));

test('o healthcheck responde', async () => comServidor(async (s) => {
  const r = await fetch(`${s.base}/healthz`);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { ok: true });
}));
