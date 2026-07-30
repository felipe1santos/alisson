# Controle de Indexação — Google Search Console

> Este arquivo é o **log por data** das solicitações de indexação.
> O status consolidado de cada página (criada / no ar / sitemap / indexada) fica em **`docs/PAGINAS.md`**, que é a fonte única.
> O procedimento completo está em **`docs/FLUXO-PUBLICACAO.md`**.

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

## Pendentes de solicitação — lote de 30/07/2026

12 páginas criadas em 30/07/2026, já no `sitemap.xml`. **Aguardando deploy no Coolify** antes de solicitar indexação. Bate exatamente no limite diário do Search Console.

- [ ] https://www.alissonbrandao.com.br/blog/voo-cancelado-companhia-nao-avisou-o-que-fazer.html
- [ ] https://www.alissonbrandao.com.br/blog/atraso-de-voo-mais-de-4-horas-indenizacao-valor.html
- [ ] https://www.alissonbrandao.com.br/blog/bagagem-extraviada-voo-internacional-indenizacao.html
- [ ] https://www.alissonbrandao.com.br/blog/auxilio-doenca-negado-pericia-inss-o-que-fazer.html
- [ ] https://www.alissonbrandao.com.br/blog/aposentadoria-por-invalidez-incapacidade-permanente.html
- [ ] https://www.alissonbrandao.com.br/blog/bpc-loas-negado-inss-como-recorrer.html
- [ ] https://www.alissonbrandao.com.br/blog/inss-nao-analisou-pedido-prazo-acao-judicial.html
- [ ] https://www.alissonbrandao.com.br/blog/auxilio-doenca-ou-aposentadoria-por-incapacidade-qual-pedir.html
- [ ] https://www.alissonbrandao.com.br/blog/plano-de-saude-recusou-internacao-liminar.html
- [ ] https://www.alissonbrandao.com.br/blog/seguro-de-vida-negativa-de-pagamento-o-que-fazer.html
- [ ] https://www.alissonbrandao.com.br/blog/seguro-de-automovel-negativa-de-pagamento-sinistro.html
- [ ] https://www.alissonbrandao.com.br/blog/isencao-imposto-de-renda-doenca-grave-aposentado.html

Também vale reenviar o `sitemap.xml` nesse dia, porque o arquivo saltou de 23 para 35 URLs de uma vez.

## Lembretes

- Sitemap: https://www.alissonbrandao.com.br/sitemap.xml — **35 URLs** (23 até 27/07/2026 + 12 do lote de 30/07/2026).
- O `sitemap.xml` é atualizado no mesmo commit de cada página nova. Reenviar no Search Console **não** é necessário toda vez: o Google rebusca o arquivo sozinho. Reenvio manual só em lotes grandes (10+ URLs) ou quando o relatório acusar erro.
- Limite do Search Console: ~10-12 solicitações manuais/dia.
- Solicitar indexação não garante nem acelera a posição no ranking: apenas coloca a URL numa fila de rastreamento prioritário.
