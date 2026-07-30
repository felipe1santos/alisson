# CLAUDE.md — Site Alisson Brandão Advocacia

Site estático (HTML + CSS + JS puro, sem build). Domínio no ar: **https://www.alissonbrandao.com.br**

## Regras permanentes (valem para toda sessão)

1. **Domínio canônico é `https://www.alissonbrandao.com.br`.** Nunca usar `alissonbrandao.adv.br` em canonical, sitemap, robots ou JSON-LD.
2. **Toda página nova vai para o GitHub.** Commit + push em `origin/main` (`https://github.com/felipe1santos/alisson.git`). Nunca deixar página só no disco local.
3. **Deploy é manual no Coolify.** Depois do push, avisar o usuário para clicar **Deploy** no painel do Coolify (VPS Hostinger `187.77.34.112`, DNS/proxy pelo Cloudflare). Não existe auto-deploy.
4. **`sitemap.xml` é atualizado no mesmo commit da página.** Sempre. Sem exceção.
5. **`docs/PAGINAS.md` é atualizado no mesmo commit.** É o mapa mestre: status de cada página e backlog do que ainda falta criar. É o primeiro arquivo a ler quando o usuário pedir "veja o que falta e crie".
6. **`docs/INDEXACAO.md`** registra o log das solicitações de indexação no Google Search Console, por data.
7. **Todo post novo do blog leva o box de autoridade do Alisson** no CTA de WhatsApp (`.artigo-cta` + `.cta-autor`): foto `fotos/alisson-brandao-advogado.jpg`, nome, `OAB/ES 27.871` e uma linha de credencial. Ver `docs/FLUXO-PUBLICACAO.md` para o HTML padrão.
8. **O fluxo completo de publicar → hospedar → indexar está em `docs/FLUXO-PUBLICACAO.md`.** Seguir na ordem.

## Convenções de arquivo

| Tipo | Padrão | Exemplo |
|---|---|---|
| Artigo de blog | `blog/<slug-cauda-longa>.html` | `blog/bpc-loas-negado-inss-como-recorrer.html` |
| Landing comercial | `advogado-<tema>-<cidade>-es.html` (raiz) | `advogado-trabalhista-vitoria-es.html` |
| Imagem de capa | `img/blog/<tema>.jpg` | `img/blog/desconto-inss-idoso-aposentado.jpg` |

Slug sempre em minúsculas, sem acento, separado por hífen, com a palavra-chave de cauda longa.

## Estrutura obrigatória de um artigo

Copiar de um post existente (`blog/bpc-loas-negado-inss-como-recorrer.html` é uma boa referência) e manter:

- `<title>` com palavra-chave + `| Alisson Brandão`, meta description de 150–160 caracteres;
- `<link rel="canonical">` com URL `www` absoluta;
- Open Graph completo;
- JSON-LD **`Article`** com `author` = `Person` (Alisson Brandão, `jobTitle` Advogado, `identifier` OAB/ES 27.871, `image` do headshot);
- JSON-LD **`BreadcrumbList`** (Início → Blog → página);
- JSON-LD **`FAQPage`** com as mesmas 4 perguntas do bloco `<details>` visível — texto idêntico nos dois lugares;
- `<h1>` único, `blog-meta` com categorias + cidade + mês de atualização;
- imagem de capa com `alt` descritivo e `loading="lazy"`;
- `artigo-layout` com `artigo-main` + `artigo-sidebar`;
- seção `artigo-faq` com 4 `<details>`;
- seção `artigo-bairros` com ~20–28 bairros da cidade-alvo (fonte: `js/bairros.js`);
- `artigo-cta` **com o box de autoridade**;
- `artigo-links` "Continue lendo" com 4 links internos;
- footer e botão flutuante de WhatsApp idênticos aos demais.

Conteúdo: 1.200 a 1.800 palavras, linguagem direta, sem promessa de resultado. Valores de indenização sempre como "referência de jurisprudência, não promessa de resultado" (Código de Ética da OAB e Provimento 205/2021 do CFOAB).

## Não mexer sem pedido explícito

- `privacidade.html` é `noindex` **por decisão do projeto** e **não entra no sitemap**.
- `js/bairros.js` é a fonte canônica das listas de bairros; a seção `#atendimento` do `index.html` é HTML estático gerado a partir dela.
