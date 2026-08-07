# Silo previdenciário — hub, landings de intenção e 5 artigos

Data: 07/08/2026 · Área: Direito Previdenciário (INSS)

## Problema

O site tem 6 páginas de INSS publicadas e **nenhum hub de área**. `docs/PAGINAS.md` marca
`advogado-previdenciario-vitoria-es.html` como "prioridade máxima". Sem o hub, as 6 páginas
dependem só do `sitemap.xml` e de links cruzados entre si, e o `blog.html` (29 cards, teto 18)
não pode ser enxugado porque nenhuma delas teria caminho de navegação alternativo.

Além disso, o site não tem nenhuma página capturando **intenção de contratação** em
previdenciário — as buscas do tipo "advogado para processar o INSS", "aposentadoria negada
o que fazer" caem hoje em artigos informativos, que convertem pior.

## Escopo

8 páginas novas, todas do silo previdenciário.

### 1. Hub de área

`advogado-previdenciario-vitoria-es.html` — raiz, sitemap `0.9`.

Padrão estrutural do `advogado-trabalhista-vitoria-es.html`:
`blog-hero` → `artigo-capa` → `landing-trust` → `landing-steps` (3 passos) → seções por
benefício → FAQ (`faq-list` com 4 `<details>`) → `atendimento-local` → `artigo-cta` →
`artigo-links`.

JSON-LD: `LegalService` + `FAQPage`.

O bloco `artigo-links` lista **todas as 11 páginas do silo** (6 existentes + 5 novas). É esse
bloco que substitui o `blog.html` como caminho de navegação da área.

### 2. Landings de intenção

Raiz, sitemap `0.9`. Mais curtas que o hub, foco em conversão, apontam para o hub e para os
artigos correspondentes.

| Arquivo | Intenção de busca coberta |
|---|---|
| `advogado-para-processar-o-inss-vitoria-es.html` | "como processar o INSS", "vale a pena processar o INSS", "quanto custa", "quanto tempo demora", JEF x Justiça Federal |
| `advogado-aposentadoria-negada-vitoria-es.html` | "aposentadoria negada o que fazer", negativa por tempo de contribuição, idade, carência, aposentadoria especial |

Risco de canibalização com o hub: mitigado por recorte distinto. O hub responde "quais
benefícios o escritório atende"; as landings respondem a uma pergunta única e específica.

### 3. Cinco artigos

`blog/`, sitemap `0.8`, estrutura obrigatória do `CLAUDE.md` (Article + BreadcrumbList +
FAQPage, 4 `<details>` com texto idêntico ao JSON-LD, `artigo-bairros`, box de autoridade
`.cta-autor`, `artigo-links` com 4 links).

| Arquivo | Cidade-alvo | Imagem (reuso) |
|---|---|---|
| `blog/pensao-por-morte-inss-negada-uniao-estavel.html` | Vila Velha | `advogado-assinatura-contrato.jpg` |
| `blog/aposentadoria-por-idade-rural-inss-documentos.html` | Viana | `desconto-inss-idoso-aposentado.jpg` |
| `blog/aposentadoria-especial-insalubridade-ppp.html` | Serra | `trabalhador-construcao-brasil.jpg` |
| `blog/salario-maternidade-inss-desempregada-mei.html` | Cariacica | `pensao-alimenticia-mae-filha.jpg` |
| `blog/revisao-de-beneficio-inss-valor-errado.html` | Vitória | `emprestimo-consignado-calculadora.jpg` |

As cidades repetem as dos 6 posts INSS existentes porque a Grande Vitória tem 6 municípios e
todos já foram usados. O diferenciador entre as páginas é o tema, não a cidade; a lista de
bairros de `js/bairros.js` é recortada em subconjuntos diferentes por página.

## Links internos

Regra do `CLAUDE.md`: toda página nova precisa de **2+ links entrantes de páginas da mesma
área**. Implementação:

1. cada página nova entra no `artigo-links` do hub (1 link);
2. os **6 artigos INSS existentes** são editados para incluir as páginas novas em
   `sidebar-guias` e/ou `artigo-links`;
3. as páginas novas linkam entre si nos respectivos `artigo-links`.

## Footer sitewide

O hub recebe link do rodapé em todas as páginas: nova entrada `Direito Previdenciário` na
coluna "Atuação", ao lado das landings já listadas. Edit mecânico em ~40 arquivos.

## Fora de escopo

- **`blog.html` não é alterado.** Está com 29 cards contra teto de ~18. Adicionar 8 cards
  agravaria a pendência registrada em `docs/PAGINAS.md`. A descoberta das páginas novas vem
  do `sitemap.xml`, do hub e dos links internos — que é exatamente o que a seção "Arquitetura
  de descoberta" do `CLAUDE.md` prevê.
- Enxugamento do `blog.html` — depende dos outros 5 hubs, que ficam para uma leva futura.
- Imagens temáticas próprias — mantém-se o reuso, com a pendência registrada.

## Atualizações de controle

- `sitemap.xml`: 8 URLs novas (3 com `0.9`, 5 com `0.8`).
- `docs/PAGINAS.md`: mover os 5 artigos do backlog para a tabela de Previdenciário, marcar o
  hub como criado, atualizar o placar (32 → 40 páginas) e registrar o reuso de imagens.

## Critério de conclusão

- 8 arquivos HTML criados, cada um com canonical `www` absoluto apontando para si mesmo;
- toda página nova presente no `sitemap.xml`;
- toda página nova com 2+ links entrantes de páginas previdenciárias;
- `docs/PAGINAS.md` refletindo o estado real;
- commit + push em `origin/main`, seguido do aviso de Deploy manual no Coolify.
