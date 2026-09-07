# Rastreamento — Google Ads e Meta

Onde mora cada coisa e o que ainda falta para a conversão fechar o ciclo.

## Arquivos

| Arquivo | Papel |
|---|---|
| `js/google-ads.js` | Google tag (gtag.js) da conta **AW-18428416238** + conversões do Google Ads. Carregado no `<head>` das 62 páginas. |
| `js/pixel.js` | Meta Pixel `2516505455429077`. Carregado nas mesmas 62 páginas. |
| `js/landing-lead.js` | Só nas landings de campanha. Guarda `gclid`/`utm_*`, empurra os eventos para o `dataLayer` e avisa o `google-ads.js`. |

A tag do Ads está no site **inteiro**, não só na landing do anúncio. O Google
só mede a conversão se a mesma tag que viu o clique do anúncio estiver na
página onde a conversão acontece — e o visitante costuma ler um artigo do blog
antes de chamar no WhatsApp. Tag em uma página só perde essas conversões.

## Falta: os rótulos das ações de conversão

O ID `AW-18428416238` sozinho **não registra conversão nenhuma**. Cada ação de
conversão tem um rótulo próprio, e é o par `AW-18428416238/RÓTULO` que o gtag
precisa receber. Enquanto o rótulo estiver vazio, o evento é descartado sem
quebrar nada — pageview, `gclid` e Meta Pixel seguem funcionando.

Como pegar cada rótulo:

1. Google Ads → **Metas → Conversões → Ações de conversão** → **+ Nova ação**;
2. tipo **Site** → **Adicionar manualmente** (não usar a verificação por URL,
   que não enxerga clique em link de WhatsApp);
3. criar as três ações abaixo;
4. em **Configurar tag → Instalar manualmente**, o Google mostra
   `send_to: 'AW-18428416238/XXXXXXXXXXXXXXX'`. A parte **depois da barra** é o
   rótulo;
5. colar em `js/google-ads.js`, no objeto `CONVERSOES`.

| Ação no Google Ads | Chave em `CONVERSOES` | Categoria | Contagem | Principal? |
|---|---|---|---|---|
| Lead — WhatsApp iniciado | `lead_whatsapp` | Enviar formulário de lead | Uma | **Sim** |
| Lead — Formulário enviado | `lead_formulario` | Enviar formulário de lead | Uma | Sim |
| Lead — Clique no telefone | `lead_telefone` | Contato por telefone | Uma | Não (secundária) |

O telefone fica como secundária de propósito: daqui só dá para ver o clique no
link `tel:`, não se a ligação foi atendida. Otimizar o lance por esse número
levaria a campanha a comprar clique que não vira atendimento.

## Quais eventos viram conversão

`js/google-ads.js`, mapa `POR_EVENTO`:

| Evento do `dataLayer` | Vira | Quando |
|---|---|---|
| `lead_whatsapp_redirect` | `lead_whatsapp` | painel de pré-atendimento preenchido → abre a conversa. É a conversão principal. |
| `lead_whatsapp_click` | `lead_whatsapp` | clique em link de WhatsApp fora do painel |
| `lead_form_submit_success` | `lead_formulario` | a lead-api **confirmou** a gravação |
| `lead_phone_click` | `lead_telefone` | clique em link `tel:` |

Nas páginas sem `landing-lead.js` (blog e demais landings), o próprio
`google-ads.js` escuta o clique em WhatsApp e telefone. Ele se desliga quando
detecta o `landing-lead.js` na página, senão a mesma conversa contaria duas
vezes.

### O redirecionamento espera a conversão

O painel abre o WhatsApp na **mesma aba** (`window.location.assign`) porque
`window.open` depois de submit é bloqueado em boa parte dos navegadores
móveis. Sair da página antes de o gtag terminar cancela a requisição e a
conversão se perde. Por isso a navegação só acontece no `event_callback` do
gtag, com tempo limite de 900 ms em `google-ads.js` — se a tag estiver
bloqueada por extensão, a conversa abre do mesmo jeito.

## Testar

**Tag instalada** (funciona já, antes dos rótulos):

- Google Ads → Metas → Conversões → **Diagnóstico da tag**: a conta passa a
  ver a tag depois de algumas horas de tráfego real;
- imediato: abrir a página com a extensão **Google Tag Assistant**
  (tagassistant.google.com) → deve listar `AW-18428416238`;
- sem extensão: DevTools → Network → filtrar `googletagmanager` → tem que
  aparecer `gtag/js?id=AW-18428416238` com status 200, e depois um `/collect`.

**Conversão** (só depois de colar os rótulos):

1. abrir a landing com `?gclid=teste123` na URL;
2. clicar no botão de WhatsApp, preencher o painel e enviar;
3. DevTools → Network → filtrar `google` → tem que sair uma chamada para
   `googleadservices.com/pagead/conversion` **antes** do redirecionamento;
4. no Google Ads, a conversão aparece no relatório em até ~3 h (a coluna
   "Todas as conv." é a que atualiza primeiro).

## Próximo passo depois disso

- **Conversões otimizadas (enhanced conversions)**: o formulário já coleta nome
  e telefone; enviar o hash desses dados junto melhora a atribuição em iOS.
  Exige aceitar os termos no Google Ads e passar `user_data` no evento.
- **Importação offline**: marcar no CRM qual conversa virou contrato e subir
  como conversão offline pelo `gclid` — é o que faz a campanha otimizar para
  cliente, não para conversa.
