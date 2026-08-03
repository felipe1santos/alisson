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

test('bloqueio não estende a janela indefinidamente', () => {
  let t = 1000;
  const l = criarLimite({ max: 1, janelaMs: 1000, agora: () => t });
  l.permitir('ip');
  t += 500;
  assert.strictEqual(l.permitir('ip'), false);
  t += 600;
  // A tentativa bloqueada não pode contar como uso: passada a janela
  // do acesso legítimo, o IP volta a ser liberado.
  assert.strictEqual(l.permitir('ip'), true);
});
