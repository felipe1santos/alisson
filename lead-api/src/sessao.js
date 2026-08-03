'use strict';
const crypto = require('node:crypto');

const COOKIE_NOME = 'ab_sessao';
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const N = 16384, R = 8, P = 1, TAM = 32;

// scrypt é nativo do Node. Evita uma dependência nativa para compilar no
// Docker, e é KDF adequado para senha.
function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const derivado = crypto.scryptSync(String(senha), sal, TAM, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${derivado.toString('base64')}`;
}

function conferirSenha(senha, hashGuardado) {
  try {
    const partes = String(hashGuardado || '').split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
    const n = Number(partes[1]), r = Number(partes[2]), p = Number(partes[3]);
    if (!n || !r || !p) return false;
    const sal = Buffer.from(partes[4], 'base64');
    const esperado = Buffer.from(partes[5], 'base64');
    if (sal.length === 0 || esperado.length === 0) return false;
    const derivado = crypto.scryptSync(String(senha), sal, esperado.length, { N: n, r, p });
    // timingSafeEqual evita que o tempo de resposta revele quantos bytes
    // da senha estavam certos.
    return crypto.timingSafeEqual(derivado, esperado);
  } catch {
    return false;
  }
}

function assinar(segredo, carga) {
  return crypto.createHmac('sha256', segredo).update(carga).digest('base64url');
}

function assinarSessao(segredo, agoraMs = Date.now()) {
  const carga = String(agoraMs);
  return `${carga}.${assinar(segredo, carga)}`;
}

function verificarSessao(segredo, valor, agoraMs = Date.now()) {
  try {
    const [carga, assinatura] = String(valor || '').split('.');
    if (!carga || !assinatura) return false;

    const esperada = Buffer.from(assinar(segredo, carga));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length) return false;
    if (!crypto.timingSafeEqual(esperada, recebida)) return false;

    const emitida = Number(carga);
    if (!Number.isFinite(emitida)) return false;
    // Cookie datado no futuro seria válido para sempre; recusa.
    if (emitida > agoraMs) return false;
    return agoraMs - emitida <= VALIDADE_MS;
  } catch {
    return false;
  }
}

function lerCookie(cabecalho, nome) {
  if (!cabecalho) return null;
  for (const parte of String(cabecalho).split(';')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

module.exports = {
  COOKIE_NOME, VALIDADE_MS,
  gerarHashSenha, conferirSenha, assinarSessao, verificarSessao, lerCookie,
};
