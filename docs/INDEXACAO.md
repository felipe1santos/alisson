# Controle de Indexação — Google Search Console

Fluxo: toda página nova criada entra aqui como **pendente**. Quando a indexação for solicitada no Search Console, a página passa para **solicitada** e, uma vez confirmada no relatório "Páginas", para **indexada**.

Legenda: `[ ]` pendente · `[x]` indexação solicitada/confirmada

Propriedade: **domínio** (`sc-domain:alissonbrandao.com.br`), verificada por TXT no DNS. Os dois registros `google-site-verification` foram replicados no Cloudflare na migração de 27/07/2026, então a verificação continua válida.

## Solicitadas em 27/07/2026

- [x] https://www.alissonbrandao.com.br/advogado-trabalhista-vitoria-es.html
- [x] https://www.alissonbrandao.com.br/blog/verbas-rescisorias-demissao-sem-justa-causa.html
- [x] https://www.alissonbrandao.com.br/blog/horas-extras-nao-pagas-como-cobrar.html
- [x] https://www.alissonbrandao.com.br/blog/assedio-moral-no-trabalho-indenizacao.html (já rastreada em 27/07 18:52)
- [x] https://www.alissonbrandao.com.br/blog/rescisao-indireta-trabalhista.html
- [x] https://www.alissonbrandao.com.br/blog/golpe-pix-cobranca-indevida-banco.html (estava "detectada, mas não indexada")
- [x] https://www.alissonbrandao.com.br/blog/divorcio-consensual-cartorio-vitoria.html (estava "rastreada, mas não indexada")

## Situação em 27/07/2026

15 páginas indexadas · 4 não indexadas, pelos motivos:

| Motivo | URL | Situação |
|---|---|---|
| Excluída por `noindex` | `privacidade.html` | Proposital. Removida do sitemap em 27/07 para eliminar a contradição |
| Não encontrado (404) | `http://alissonbrandao.com.br/` | Apex sem www não respondia. Corrigido por Redirect Rule 301 no Cloudflare (apex → www), ativa quando a zona entrar no ar |
| Detectada, não indexada | `blog/golpe-pix-cobranca-indevida-banco.html` | Indexação solicitada em 27/07 |
| Rastreada, não indexada | `blog/divorcio-consensual-cartorio-vitoria.html` | Indexação solicitada em 27/07 |

## Fora da lista (de propósito)

- `privacidade.html` — `noindex`, não indexar e não incluir no sitemap.

## Lembretes

- Sitemap: https://www.alissonbrandao.com.br/sitemap.xml — 23 URLs. Reenviado em 27/07/2026 após a inclusão das páginas trabalhistas.
- Limite do Search Console: ~10-12 solicitações manuais/dia.
- Solicitar indexação não garante nem acelera a posição no ranking: apenas coloca a URL numa fila de rastreamento prioritário.
