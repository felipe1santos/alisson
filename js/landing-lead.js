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

   4. No celular (<= 720px), substituir tudo isso por um caminho único:
      validar os campos no navegador, montar a mensagem e redirecionar para
      o WhatsApp. Nenhuma requisição sai da página — sem lead-api, sem
      Formspree, sem e-mail, sem banco.

   As duas camadas não se cruzam. O que roda acima de 720px é exatamente o
   que foi aprovado no commit 2fa012a; o que roda abaixo está na seção 6 e
   não existe no desktop.

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

    // Divisor das duas camadas. Acima disto vale o comportamento aprovado;
    // abaixo, a experiência de celular da seção 6.
    var MOBILE = window.matchMedia
        ? window.matchMedia('(max-width: 720px)')
        : { matches: document.documentElement.clientWidth <= 720 };
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

    // No celular não sobra nenhum atalho de WhatsApp ou telefone para
    // registrar: a seção 6 os retira da página.
    if (!MOBILE.matches) document.addEventListener('click', function (ev) {
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

    // Só no desktop. No celular nenhuma requisição sai da página: o
    // formulário da seção 6 não depende de servidor nenhum.
    if (!MOBILE.matches) {
        testarApi().then(function (disponivel) {
            if (!disponivel) return;      // segue só com WhatsApp e telefone
            if (!ativarFormulario()) return;
            ligarCartoesSituacao();
            iniciarFormulario();
        });
    }

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
    /* ==================================================================
       6. CAMADA DO CELULAR
       ==================================================================
       Tudo abaixo de 720px. Duas diferenças de fundo em relação ao que
       roda no desktop:

         · não existe servidor nenhum. Os campos são validados no
           navegador, viram uma mensagem e a pessoa segue para o
           WhatsApp. Nada é gravado, nada é enviado por e-mail, nenhuma
           requisição sai da página;

         · o caminho de conversão é um só. Os atalhos de WhatsApp e
           telefone espalhados pela página saem de cena, para que o
           formulário do fim seja a única saída.

       Nada disto é necessário para o conteúdo aparecer: as classes de
       recolhimento e de animação são postas por este arquivo, então uma
       falha de script deixa a página inteira visível e legível.
       ================================================================== */

    var movimentoReduzido = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    function $$(sel, raiz) {
        return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
    }

    /* ------------------------------------------------------------------
       6.1  Validação
       ------------------------------------------------------------------ */

    function soDigitos(s) { return (s || '').replace(/\D+/g, ''); }

    /* Telefone brasileiro: DDD de 11 a 99, mais 8 dígitos (fixo) ou 9
       dígitos começando em 9 (celular). Recusa sequência de dígito
       repetido, que é o formato do número inventado. */
    function telefoneValido(valor) {
        var d = soDigitos(valor);
        if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
        if (d.length !== 10 && d.length !== 11) return false;
        var ddd = parseInt(d.slice(0, 2), 10);
        if (!(ddd >= 11 && ddd <= 99)) return false;
        if (d.length === 11 && d.charAt(2) !== '9') return false;
        if (/^(\d)\1+$/.test(d.slice(2))) return false;
        return true;
    }

    function mascaraTelefone(valor) {
        var d = soDigitos(valor);
        /* Quem cola o número do próprio WhatsApp costuma trazer o +55.
           Sem tirar o código do país, a máscara empurraria o 55 para o
           lugar do DDD e o número seria recusado. */
        if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
        d = d.slice(0, 11);
        if (d.length <= 2) return d.length ? '(' + d : '';
        if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
        return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    }

    var REGRAS_WA = [
        { id: 'wa-nome', erro: 'erro-wa-nome',
          testa: function (v) { return v.trim().length >= 5 && v.trim().indexOf(' ') > 0; },
          msg: 'Informe seu nome e sobrenome.' },
        { id: 'wa-telefone', erro: 'erro-wa-telefone',
          testa: telefoneValido,
          msg: 'Informe um telefone com DDD, por exemplo (27) 91234-5678.' },
        { id: 'wa-cidade', erro: 'erro-wa-cidade',
          testa: function (v) { return v !== ''; },
          msg: 'Selecione a sua cidade.' },
        { id: 'wa-assunto', erro: 'erro-wa-assunto',
          testa: function (v) { return v !== ''; },
          msg: 'Selecione o assunto.' },
        { id: 'wa-relato', erro: 'erro-wa-relato',
          testa: function (v) { return v.trim().length >= 15; },
          msg: 'Descreva o que aconteceu em pelo menos 15 caracteres.' }
    ];

    /* O visual de erro fica no invólucro (.lp-campo / .lp-consent), que é
       onde o CSS já espera o data-invalido. O campo carrega só o
       aria-invalid, para o leitor de tela. */
    function marcarErro(campo, alvoErro, msg) {
        var span = document.getElementById(alvoErro);
        if (span) span.textContent = msg || '';
        if (!campo) return;

        if (msg) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');

        var caixa = campo.closest ? campo.closest('.lp-campo, .lp-consent') : null;
        if (caixa) {
            if (msg) caixa.setAttribute('data-invalido', 'true');
            else caixa.removeAttribute('data-invalido');
        }
    }

    function validarCampoWa(regra) {
        var campo = document.getElementById(regra.id);
        if (!campo) return true;
        var ok = regra.testa(campo.value);
        marcarErro(campo, regra.erro, ok ? '' : regra.msg);
        return ok;
    }

    /* ------------------------------------------------------------------
       6.2  Mensagem do WhatsApp
       ------------------------------------------------------------------
       Só entra o que a pessoa escreveu. Nada de gclid, UTM ou identificador
       de campanha: esses ficam para a atribuição, não para a conversa com
       o advogado.
       ------------------------------------------------------------------ */

    function montarMensagem(d) {
        /* O relato quase sempre termina em ponto; somar outro deixaria ".."
           no meio da mensagem. */
        var relato = d.relato.replace(/[\s.;,]+$/, '');
        return 'Olá, sou ' + d.nome + ' e moro em ' + d.cidade + '. ' +
               'Meu assunto é ' + d.assunto + '. ' +
               'Resumo: ' + relato + '. ' +
               'Preenchi o formulário no site e gostaria de solicitar atendimento.';
    }

    function iniciarFormularioWhatsapp() {
        var form = document.getElementById('lp-form-wa');
        if (!form) return;

        var botao = document.getElementById('wa-enviar');
        var status = document.getElementById('wa-status');
        var comecou = false;
        var saindo = false;

        function dizer(texto, classe) {
            if (!status) return;
            status.textContent = texto || '';
            status.className = 'lp-form-status' + (classe ? ' ' + classe : '');
            status.hidden = !texto;
        }

        var telefone = document.getElementById('wa-telefone');
        if (telefone) {
            telefone.addEventListener('input', function () {
                var noFim = telefone.selectionStart === telefone.value.length;
                telefone.value = mascaraTelefone(telefone.value);
                if (noFim) {
                    try { telefone.setSelectionRange(telefone.value.length, telefone.value.length); }
                    catch (e) { /* alguns navegadores recusam em campo tel */ }
                }
            });
        }

        /* lead_form_start: primeiro toque real num campo, uma vez só. */
        $$('input, select, textarea', form).forEach(function (campo) {
            campo.addEventListener('focus', function () {
                if (comecou) return;
                comecou = true;
                evento('lead_form_start', origemCampanha());
            });
            campo.addEventListener('blur', function () {
                var regra = REGRAS_WA.filter(function (r) { return r.id === campo.id; })[0];
                if (regra && campo.value !== '') validarCampoWa(regra);
            });
        });

        var consent = document.getElementById('wa-consent');
        if (consent) {
            consent.addEventListener('change', function () {
                if (consent.checked) marcarErro(consent, 'erro-wa-consent', '');
            });
        }

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            if (saindo) return;   // já está indo para o WhatsApp

            var primeiroInvalido = null;
            var invalidos = [];

            REGRAS_WA.forEach(function (r) {
                if (!validarCampoWa(r)) {
                    invalidos.push(r.id);
                    if (!primeiroInvalido) primeiroInvalido = document.getElementById(r.id);
                }
            });

            if (consent) {
                var ok = consent.checked;
                marcarErro(consent, 'erro-wa-consent', ok ? '' : 'É preciso concordar para continuar.');
                if (!ok) {
                    invalidos.push('wa-consent');
                    if (!primeiroInvalido) primeiroInvalido = consent;
                }
            }

            /* Botão apertado com o formulário inválido não é lead: sai um
               evento próprio de erro, e o WhatsApp não abre. */
            if (invalidos.length) {
                var erro = origemCampanha();
                erro.lead_campos_invalidos = invalidos.join(',');
                evento('lead_form_validation_error', erro);

                dizer('Confira os campos destacados antes de continuar.', 'erro');
                if (primeiroInvalido) {
                    primeiroInvalido.focus();
                    if (primeiroInvalido.scrollIntoView) {
                        primeiroInvalido.scrollIntoView({
                            block: 'center',
                            behavior: movimentoReduzido.matches ? 'auto' : 'smooth'
                        });
                    }
                }
                return;
            }

            var dados = {
                nome: textoLimpo(document.getElementById('wa-nome').value, 120),
                cidade: document.getElementById('wa-cidade').value,
                assunto: document.getElementById('wa-assunto').value,
                relato: textoLimpo(document.getElementById('wa-relato').value, 600)
            };

            saindo = true;

            var base = origemCampanha();
            base.lead_area = 'trabalhista';
            base.lead_assunto = dados.assunto;
            base.lead_cidade = dados.cidade;
            evento('lead_form_submit', base);

            if (botao) {
                botao.disabled = true;
                botao.setAttribute('aria-busy', 'true');
                botao.textContent = 'Abrindo o WhatsApp…';
            }
            dizer('Abrindo o WhatsApp do escritório com a sua mensagem…', 'ok');

            var destino = 'https://wa.me/' + WHATSAPP + '?text=' +
                          encodeURIComponent(montarMensagem(dados));

            var saida = origemCampanha();
            saida.lead_area = 'trabalhista';
            saida.lead_origem = 'formulario-mobile';
            saida.lead_destino = 'wa.me/' + WHATSAPP;
            evento('lead_whatsapp_redirect', saida);

            /* Redirecionamento na própria aba. window.open depois do envio
               de um formulário costuma ser bloqueado no celular. */
            window.location.assign(destino);
        });

        /* lead_form_view: o formulário entrou na tela. Carregar a página
           não conta como visualização de formulário. */
        if ('IntersectionObserver' in window) {
            var visto = false;
            var obs = new IntersectionObserver(function (entradas) {
                entradas.forEach(function (en) {
                    if (!en.isIntersecting || visto) return;
                    visto = true;
                    obs.disconnect();
                    evento('lead_form_view', origemCampanha());
                });
            }, { threshold: 0.25 });
            obs.observe(form);
        }
    }

    /* ------------------------------------------------------------------
       6.3  Leitura enxuta
       ------------------------------------------------------------------
       Recolhe só o que é texto jurídico complementar — os parágrafos
       marcados com data-enxuto no HTML. Título, resumo e orientação de
       cada assunto ficam sempre visíveis, sem exigir toque nenhum.
       O texto inteiro permanece no HTML: muda quanto dele aparece de
       primeira, não o que existe na página.
       ------------------------------------------------------------------ */

    function enxugarTextos() {
        $$('[data-enxuto]').forEach(function (p, i) {
            if (p.dataset.enxutoPronto) return;

            var linhas = parseInt(p.getAttribute('data-enxuto'), 10) || 3;
            p.style.setProperty('--lp-linhas', linhas);
            p.classList.add('lp-enxuto');

            /* Se o texto já cabe nas linhas previstas, não faz sentido
               oferecer botão nenhum. */
            if (p.scrollHeight <= p.clientHeight + 2) {
                p.classList.remove('lp-enxuto');
                p.dataset.enxutoPronto = '1';
                return;
            }

            if (!p.id) p.id = 'lp-txt-' + i;

            var botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'lp-mais';
            botao.setAttribute('aria-expanded', 'false');
            botao.setAttribute('aria-controls', p.id);
            botao.textContent = 'Ler mais';

            botao.addEventListener('click', function () {
                var aberto = p.classList.toggle('lp-enxuto-aberto');
                botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
                botao.textContent = aberto ? 'Ler menos' : 'Ler mais';
            });

            p.parentNode.insertBefore(botao, p.nextSibling);
            p.dataset.enxutoPronto = '1';
        });
    }

    /* ------------------------------------------------------------------
       6.4  Um caminho só
       ------------------------------------------------------------------ */

    function neutralizarDesvios() {
        /* Os cartões de assunto deixam de ser links: no celular eles
           informam, não conduzem. */
        $$('a.lp-situacao').forEach(function (a) {
            a.removeAttribute('href');
            a.removeAttribute('data-assunto');
            a.removeAttribute('target');
            a.setAttribute('role', 'group');
        });

        /* O telefone deixa de ser clicável, mas o número segue na tela. */
        $$('a[href^="tel:"]').forEach(function (a) {
            a.removeAttribute('href');
            a.classList.add('lp-tel-texto');
        });

        /* O CSS já esconde todos os atalhos de WhatsApp; isto garante que
           nenhum deles continue alcançável pelo teclado. */
        $$('a[href*="wa.me"]').forEach(function (a) {
            if (a.offsetParent === null) a.setAttribute('tabindex', '-1');
        });
    }

    /* ------------------------------------------------------------------
       6.5  Entrada suave dos blocos
       ------------------------------------------------------------------ */

    function animarEntrada() {
        if (movimentoReduzido.matches || !('IntersectionObserver' in window)) return;

        var blocos = $$('.lp-situacao, .lp-tema, .lp-etapas li, .lp-lista-check li, ' +
                        '.lp-sec-head, .lp-faq details, .lp-cidades li, .lp-endereco, ' +
                        '.lp-atendimento-figura, .lp-sobre-grid, .lp-contato-mobile .lp-form');

        blocos.forEach(function (el) { el.classList.add('lp-revelar'); });

        function revelar(el) {
            if (el.classList.contains('lp-visivel')) return;
            el.classList.add('lp-visivel');
            /* Depois do efeito o bloco fica parado de vez: sem repetição e
               sem will-change preso na composição. */
            window.setTimeout(function () { el.classList.add('lp-pronto'); }, 1500);
        }

        var obs = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (en) {
                if (!en.isIntersecting) return;
                obs.unobserve(en.target);
                revelar(en.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        blocos.forEach(function (el) { obs.observe(el); });

        /* Rede de segurança. Um bloco só fica escondido enquanto espera a
           vez de entrar na tela — e há situações em que essa vez não chega:
           página dentro de um quadro recortado, aba carregada em segundo
           plano, extensão atrapalhando o observador. Passados três
           segundos, o que ainda estiver esperando aparece de uma vez.
           Conteúdo escondido por causa de efeito é conteúdo perdido. */
        window.setTimeout(function () {
            obs.disconnect();
            blocos.forEach(revelar);
        }, 3000);
    }

    /* ------------------------------------------------------------------
       6.6  Partida
       ------------------------------------------------------------------ */

    function partirMobile() {
        neutralizarDesvios();
        animarEntrada();
        iniciarFormularioWhatsapp();

        /* Recolher parágrafo depende de saber quantas linhas o texto ocupa,
           e isso só é confiável com a fonte final aplicada. As outras
           tarefas não esperam: qualquer atraso aqui deixaria blocos em
           opacidade zero enquanto as fontes viajam pela rede. */
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(enxugarTextos).catch(enxugarTextos);
            window.setTimeout(enxugarTextos, 2500);   // se a fonte nunca resolver
        } else {
            window.addEventListener('load', enxugarTextos);
        }
    }

    if (MOBILE.matches) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', partirMobile);
        } else {
            partirMobile();
        }
    }
}());
