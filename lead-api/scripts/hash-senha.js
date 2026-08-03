'use strict';
// Uso: node scripts/hash-senha.js 'a senha aqui'
// Imprime o valor de PANEL_PASSWORD_HASH para colar no Coolify.
// A senha em texto nunca é gravada em lugar nenhum.
const { gerarHashSenha } = require('../src/sessao');

const senha = process.argv[2];
if (!senha || senha.length < 10) {
  console.error('Informe uma senha com no mínimo 10 caracteres.');
  console.error("Uso: node scripts/hash-senha.js 'a senha aqui'");
  process.exit(1);
}
console.log(gerarHashSenha(senha));
