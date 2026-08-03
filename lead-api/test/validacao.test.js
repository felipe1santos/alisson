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
  assert.match(r.erro, /Área/i);
});

test('recusa sem consentimento', () => {
  const r = validarLead({ ...corpoValido, consentimento: false });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /privacidade/i);
});

test('recusa descrição vazia', () => {
  const r = validarLead({ ...corpoValido, descricao: '   ' });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /descri/i);
});

test('recusa campo absurdamente longo em vez de cortar', () => {
  const r = validarLead({ ...corpoValido, descricao: 'x'.repeat(5000) });
  assert.strictEqual(r.ok, false);
  assert.match(r.erro, /Descri/i);
});

test('recusa corpo que não é objeto', () => {
  assert.strictEqual(validarLead(null).ok, false);
  assert.strictEqual(validarLead('texto').ok, false);
});

test('as sete áreas estão declaradas', () => {
  assert.deepStrictEqual(AREAS, [
    'Previdenciário', 'Consumidor', 'Trabalhista', 'Família',
    'Cível', 'Criminal', 'Outro',
  ]);
});
