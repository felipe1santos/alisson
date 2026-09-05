/* ==========================================================================
   landing-lead.js — captação de contatos da landing trabalhista
   --------------------------------------------------------------------------
   Responsabilidades, nesta ordem:

   1. Guardar os parâmetros de campanha (gclid, gbraid, wbraid, utm_*,
      adgroupid, creative, device, network) logo na chegada, antes que
      qualquer navegação interna os apague. Como a primeira campanha usa uma
      única landing para os quatro grupos de anúncios, são esses parâmetros
      que dizem de qual grupo veio cada visitante.
   2. Empurrar os eventos de conversão para o dataLayer do GTM:
      lead_whatsapp_click, lead_phone_click, lead_form_submit_success.
   3. Só exibir o formulário se a lead-api responder ao teste de
      disponibilidade. Enquanto ela estiver fora, a página mostra os canais
      que funcionam e nenhum campo é renderizado — ninguém preenche um
      formulário que falharia no envio.

   Nenhuma tag é criada aqui: o arquivo só escreve no dataLayer. A instalação
   do contêiner do GTM depende de definir qual conta será a proprietária.

   Sem dependências externas. Roda com `defer`.
   ========================================================================== */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Configuração
       ------------------------------------------------------------------ */

    var script = document.currentScript;

    // Endpoint da lead-api (lead-api/src/rotas-lead.js → POST /api/leads).
    // O atributo data-api na tag <script> tem prioridade: é o que permite
    // apontar para uma instância local em teste sem editar este arquivo.
    var API_PADRAO = 'https://lead.alissonbrandao.com.br/api/leads';
    var API = (script && script.getAttribute('data-api')) || API_PADRAO;

    // Teste de disponibilidade. Por padrão é o /healthz do mesmo host.
    var SAUDE = (script && script.getAttribute('data-health')) ||
                API.replace(/\/api\/leads\/?$/, '/healthz');

    var TEMPO_LIMITE_SAUDE = 4000;   // ms
    var WHATSAPP = '5527992291973';
    var CHAVE_CAMPANHA = 'ab_campanha';
    var TEMPO_MINIMO_MS = 2500;      // preenchimento humano leva mais que isso

    window.dataLayer = window.dataLayer || [];

    /* ------------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------------ */

    function $(sel, raiz) { return (raiz || document).querySelector(sel); }

    function evento(nome, dados) {
        var payload = { event: nome };
        if (dados) {
            for (var k in dados) {
                if (Object.prototype.hasOwnProperty.call(dados, k)) payload[k] = dados[k];
            }
        }
        window.dataLayer.push(payload);
    }

    function idEvento() {
        try {
            if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
        } catch (e) { /* segue para o plano B */ }
        return 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    function cookie(nome) {
        var m = document.cookie.match('(^|;)\\s*' + nome + '\\s*=\\s*([^;]+)');
        return m ? m.pop() : null;
    }

    function textoLimpo(v, max) {
        if (typeof v !== 'string') return '';
        var s = v.trim().replace(/\s+/g, ' ');
        return max ? s.slice(0, max) : s;
    }

    /* ------------------------------------------------------------------
       1. Parâmetros de campanha
       ------------------------------------------------------------------
       Guardados na sessão porque o visitante pode navegar para o blog e
       voltar: sem isso o segundo pageview perderia o gclid e o lead
       chegaria sem atribuição nenhuma.

       Com uma landing única para os quatro grupos, `adgroupid` e
       `utm_content` são o que permite saber qual grupo trouxe o contato.
       ------------------------------------------------------------------ */

    var CAMPOS_CAMPANHA = [
        'gclid', 'gbraid', 'wbraid',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'adgroupid', 'creative', 'device', 'network',
        'fbclid'
    ];

    function lerCampanha() {
        var url;
        try { url = new URLSearchParams(window.location.search); } catch (e) { url = null; }

        var guardado = {};
        try {
            guardado = JSON.parse(sessionStorage.getItem(CHAVE_CAMPANHA) || '{}') || {};
        } catch (e) { guardado = {}; }

        var mudou = false;
        CAMPOS_CAMPANHA.forEach(function (campo) {
            var v = url ? url.get(campo) : null;
            if (v) {
                // O que veio na URL agora vale mais do que o da sessão anterior.
                guardado[campo] = textoLimpo(v, 255);
                mudou = true;
            }
        });

        if (mudou) {
            try { sessionStorage.setItem(CHAVE_CAMPANHA, JSON.stringify(guardado)); } catch (e) { /* modo privado */ }
        }
        return guardado;
    }

    var campanha = lerCampanha();

    // O _fbc só existe depois que o Pixel roda. Quando o visitante chega pelo
    // anúncio, o fbclid está na URL antes disso — montar na mão recupera a
    // atribuição desses primeiros segundos.
    function fbcAtual() {
        var existente = cookie('_fbc');
        if (existente) return existente;
        return campanha.fbclid ? 'fb.1.' + Date.now() + '.' + campanha.fbclid : null;
    }

    /* ------------------------------------------------------------------
       2. Eventos de clique
       ------------------------------------------------------------------
       Delegação num único listener: os botões de WhatsApp e telefone
       aparecem em vários pontos da página, inclusive dentro de blocos
       inseridos por JavaScript depois do carregamento.
       ------------------------------------------------------------------ */

    function origemCampanha() {
        return {
            lead_grupo: campanha.adgroupid || null,
            lead_criativo: campanha.creative || null,
            lead_termo: campanha.utm_term || null,
            lead_dispositivo: campanha.device || null,
            lead_rede: campanha.network || null
        };
    }

    document.addEventListener('click', function (ev) {
        var alvo = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!alvo) return;

        var href = alvo.getAttribute('href') || '';
        var base = origemCampanha();
        base.lead_area = 'trabalhista';
        base.lead_origem = alvo.getAttribute('data-origem') || 'link';

        if (href.indexOf('wa.me/') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
            // Os links de WhatsApp abrem em aba nova, então a página não é
            // descarregada e o push chega ao GTM sem corrida.
            evento('lead_whatsapp_click', base);
            return;
        }

        if (href.indexOf('tel:') === 0) {
            // Registra apenas o CLIQUE no telefone. Não há como saber daqui
            // se a ligação foi completada ou atendida.
            base.lead_telefone = href.replace('tel:', '');
            evento('lead_phone_click', base);
        }
    }, true);

    /* ------------------------------------------------------------------
       3. Cartões de situação → formulário com o assunto já escolhido
       ------------------------------------------------------------------ */

    function ligarCartoesSituacao() {
        var seletorAssunto = $('#lp-assunto');
        if (!seletorAssunto) return;
        Array.prototype.forEach.call(document.querySelectorAll('.lp-situacao[data-assunto]'), function (cartao) {
            cartao.addEventListener('click', function () {
                var alvo = cartao.getAttribute('data-assunto');
                var existe = Array.prototype.some.call(seletorAssunto.options, function (o) {
                    return o.value === alvo;
                });
                if (!existe) return;
                seletorAssunto.value = alvo;
                seletorAssunto.dispatchEvent(new Event('change', { bubbles: true }));
                seletorAssunto.dispatchEvent(new Event('blur', { bubbles: true }));
            });
        });
    }

    /* ------------------------------------------------------------------
       4. Disponibilidade da lead-api
       ------------------------------------------------------------------
       O formulário mora num <template> e só entra no DOM se este teste
       passar. Enquanto não passar, fica valendo o bloco de WhatsApp que já
       veio no HTML — nada de campo que falharia no envio.
       ------------------------------------------------------------------ */

    function testarApi() {
        if (!window.fetch || !window.AbortController) return Promise.resolve(false);
        var ctrl = new AbortController();
        var expira = setTimeout(function () { ctrl.abort(); }, TEMPO_LIMITE_SAUDE);
        return fetch(SAUDE, { method: 'GET', signal: ctrl.signal, cache: 'no-store' })
            .then(function (r) { clearTimeout(expira); return r.ok; })
            .catch(function () { clearTimeout(expira); return false; });
    }

    function ativarFormulario() {
        var molde = $('#lp-form-tpl');
        var alternativo = $('#lp-contato-alternativo');
        var area = $('#lp-area-form');
        if (!molde || !area) return false;

        area.insertBefore(molde.content.cloneNode(true), molde);
        if (alternativo) alternativo.remove();
        return true;
    }

    // A página não tem mais formulário: o bloco de contato virou endereço e
    // mapa. Sem o <template> no HTML, nem faz sentido perguntar à lead-api se
    // ela está de pé — seria uma requisição por visita sem nenhum efeito.
    if ($('#lp-form-tpl')) testarApi().then(function (disponivel) {
        if (!disponivel) return;          // segue só com WhatsApp e telefone
        if (!ativarFormulario()) return;
        ligarCartoesSituacao();
        iniciarFormulario();
    });

    /* ------------------------------------------------------------------
       5. Formulário
       ------------------------------------------------------------------ */

    function iniciarFormulario() {
        var form = $('#lp-form');
        if (!form) return;

        var status = $('#lp-form-status');
        var botao = $('#lp-form-enviar');
        var carregadoEm = Date.now();

        var REGRAS = {
            'lp-nome': function (v) {
                if (textoLimpo(v).length < 2) return 'Informe seu nome.';
                if (textoLimpo(v).length > 120) return 'Nome longo demais.';
                return null;
            },
            'lp-telefone': function (v) {
                var n = String(v).replace(/\D/g, '');
                if (n.length === 0) return 'Informe seu WhatsApp com DDD.';
                if (n.length < 10 || n.length > 11) return 'Digite o DDD e o número. Ex.: (27) 99999-9999.';
                var ddd = Number(n.slice(0, 2));
                if (ddd < 11 || ddd > 99) return 'DDD inválido.';
                if (n.length === 11 && n[2] !== '9') return 'Celular com 11 dígitos precisa começar com 9 depois do DDD.';
                return null;
            },
            'lp-cidade': function (v) { return textoLimpo(v) ? null : 'Selecione a cidade.'; },
            'lp-assunto': function (v) { return textoLimpo(v) ? null : 'Selecione o assunto.'; },
            'lp-relato': function (v) {
                if (textoLimpo(v).length > 600) return 'Use no máximo 600 caracteres.';
                return null;   // campo opcional
            }
        };

        function campoDe(el) { return el.closest('.lp-campo') || el.closest('.lp-consent'); }

        function mostrarErro(el, msg) {
            var campo = campoDe(el);
            if (!campo) return;
            var saida = campo.querySelector('.lp-erro-campo');
            if (msg) {
                campo.setAttribute('data-invalido', 'true');
                el.setAttribute('aria-invalid', 'true');
                if (saida) saida.textContent = msg;
            } else {
                campo.removeAttribute('data-invalido');
                el.removeAttribute('aria-invalid');
                if (saida) saida.textContent = '';
            }
        }

        function validarCampo(el) {
            var regra = REGRAS[el.id];
            if (!regra) return true;
            var msg = regra(el.value);
            mostrarErro(el, msg);
            return !msg;
        }

        // Valida ao sair do campo, mas só limpa o erro enquanto digita — assim
        // ninguém vê "nome inválido" antes de terminar de escrever o nome.
        Object.keys(REGRAS).forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('blur', function () { validarCampo(el); });
            el.addEventListener('input', function () {
                var c = campoDe(el);
                if (c && c.getAttribute('data-invalido')) validarCampo(el);
            });
        });

        var consent = $('#lp-consent');
        if (consent) {
            consent.addEventListener('change', function () {
                mostrarErro(consent, consent.checked ? null : 'É necessário aceitar para continuar.');
            });
        }

        function mostrarStatus(tipo, html) {
            if (!status) return;
            status.className = 'lp-form-status ' + tipo;
            status.innerHTML = html;
            status.hidden = false;
        }

        function limparStatus() {
            if (!status) return;
            status.hidden = true;
            status.innerHTML = '';
            status.className = 'lp-form-status';
        }

        function montarDescricao(assunto, cidade, relato) {
            // A lead-api exige `descricao` com pelo menos 3 caracteres e
            // trabalha com uma lista fixa de áreas. Como o relato é opcional
            // aqui, o assunto e a cidade entram na descrição — nada se perde e
            // o contrato da API continua o mesmo.
            var partes = ['Assunto: ' + assunto, 'Cidade: ' + cidade];
            if (relato) partes.push('Relato: ' + relato);
            return partes.join(' | ');
        }

        function linkWhatsApp(nome, assunto) {
            var msg = 'Olá, sou ' + nome + '. Enviei meus dados pelo site sobre: ' + assunto + '.';
            return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg);
        }

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            limparStatus();

            // Armadilhas de spam: campo escondido preenchido, ou envio rápido
            // demais para ter sido digitado por uma pessoa. Nos dois casos o
            // robô recebe a mesma tela de sucesso e nada é gravado.
            var hp = $('#lp-site');
            var rapidoDemais = (Date.now() - carregadoEm) < TEMPO_MINIMO_MS;
            if ((hp && hp.value) || rapidoDemais) {
                mostrarStatus('ok', '<strong>Recebemos seus dados.</strong>');
                return;
            }

            var invalidos = [];
            Object.keys(REGRAS).forEach(function (id) {
                var el = document.getElementById(id);
                if (el && !validarCampo(el)) invalidos.push(el);
            });
            if (consent && !consent.checked) {
                mostrarErro(consent, 'É necessário aceitar para continuar.');
                invalidos.push(consent);
            }

            if (invalidos.length) {
                mostrarStatus('erro', 'Confira os campos destacados e envie novamente.');
                invalidos[0].focus();
                return;
            }

            var nome = textoLimpo($('#lp-nome').value, 120);
            var telefone = textoLimpo($('#lp-telefone').value, 40);
            var cidade = textoLimpo($('#lp-cidade').value, 60);
            var assunto = textoLimpo($('#lp-assunto').value, 80);
            var relato = textoLimpo($('#lp-relato').value, 600);

            var eventId = idEvento();
            var dados = {
                nome: nome,
                telefone: telefone,
                area: 'Trabalhista',                 // valor aceito por validacao.js
                descricao: montarDescricao(assunto, cidade, relato),
                consentimento: true,
                pagina_origem: window.location.href.split('#')[0],
                referrer: document.referrer || null,
                event_id: eventId,
                fbp: cookie('_fbp'),
                fbc: fbcAtual()
            };
            CAMPOS_CAMPANHA.forEach(function (campo) {
                if (campanha[campo]) dados[campo] = campanha[campo];
            });

            botao.disabled = true;
            var rotuloOriginal = botao.textContent;
            botao.textContent = 'Enviando...';

            fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            }).then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (corpo) {
                    return { ok: r.ok, sc: r.status, corpo: corpo };
                });
            }).then(function (r) {
                // Sucesso só existe quando o servidor confirmou a gravação.
                if (r.ok && r.corpo && r.corpo.ok) {
                    var dl = origemCampanha();
                    dl.lead_area = 'trabalhista';
                    dl.lead_assunto = assunto;
                    dl.lead_cidade = cidade;
                    dl.lead_event_id = eventId;
                    evento('lead_form_submit_success', dl);

                    if (window.abPixel && typeof window.abPixel.rastrear === 'function') {
                        window.abPixel.rastrear('Lead', { content_category: 'Trabalhista' }, eventId);
                    }

                    form.hidden = true;
                    mostrarStatus('ok',
                        '<strong>Dados recebidos.</strong> O escritório vai retornar o contato pelo WhatsApp ' +
                        'ou telefone informado. Se preferir adiantar, envie sua mensagem agora:' +
                        '<a class="lp-btn lp-btn-wa" data-origem="pos-formulario" target="_blank" rel="noopener" href="' +
                        linkWhatsApp(nome, assunto) + '">Continuar pelo WhatsApp</a>');
                    status.focus();
                    return;
                }

                if (r.sc === 429) {
                    mostrarStatus('erro', 'Recebemos várias tentativas deste acesso. Aguarde alguns minutos ou fale direto pelo WhatsApp.');
                } else {
                    var msg = (r.corpo && r.corpo.erro) ? r.corpo.erro : 'Não foi possível registrar seu contato agora.';
                    mostrarStatus('erro', msg + ' Você pode tentar de novo ou falar pelo WhatsApp.');
                }
                botao.disabled = false;
                botao.textContent = rotuloOriginal;
            }).catch(function () {
                // Rede fora, DNS fora, CORS. Nenhum evento de sucesso é
                // disparado, e nada é prometido sobre reenvio automático: o
                // caminho garantido é o WhatsApp, e é ele que fica em destaque.
                mostrarStatus('erro',
                    '<strong>Não foi possível registrar seu contato agora.</strong> O servidor não respondeu. ' +
                    'Para falar com o escritório imediatamente: ' +
                    '<a class="lp-btn lp-btn-wa" data-origem="falha-envio" target="_blank" rel="noopener" href="' +
                    linkWhatsApp(nome, assunto) + '">Falar pelo WhatsApp</a>');
                botao.disabled = false;
                botao.textContent = rotuloOriginal;
            });
        });
    }
}());
