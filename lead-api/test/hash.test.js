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

test('hashTelefone devolve null sem dígito', () => {
  assert.strictEqual(hashTelefone(''), null);
  assert.strictEqual(hashTelefone(null), null);
});

test('hashNome separa primeiro e último nome, sem acento e em minúsculas', () => {
  const r = hashNome('José da Silva Júnior');
  assert.strictEqual(r.fn, sha256('jose'));
  assert.strictEqual(r.ln, sha256('junior'));
});

test('hashNome com nome único não inventa sobrenome', () => {
  const r = hashNome('Madonna');
  assert.strictEqual(r.fn, sha256('madonna'));
  assert.strictEqual(r.ln, null);
});

test('hashNome vazio devolve os dois nulos', () => {
  assert.deepStrictEqual(hashNome('   '), { fn: null, ln: null });
});
