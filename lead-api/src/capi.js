'use strict';
const { hashTelefone, hashNome } = require('./hash');

function montarEvento(lead) {
  const { fn, ln } = hashNome(lead.nome);
  const userData = {};

  if (lead.ip) userData.client_ip_address = lead.ip;
  if (lead.user_agent) userData.client_user_agent = lead.user_agent;
  const ph = hashTelefone(lead.telefone_e164);
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbc) userData.fbc = lead.fbc;

  const quando = lead.created_at ? Date.parse(lead.created_at) : Date.now();
  const evento = {
    event_name: 'Lead',
    // A Meta exige segundos. Mandar milissegundos faz o evento ser descartado
    // por estar "no futuro", e o erro não é óbvio no painel.
    event_time: Math.floor((Number.isFinite(quando) ? quando : Date.now()) / 1000),
    action_source: 'website',
    user_data: userData,
  };
  if (lead.event_id) evento.event_id = lead.event_id;
  if (lead.pagina_origem) evento.event_source_url = lead.pagina_origem;

  return evento;
}

function criarClienteCapi(config, deps = {}) {
  const buscar = deps.fetch || globalThis.fetch;

  // O token não pode vazar para log nem para o banco. Toda mensagem de erro
  // passa por aqui antes de sair.
  function limpar(texto) {
    const s = String(texto).slice(0, 300);
    return config.capiToken ? s.split(config.capiToken).join('[token]') : s;
  }

  async function tentar(evento) {
    const url = `https://graph.facebook.com/${config.capiVersao}/${config.pixelId}/events`;
    const resposta = await buscar(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [evento], access_token: config.capiToken }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`HTTP ${resposta.status} ${limpar(corpo)}`);
    }
    return 'ok';
  }

  return {
    async enviarLead(lead) {
      if (!config.capiToken) return 'desligado';
      const evento = montarEvento(lead);
      try {
        return await tentar(evento);
      } catch (primeiroErro) {
        try {
          return await tentar(evento);
        } catch (segundoErro) {
          return `erro: ${limpar(segundoErro.message)}`;
        }
      }
    },
  };
}

module.exports = { montarEvento, criarClienteCapi };
