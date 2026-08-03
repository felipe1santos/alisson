'use strict';

const AREAS = [
  'Previdenciário', 'Consumidor', 'Trabalhista', 'Família',
  'Cível', 'Criminal', 'Outro',
];

const LIMITES = { nome: 120, telefone: 40, descricao: 2000 };

// Converte qualquer formato brasileiro para dígitos com DDI: 55DDNNNNNNNNN.
// Devolve null quando o número não pode existir — é assim que se barra robô
// que preenche o campo com lixo.
function normalizarTelefone(bruto) {
  if (typeof bruto !== 'string' && typeof bruto !== 'number') return null;
  let n = String(bruto).replace(/\D/g, '');
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) n = n.slice(2);
  if (n.length !== 10 && n.length !== 11) return null;
  const ddd = Number(n.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  // Celular brasileiro tem 11 dígitos e o nono é sempre 9.
  if (n.length === 11 && n[2] !== '9') return null;
  return '55' + n;
}

function texto(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validarLead(corpo) {
  if (!corpo || typeof corpo !== 'object') {
    return { ok: false, erro: 'Corpo da requisição inválido.' };
  }

  const nome = texto(corpo.nome);
  if (nome.length < 2) return { ok: false, erro: 'Informe o nome.' };
  if (nome.length > LIMITES.nome) return { ok: false, erro: 'Nome longo demais.' };

  const telefoneBruto = texto(corpo.telefone);
  if (telefoneBruto.length > LIMITES.telefone) {
    return { ok: false, erro: 'Telefone inválido.' };
  }
  const e164 = normalizarTelefone(telefoneBruto);
  if (!e164) return { ok: false, erro: 'Telefone inválido.' };

  const area = texto(corpo.area);
  if (!AREAS.includes(area)) return { ok: false, erro: 'Área do direito inválida.' };

  const descricao = texto(corpo.descricao);
  if (descricao.length < 3) return { ok: false, erro: 'Escreva a descrição do caso.' };
  if (descricao.length > LIMITES.descricao) {
    return { ok: false, erro: 'Descrição longa demais.' };
  }

  // O consentimento é a base legal do tratamento (LGPD art. 7º, I).
  // Sem ele o lead não pode ser gravado, ponto.
  if (corpo.consentimento !== true && corpo.consentimento !== 1) {
    return { ok: false, erro: 'É necessário aceitar a política de privacidade.' };
  }

  return {
    ok: true,
    valor: {
      nome,
      telefone: telefoneBruto,
      telefone_e164: e164,
      area,
      descricao,
      consentimento: 1,
    },
  };
}

module.exports = { AREAS, LIMITES, normalizarTelefone, validarLead };
