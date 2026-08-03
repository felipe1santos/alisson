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

// O finally garante que uma asserção falha não deixe o servidor ouvindo.
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

test('a raiz sem sessão devolve a tela de login e nenhum dado', async () => comServidor(async (s) => {
  s.db.inserirLead(LEAD);
  const r = await fetch(`${s.base}/`);
  const html = await r.text();
  assert.strictEqual(r.status, 200);
  assert.match(html, /senha/i);
  assert.strictEqual(html.includes('Maria Silva'), false);
}));

test('o painel manda noindex e proíbe cache', async () => comServidor(async (s) => {
  const r = await fetch(`${s.base}/`);
  assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
  assert.match(r.headers.get('cache-control') || '', /no-store/);
  assert.match(r.headers.get('x-frame-options') || '', /DENY/);
}));

test('login com a senha certa cria cookie httpOnly e redireciona', async () => comServidor(async (s) => {
  const { resposta, cookie } = await entrar(s.base);
  assert.strictEqual(resposta.status, 302);
  assert.match(resposta.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(resposta.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.match(resposta.headers.get('set-cookie'), /Secure/i);
  assert.ok(cookie.startsWith('ab_sessao='));
}));

test('login com senha errada não cria sessão', async () => comServidor(async (s) => {
  const { resposta } = await entrar(s.base, 'errada');
  assert.strictEqual(resposta.status, 401);
  assert.strictEqual(resposta.headers.get('set-cookie'), null);
}));

test('a API do painel sem sessão devolve 401', async () => comServidor(async (s) => {
  const r = await fetch(`${s.base}/api/panel/leads`);
  assert.strictEqual(r.status, 401);
}));

test('com sessão a API lista os leads', async () => comServidor(async (s) => {
  s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads`, { headers: { Cookie: cookie } });
  const dados = await r.json();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(dados.leads.length, 1);
  assert.strictEqual(dados.leads[0].nome, 'Maria Silva');
}));

test('a listagem aceita busca e filtro', async () => comServidor(async (s) => {
  s.db.inserirLead(LEAD);
  s.db.inserirLead({ ...LEAD, nome: 'João Pereira', area: 'Trabalhista' });
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads?area=Trabalhista`, { headers: { Cookie: cookie } });
  const dados = await r.json();
  assert.strictEqual(dados.leads.length, 1);
  assert.strictEqual(dados.leads[0].nome, 'João Pereira');
}));

test('filtro com área inventada é ignorado, não quebra', async () => comServidor(async (s) => {
  s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads?area=Tributário`, { headers: { Cookie: cookie } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).leads.length, 1);
}));

test('altera o status de um lead', async () => comServidor(async (s) => {
  const { id } = s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'atendido' }),
  });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(s.db.listarLeads({})[0].status, 'atendido');
}));

test('recusa status desconhecido com 400', async () => comServidor(async (s) => {
  const { id } = s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ status: 'arquivado' }),
  });
  assert.strictEqual(r.status, 400);
}));

test('alterar status sem sessão devolve 401', async () => comServidor(async (s) => {
  const { id } = s.db.inserirLead(LEAD);
  const r = await fetch(`${s.base}/api/panel/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'fechado' }),
  });
  assert.strictEqual(r.status, 401);
  assert.strictEqual(s.db.listarLeads({})[0].status, 'novo');
}));

test('exporta CSV com cabeçalho e a linha do lead', async () => comServidor(async (s) => {
  s.db.inserirLead(LEAD);
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/api/panel/export.csv`, { headers: { Cookie: cookie } });
  const csv = await r.text();
  assert.match(r.headers.get('content-type') || '', /text\/csv/);
  assert.match(csv, /nome/);
  assert.match(csv, /Maria Silva/);
}));

test('o CSV neutraliza fórmula que o Excel executaria', async () => comServidor(async (s) => {
  s.db.inserirLead({ ...LEAD, nome: '=HYPERLINK("http://mau.com")' });
  const { cookie } = await entrar(s.base);
  const csv = await (await fetch(`${s.base}/api/panel/export.csv`, { headers: { Cookie: cookie } })).text();
  assert.strictEqual(csv.includes('"=HYPERLINK'), false);
  assert.match(csv, /"'=HYPERLINK/);
}));

test('o CSV sem sessão devolve 401', async () => comServidor(async (s) => {
  const r = await fetch(`${s.base}/api/panel/export.csv`);
  assert.strictEqual(r.status, 401);
}));

test('sair invalida o cookie', async () => comServidor(async (s) => {
  const { cookie } = await entrar(s.base);
  const r = await fetch(`${s.base}/logout`, {
    method: 'POST', headers: { Cookie: cookie }, redirect: 'manual',
  });
  assert.strictEqual(r.status, 302);
  assert.match(r.headers.get('set-cookie'), /ab_sessao=;/);
}));

test('bloqueia com 429 depois de 5 tentativas de senha errada', async () => comServidor(async (s) => {
  for (let i = 0; i < 5; i += 1) {
    const { resposta } = await entrar(s.base, 'errada');
    assert.strictEqual(resposta.status, 401);
  }
  const { resposta } = await entrar(s.base, SENHA);
  assert.strictEqual(resposta.status, 429);
}));

test('o HTML do painel não injeta conteúdo de lead', async () => comServidor(async (s) => {
  s.db.inserirLead({ ...LEAD, nome: '<script>alert(1)</script>' });
  const { cookie } = await entrar(s.base);
  const dados = await (await fetch(`${s.base}/api/panel/leads`, { headers: { Cookie: cookie } })).json();
  // A API devolve o dado cru; quem escapa é o front, via textContent.
  assert.strictEqual(dados.leads[0].nome, '<script>alert(1)</script>');
  const html = await (await fetch(`${s.base}/`, { headers: { Cookie: cookie } })).text();
  assert.strictEqual(html.includes('alert(1)'), false);
}));

test('a rota publica de lead nao herda o no-store do painel', async () => comServidor(async (s) => {
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
