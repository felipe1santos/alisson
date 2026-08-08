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

## Solicitadas em 30/07/2026

Deploy no Coolify confirmado, as 12 páginas responderam HTTP 200 antes da solicitação. Indexação pedida página por página pela Inspeção de URL. Todas retornaram *"O URL foi adicionado a uma fila de rastreamento prioritário"*.

- [x] https://www.alissonbrandao.com.br/blog/voo-cancelado-companhia-nao-avisou-o-que-fazer.html
- [x] https://www.alissonbrandao.com.br/blog/atraso-de-voo-mais-de-4-horas-indenizacao-valor.html
- [x] https://www.alissonbrandao.com.br/blog/bagagem-extraviada-voo-internacional-indenizacao.html
- [x] https://www.alissonbrandao.com.br/blog/auxilio-doenca-negado-pericia-inss-o-que-fazer.html
- [x] https://www.alissonbrandao.com.br/blog/aposentadoria-por-invalidez-incapacidade-permanente.html
- [x] https://www.alissonbrandao.com.br/blog/bpc-loas-negado-inss-como-recorrer.html
- [x] https://www.alissonbrandao.com.br/blog/inss-nao-analisou-pedido-prazo-acao-judicial.html
- [x] https://www.alissonbrandao.com.br/blog/auxilio-doenca-ou-aposentadoria-por-incapacidade-qual-pedir.html
- [x] https://www.alissonbrandao.com.br/blog/plano-de-saude-recusou-internacao-liminar.html
- [x] https://www.alissonbrandao.com.br/blog/seguro-de-vida-negativa-de-pagamento-o-que-fazer.html

Sitemap `https://www.alissonbrandao.com.br/sitemap.xml` reenviado em 30/07/2026 — retorno "Sitemap enviado". O registro anterior era de 27/07/2026 com 24 páginas encontradas; agora o arquivo tem 35 URLs.

## Bloqueadas pela cota diária — refazer em 31/07/2026

O Search Console recusou as duas últimas com a mensagem *"Não foi possível processar a solicitação porque sua cota diária foi excedida. Tente novamente amanhã."* A cota é por propriedade e por dia, e foi consumida pelas 10 solicitações acima mais algumas repetições durante a operação.

- [ ] https://www.alissonbrandao.com.br/blog/seguro-de-automovel-negativa-de-pagamento-sinistro.html
- [ ] https://www.alissonbrandao.com.br/blog/isencao-imposto-de-renda-doenca-grave-aposentado.html

As duas já estão no ar, no `sitemap.xml` e com links internos — ou seja, seriam descobertas de qualquer forma. A solicitação manual apenas antecipa o rastreamento.

## Situação em 07/08/2026 — as 2 pendentes de 30/07 foram indexadas sozinhas

Relatório "Páginas" (dados de 04/08/2026): **35 indexadas · 4 não indexadas**.

Os 4 motivos são todos esperados e nenhum é página real do site:

| Motivo | Páginas | Situação |
|---|---|---|
| Excluída pela tag `noindex` | 1 | `privacidade.html` — proposital |
| Não encontrado (404) | 1 | Resquício do apex sem `www`, já corrigido por 301 |
| Página com redirecionamento | 1 | Apex → `www` |
| Página alternativa com tag canônica adequada | 1 | Variante consolidada na canônica |

**"Detectada, mas não indexada" = 0** e **"Rastreada, mas não indexada" = 0.**

Consequência: as duas URLs que ficaram bloqueadas pela cota em 30/07/2026 —
`blog/seguro-de-automovel-negativa-de-pagamento-sinistro.html` e
`blog/isencao-imposto-de-renda-doenca-grave-aposentado.html` — **foram indexadas sem
solicitação manual**, pelo sitemap e pelos links internos. A pendência está encerrada.

## Lote de 07/08/2026 — 8 páginas do silo previdenciário

Deploy no Coolify confirmado pelo usuário. As 8 URLs responderam **HTTP 200** e o
`canonical` de cada uma aponta para ela mesma, na versão `www`.

### Solicitação manual: BLOQUEADA pela cota diária

O Search Console recusou já na primeira tentativa, com *"A cota foi excedida — Não foi
possível processar a solicitação porque sua cota diária foi excedida. Tente novamente
amanhã."* A cota de 07/08 já havia sido consumida antes desta operação.

**Nenhuma das 8 URLs foi solicitada. Refazer em 08/08/2026:**

- [ ] https://www.alissonbrandao.com.br/advogado-previdenciario-vitoria-es.html
- [ ] https://www.alissonbrandao.com.br/advogado-para-processar-o-inss-vitoria-es.html
- [ ] https://www.alissonbrandao.com.br/advogado-aposentadoria-negada-vitoria-es.html
- [ ] https://www.alissonbrandao.com.br/blog/pensao-por-morte-inss-negada-uniao-estavel.html
- [ ] https://www.alissonbrandao.com.br/blog/aposentadoria-por-idade-rural-inss-documentos.html
- [ ] https://www.alissonbrandao.com.br/blog/aposentadoria-especial-insalubridade-ppp.html
- [ ] https://www.alissonbrandao.com.br/blog/salario-maternidade-inss-desempregada-mei.html
- [ ] https://www.alissonbrandao.com.br/blog/revisao-de-beneficio-inss-valor-errado.html

### Sitemap reenviado — este funcionou

`https://www.alissonbrandao.com.br/sitemap.xml` reenviado em 07/08/2026: retorno
**"Sitemap enviado"** e a coluna "Páginas encontradas" saltou de **35 para 43** na hora.
O reenvio do sitemap **não consome a cota de inspeção de URL** — é o canal a usar quando
a cota estiver esgotada.

Registro anterior: enviado em 30/07/2026, última leitura em 05/08/2026, 35 páginas.

**Nota operacional:** o lote de 30/07 mostra que a solicitação manual não é indispensável.
As duas URLs que ficaram de fora naquele dia foram indexadas do mesmo jeito. A solicitação
apenas antecipa o rastreamento.

**Armadilha observada:** clicar em "Solicitar indexação" duas vezes na mesma URL em poucos
segundos dispara o erro de cota mesmo com cota disponível. Clicar uma vez e aguardar o
teste ("Isso pode levar 1 ou 2 minutos") terminar.

## Lembretes

- Sitemap: https://www.alissonbrandao.com.br/sitemap.xml — **43 URLs** (23 até 27/07/2026 + 12 do lote de 30/07/2026 + 8 do lote de 07/08/2026).
- O `sitemap.xml` é atualizado no mesmo commit de cada página nova. Reenviar no Search Console **não** é necessário toda vez: o Google rebusca o arquivo sozinho. Reenvio manual só em lotes grandes (10+ URLs) ou quando o relatório acusar erro.
- Limite do Search Console: ~10-12 solicitações manuais/dia.
- Solicitar indexação não garante nem acelera a posição no ranking: apenas coloca a URL numa fila de rastreamento prioritário.
