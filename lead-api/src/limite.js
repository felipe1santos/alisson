'use strict';

// Rate limit em memória. O serviço roda numa instância só no Coolify, então
// não há por que trazer Redis para isso.
function criarLimite({ max, janelaMs, agora = Date.now }) {
  const registros = new Map();

  return {
    permitir(chave) {
      const t = agora();
      const corte = t - janelaMs;
      const anteriores = (registros.get(chave) || []).filter((x) => x > corte);
      if (anteriores.length >= max) {
        // A tentativa bloqueada não é registrada: senão quem insiste empurra a
        // janela para frente e fica travado para sempre.
        registros.set(chave, anteriores);
        return false;
      }
      anteriores.push(t);
      registros.set(chave, anteriores);

      // Poda oportunista: sem isso o Map cresce para sempre com IP que passou
      // uma vez e nunca voltou.
      if (registros.size > 5000) {
        for (const [k, v] of registros) {
          if (v.every((x) => x <= corte)) registros.delete(k);
        }
      }
      return true;
    },
  };
}

module.exports = { criarLimite };
