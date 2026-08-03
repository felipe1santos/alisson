'use strict';

// Uma única porta de entrada para o ambiente. Se uma variável obrigatória
// faltar, o processo morre no boot com mensagem clara — é muito melhor do que
// descobrir em produção que os leads estão sendo gravados num caminho errado.
function obrigatoria(env, nome) {
  const v = env[nome];
  if (!v || !String(v).trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return String(v).trim();
}

function carregarConfig(env) {
  const sessaoSegredo = obrigatoria(env, 'SESSION_SECRET');
  if (sessaoSegredo.length < 32) {
    throw new Error('SESSION_SECRET precisa ter no mínimo 32 caracteres');
  }

  const origens = obrigatoria(env, 'ALLOWED_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    porta: Number(env.PORT || 3000),
    dbPath: obrigatoria(env, 'DB_PATH'),
    origensPermitidas: origens,
    pixelId: obrigatoria(env, 'META_PIXEL_ID'),
    // Sem token a CAPI fica desligada e só o Pixel do navegador reporta.
    // O serviço continua gravando leads normalmente.
    capiToken: env.META_CAPI_TOKEN ? String(env.META_CAPI_TOKEN).trim() : null,
    capiVersao: (env.META_API_VERSION || 'v21.0').trim(),
    whatsappNumero: obrigatoria(env, 'WHATSAPP_NUMBER'),
    senhaHash: obrigatoria(env, 'PANEL_PASSWORD_HASH'),
    sessaoSegredo,
  };
}

module.exports = { carregarConfig };
