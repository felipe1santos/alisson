/* Meta Pixel — Alisson Brandão Advocacia.
   Carregado no <head> de todas as páginas. O ID mora só aqui. */
(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
}(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'));

(function () {
    var PIXEL_ID = '2516505455429077';
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');

    // Fachada usada pelo js/leads.js. Existir aqui evita que o leads.js
    // precise saber o formato da chamada do fbq — e evita erro se o
    // fbevents.js for bloqueado por extensão do visitante.
    window.abPixel = {
        id: PIXEL_ID,
        rastrear: function (evento, parametros, eventId) {
            try {
                if (typeof window.fbq !== 'function') return;
                if (eventId) {
                    window.fbq('track', evento, parametros || {}, { eventID: eventId });
                } else {
                    window.fbq('track', evento, parametros || {});
                }
            } catch (e) { /* rastreamento nunca pode quebrar a página */ }
        }
    };
}());
