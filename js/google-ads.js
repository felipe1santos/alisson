/* ==========================================================================
   google-ads.js — Google tag (gtag.js) + conversões do Google Ads
   --------------------------------------------------------------------------
   Carregado no <head> de TODAS as páginas, ao lado do js/pixel.js. Motivo de
   ser site inteiro e não só a landing do anúncio: o Google só consegue medir
   a conversão se a mesma tag que viu o clique do anúncio estiver presente na
   página onde a conversão acontece — e o visitante pode ler um artigo do blog
   antes de chamar no WhatsApp. Tag em uma página só perde essas conversões.

   O arquivo faz três coisas:

   1. Carrega o gtag.js e roda o `config` da conta de Ads (ID abaixo).
   2. Expõe `window.abAds.conversao(nome, params, callback)` para o
      js/landing-lead.js disparar a conversão no mesmo instante em que já
      empurra o evento para o dataLayer.
   3. Em páginas que NÃO carregam o js/landing-lead.js (blog, demais
      landings), registra sozinho o clique em link de WhatsApp e em link
      `tel:` — assim o restante do site também converte sem precisar de JS
      próprio em cada página.

   RÓTULOS DE CONVERSÃO
   --------------------------------------------------------------------------
   O ID da conta (AW-...) sozinho não registra conversão nenhuma. Cada ação de
   conversão criada no Google Ads tem um rótulo próprio, e é o par
   `AW-ID/RÓTULO` que o gtag precisa receber. Enquanto o par estiver vazio
   aqui, o evento é ignorado sem quebrar nada — o resto da medição (pageview,
   gclid, Meta Pixel) continua funcionando.

   Onde pegar: Google Ads → Metas → Conversões → Ações de conversão → criar
   ação do tipo "Site" com configuração manual → em "Ver snippet de evento" o
   Google mostra o `send_to` completo. É ele que entra abaixo, inteiro: o ID
   antes da barra diz PARA QUAL CONTA a conversão vai.

   Sem dependências externas.
   ========================================================================== */
(function () {
    'use strict';

    /* DUAS CONTAS DE ADS, UMA SÓ RECEBE CONVERSÃO
       ------------------------------------------------------------------
       AW_TAG é a tag que já estava instalada no site. AW_ALISSON é o ID de
       conversão da conta 428-973-0072, a do escritório — foi ele que o
       Google Ads devolveu ao criar a ação "WhatsApp | Clique no site".

       Os dois carregam: o pageview da página já sai para os dois destinos,
       porque as tags estão pareadas do lado do Google. Manter o config do
       AW_TAG preserva esse destino legítimo; a CONVERSÃO, porém, vai só
       para a conta do escritório, que é quem paga a campanha. */
    var AW_TAG     = 'AW-18428416238';
    var AW_ALISSON = 'AW-18393588578';

    /* send_to completo de cada conversão: 'AW-ID/RÓTULO'.
       - lead_whatsapp: clique num botão de WhatsApp da landing. Mede
         INTENÇÃO DE CONTATO — não prova mensagem enviada, nem conversa
         respondida, nem contratação.
       - lead_formulario: sem uso. A landing não tem mais formulário; o
         contato começa direto na conversa.
       - lead_telefone: sem ação criada no Google Ads. Vazio = não envia. */
    var CONVERSOES = {
        lead_whatsapp:   AW_ALISSON + '/FhGkCK2XwfIcEOLG38JE',
        lead_formulario: '',
        lead_telefone:   ''
    };

    /* ------------------------------------------------------------------
       gtag.js
       ------------------------------------------------------------------ */

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    gtag('js', new Date());
    gtag('config', AW_TAG);
    gtag('config', AW_ALISSON);

    (function () {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_TAG;
        var primeiro = document.getElementsByTagName('script')[0];
        primeiro.parentNode.insertBefore(s, primeiro);
    }());

    /* ------------------------------------------------------------------
       Fachada de conversão
       ------------------------------------------------------------------
       `callback` existe por causa do redirecionamento para o wa.me na mesma
       aba: sem esperar o gtag confirmar o envio, a navegação cancela a
       requisição e a conversão se perde. O `event_callback` do gtag resolve
       isso, mas só dispara se a tag carregou — por isso o tempo limite
       abaixo, que segue a navegação mesmo se o gtag estiver bloqueado.
       ------------------------------------------------------------------ */

    var TEMPO_LIMITE_CALLBACK = 900; // ms

    function conversao(nome, params, callback) {
        var destino = CONVERSOES[nome];
        var seguir = callback;

        if (seguir) {
            var jaSeguiu = false;
            var original = seguir;
            seguir = function () {
                if (jaSeguiu) return;
                jaSeguiu = true;
                original();
            };
            window.setTimeout(seguir, TEMPO_LIMITE_CALLBACK);
        }

        if (!destino) {
            // Sem ação de conversão configurada: não há o que enviar, mas a
            // navegação não pode ficar presa esperando.
            if (seguir) seguir();
            return;
        }

        var dados = { send_to: destino };
        if (params) {
            for (var k in params) {
                if (Object.prototype.hasOwnProperty.call(params, k)) dados[k] = params[k];
            }
        }
        if (seguir) dados.event_callback = seguir;

        try {
            window.gtag('event', 'conversion', dados);
        } catch (e) {
            if (seguir) seguir();
        }
    }

    /* Nome do evento do dataLayer → ação de conversão. O js/landing-lead.js
       chama por aqui, então quem mexer nos nomes de evento de lá mexe num
       lugar só. */
    var POR_EVENTO = {
        lead_whatsapp_redirect:    'lead_whatsapp',   // painel preenchido → conversa
        lead_whatsapp_click:       'lead_whatsapp',   // link de WhatsApp fora do painel
        lead_form_submit_success:  'lead_formulario',
        lead_phone_click:          'lead_telefone'
    };

    function conversaoPorEvento(evento, params, callback) {
        var nome = POR_EVENTO[evento];
        if (!nome) {
            if (callback) callback();
            return;
        }
        conversao(nome, params, callback);
    }

    window.abAds = {
        id: AW_TAG,
        idConversao: AW_ALISSON,
        conversao: conversao,
        conversaoPorEvento: conversaoPorEvento,
        rotulos: CONVERSOES
    };

    /* ------------------------------------------------------------------
       Páginas sem js/landing-lead.js
       ------------------------------------------------------------------
       Nas landings de campanha o próprio landing-lead.js chama a conversão,
       com o contexto de grupo de anúncio junto. Registrar o clique aqui
       também contaria a mesma conversa duas vezes — daí a checagem.

       A checagem espera o DOM ficar pronto. Este arquivo carrega no <head>,
       e o js/landing-lead.js entra no fim do <body>: consultar antes disso
       não encontrava a tag, o listener era registrado mesmo nas landings e
       cada clique de WhatsApp virava DUAS conversões. Corrigido em
       09/09/2026, confirmado com um clique por botão da landing.
       ------------------------------------------------------------------ */

    function registrarCliquesAvulsos() {
        if (document.querySelector('script[src*="landing-lead.js"]')) return;

        document.addEventListener('click', function (ev) {
            var alvo = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
            if (!alvo) return;

            var href = alvo.getAttribute('href') || '';

            if (href.indexOf('wa.me/') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
                conversao('lead_whatsapp', { pagina: window.location.pathname });
                return;
            }

            if (href.indexOf('tel:') === 0) {
                conversao('lead_telefone', { pagina: window.location.pathname });
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registrarCliquesAvulsos);
    } else {
        registrarCliquesAvulsos();
    }
}());
