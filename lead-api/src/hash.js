'use strict';
const crypto = require('node:crypto');

// A Conversions API exige os dados de usuário em SHA-256, normalizados:
// minúsculas, sem espaço nas pontas e sem acento. Normalização errada não dá
// erro — só derruba silenciosamente a taxa de correspondência do público.
function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function sha256(texto) {
  return crypto.createHash('sha256').update(String(texto), 'utf8').digest('hex');
}

function hashTelefone(bruto) {
  const digitos = String(bruto || '').replace(/\D/g, '');
  return digitos ? sha256(digitos) : null;
}

function hashNome(nomeCompleto) {
  const partes = semAcento(nomeCompleto).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { fn: null, ln: null };
  return {
    fn: sha256(partes[0]),
    ln: partes.length > 1 ? sha256(partes[partes.length - 1]) : null,
  };
}

module.exports = { sha256, hashTelefone, hashNome };
