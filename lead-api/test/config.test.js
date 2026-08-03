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
