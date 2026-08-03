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
  assert.strictEqual(conferirSenha('x', null), false);
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
  assert.strictEqual(verificarSessao(segredo, c, 1000 + seteDias - 1), true);
  assert.strictEqual(verificarSessao(segredo, c, 1000 + seteDias + 1), false);
});

test('sessão adulterada é rejeitada', () => {
  const segredo = 'x'.repeat(32);
  const c = assinarSessao(segredo, 1000);
  const [carga] = c.split('.');
  assert.strictEqual(verificarSessao(segredo, `${carga}.assinaturafalsa`, 2000), false);
  assert.strictEqual(verificarSessao(segredo, '9999999.', 2000), false);
  assert.strictEqual(verificarSessao(segredo, 'lixo', 2000), false);
  assert.strictEqual(verificarSessao(segredo, '', 2000), false);
});

test('sessão assinada com outro segredo é rejeitada', () => {
  const c = assinarSessao('x'.repeat(32), 1000);
  assert.strictEqual(verificarSessao('y'.repeat(32), c, 2000), false);
});

test('sessão com data no futuro não vale para sempre', () => {
  const segredo = 'x'.repeat(32);
  const c = assinarSessao(segredo, 9999999999999);
  assert.strictEqual(verificarSessao(segredo, c, 1000), false);
});

test('lerCookie encontra o cookie certo entre vários', () => {
  const cabecalho = `outro=1; ${COOKIE_NOME}=abc.def; mais=2`;
  assert.strictEqual(lerCookie(cabecalho, COOKIE_NOME), 'abc.def');
  assert.strictEqual(lerCookie(cabecalho, 'inexistente'), null);
  assert.strictEqual(lerCookie(undefined, COOKIE_NOME), null);
});
