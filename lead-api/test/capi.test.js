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
  assert.strictEqual(String(e.event_time).length, 10);
});

test('campos ausentes não viram undefined no payload', () => {
  const e = montarEvento({ ...lead, fbp: null, fbc: null, ip: null });
  assert.ok(!('fbp' in e.user_data));
  assert.ok(!('fbc' in e.user_data));
  assert.ok(!('client_ip_address' in e.user_data));
  assert.strictEqual(JSON.stringify(e).includes('undefined'), false);
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
  assert.match(r, /\[token\]/);
});
