# Fluxo de publicação: criar → hospedar → indexar

Este é o procedimento obrigatório para toda página nova. Seguir na ordem. Os passos 1 a 4 são feitos pelo Claude; o passo 5 é do usuário; os passos 6 a 8 voltam a ser compartilhados.

---

## 1. Criar a página

- Arquivo em `blog/<slug>.html` (artigo) ou `advogado-<tema>-<cidade>-es.html` (landing).
- Estrutura e blocos obrigatórios: ver `CLAUDE.md`.
- Escolher a imagem de capa em `img/blog/`. Se não houver imagem temática, reusar a mais próxima e registrar a pendência em `docs/PAGINAS.md`.

### Box de autoridade (obrigatório em todo post novo)

```html
<div class="artigo-cta">
    <div class="cta-autor">
        <img src="../fotos/alisson-brandao-advogado.jpg" alt="Alisson Brandão, advogado responsável pelo escritório, OAB/ES 27.871" class="cta-autor-foto" width="72" height="72" loading="lazy">
        <div class="cta-autor-info">
            <p class="cta-autor-nome">Alisson Brandão</p>
            <p class="cta-autor-oab">Advogado · OAB/ES 27.871</p>
            <p class="cta-autor-bio">Escritório no Centro de Vitória/ES, no Edifício Bemge. Atuação em Direito do Consumidor, Previdenciário e Cível em toda a Grande Vitória.</p>
        </div>
    </div>
    <p>[frase de chamada específica do tema da página]</p>
    <a href="https://wa.me/5527992291973?text=[mensagem%20url-encoded%20do%20tema]" class="btn-gold" target="_blank" rel="noopener">Falar no WhatsApp</a>
</div>
```

O CSS de `.cta-autor` já está em `css/style.css` (seção "BOX DE AUTORIDADE NO CTA DO ARTIGO"). A linha `cta-autor-bio` pode ser ajustada por área (Previdenciário, Tributário etc.).

### Cartão do autor na sidebar (obrigatório em todo post novo)

Vai dentro da `<aside class="artigo-sidebar">`, **depois** de `.sidebar-guias`. É o bloco de autoridade que acompanha a leitura na coluna da direita e leva o visitante de volta para a Home.

```html
<div class="sidebar-autor">
    <h4>Quem escreve</h4>
    <div class="sidebar-autor-topo">
        <img src="../fotos/alisson-brandao-advogado.jpg" alt="Alisson Brandão, advogado responsável pelo escritório, OAB/ES 27.871" class="sidebar-autor-foto" width="68" height="68" loading="lazy">
        <div>
            <p class="sidebar-autor-nome">Alisson Brandão</p>
            <p class="sidebar-autor-oab">Advogado · OAB/ES 27.871</p>
        </div>
    </div>
    <p class="sidebar-autor-bio">[bio de 1 a 2 linhas, com a ênfase da área da página]</p>
    <ul class="sidebar-autor-dados">
        <li>Av. Gov. Bley, 186, sala 804<br>Edifício Bemge · Centro<br>Vitória/ES · CEP 29010-150</li>
        <li><a href="tel:+5527992291973">(27) 99229-1973</a></li>
        <li><a href="mailto:alissonbrandao.adv@gmail.com">alissonbrandao.adv@gmail.com</a></li>
        <li><a href="https://www.instagram.com/alissonbrandao.adv" rel="noopener" target="_blank">@alissonbrandao.adv</a></li>
        <li><a href="../index.html#sobre">Perfil completo do advogado</a></li>
    </ul>
    <a href="https://wa.me/5527992291973?text=[mensagem%20url-encoded]" class="btn-gold" target="_blank" rel="noopener">Falar no WhatsApp</a>
    <a href="../index.html" class="sidebar-autor-home">← Ir para a página inicial</a>
</div>
```

O CSS de `.sidebar-autor` está em `css/style.css`, na seção "CARTAO DE AUTORIDADE DO AUTOR NA SIDEBAR". Em landing na raiz, os caminhos `../` viram caminhos sem prefixo.

## 2. Atualizar o `sitemap.xml`

Adicionar a URL no mesmo commit:

```xml
<url><loc>https://www.alissonbrandao.com.br/blog/<slug>.html</loc><priority>0.8</priority></url>
```

Prioridades usadas: `1.0` home · `0.9` landings comerciais · `0.8` artigos · `0.7` `blog.html`.

**Sim, o arquivo é atualizado toda vez.** É como o Google descobre a URL, e é uma linha.
**Não, não é preciso reenviar o sitemap no Search Console toda vez.** O Google rebusca o arquivo sozinho, em geral diariamente. Reenvio manual só quando muda muito (10+ URLs de uma vez) ou quando o relatório de sitemap acusa erro.

## 3. Garantir os links internos (e, se couber, o card em `blog.html`)

**Obrigatório:** no mínimo **2 links internos** de páginas da mesma área do direito apontando para a página nova — nos blocos "Continue lendo" (`artigo-links`) e na `sidebar-guias`. Isso não é opcional: é o que faz a página ser rastreada e receber autoridade.

**Obrigatório quando o hub da área existir:** incluir a página na listagem do hub (`advogado-<area>-vitoria-es.html`).

**Opcional:** card no `blog.html`. O índice é curado, com teto de ~18 cards, e **não** precisa conter todas as páginas do site. Se a página nova estiver entre os artigos mais recentes, entra **no topo** da `main.blog-lista` com thumbnail, título, `blog-meta` (categorias + cidade) e resumo de uma ou duas linhas — e o card mais antigo sai da listagem.

Sair do `blog.html` não desindexa nada: a página segue no `sitemap.xml`, no hub da área e nos links internos. Ver a seção "Arquitetura de descoberta" do `CLAUDE.md`.

## 4. Atualizar os docs e comitar

- `docs/PAGINAS.md`: marcar a página como criada, com categoria e data.
- Commit em português, formato Conventional Commits, e push:

```
git add -A
git commit -m "feat(seo): adiciona <n> paginas de <tema>"
git push origin main
```

## 5. Deploy — PONTO DE PARADA

O deploy **não** é automático. Depois do push, avisar o usuário:

> Push feito. Clica em **Deploy** no painel do Coolify (VPS `187.77.34.112`).

Não seguir para o passo 6 antes da confirmação de que o deploy rodou.

## 6. Verificar se está no ar

Para cada URL nova:

```bash
curl -sSI https://www.alissonbrandao.com.br/blog/<slug>.html | head -1
```

Esperado: `HTTP/2 200`. Conferir também que o `canonical` da página servida aponta para a própria URL `www`.

Se der 404, o deploy não pegou o arquivo — verificar no Coolify antes de prosseguir.

## 7. Indexar no Google Search Console — página por página

Propriedade: **domínio** (`sc-domain:alissonbrandao.com.br`), verificada por TXT no DNS (registros preservados na migração para o Cloudflare).

Para cada URL:

1. Search Console → **Inspeção de URL**;
2. colar a URL completa com `www`;
3. conferir "URL está no Google" ou "URL não está no Google";
4. clicar em **Solicitar indexação**;
5. aguardar a confirmação do enfileiramento.

**Limite: ~10 a 12 solicitações manuais por dia.** Lote maior que isso se divide em dois dias e o corte fica registrado em `docs/PAGINAS.md`.

Solicitar indexação **não** garante nem acelera posição de ranking — apenas coloca a URL em fila de rastreamento prioritário.

O Claude não tem login no Search Console. Duas formas de executar este passo:
- o usuário cola as URLs manualmente (a lista sai pronta ao final do lote); ou
- o Claude pilota o Chrome pelo MCP na sessão já logada do usuário e faz as inspeções uma a uma.

## 8. Registrar o status

- `docs/PAGINAS.md`: atualizar as colunas **No ar** e **Indexação**.
- `docs/INDEXACAO.md`: acrescentar o bloco da data com as URLs solicitadas.
- Comitar as duas atualizações (`docs: atualiza status de indexacao do lote de <data>`).

---

## Resumo em uma tela

| # | Passo | Quem |
|---|---|---|
| 1 | Criar HTML com box de autoridade | Claude |
| 2 | Adicionar URL no `sitemap.xml` | Claude |
| 3 | Garantir 2+ links internos e o hub da área (card em `blog.html` é opcional) | Claude |
| 4 | Atualizar `docs/PAGINAS.md`, commit + push | Claude |
| 5 | **Clicar Deploy no Coolify** | Usuário |
| 6 | Verificar HTTP 200 e canonical | Claude |
| 7 | Solicitar indexação, 1 URL por vez (máx. ~12/dia) | Usuário ou Claude via Chrome MCP |
| 8 | Atualizar `PAGINAS.md` + `INDEXACAO.md`, commit | Claude |
