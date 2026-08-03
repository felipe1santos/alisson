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

test('campo ausente vira null em vez de quebrar a inserção', () => {
  const db = bancoNaMemoria();
  db.inserirLead({
    nome: 'Minimo', telefone: '27999991234', telefone_e164: '5527999991234',
    area: 'Outro', descricao: 'sem nada mais', consentimento: 1,
  });
  const [lead] = db.listarLeads({});
  assert.strictEqual(lead.utm_source, null);
  assert.strictEqual(lead.fbp, null);
  db.fechar();
});
