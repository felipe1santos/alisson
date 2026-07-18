# Remodelação SEO — Alisson Brandão Advocacia — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remodelar o site estático do escritório Alisson Brandão (advogado em Vitória/ES) para ranquear no Google com SEO local na Grande Vitória, seguindo a estrutura do site de referência `advogadak.com.br`, mantendo a identidade visual atual (azul-marinho `#0b1c2e` + dourado `#cfa76e`).

**Architecture:** Site estático multi-página (HTML/CSS/JS puro, sem build). O `index.html` atual (monolítico, CSS/JS inline) será dividido em `css/style.css` + `js/main.js` compartilhados e ganhará novas seções (manifesto, long-tail, FAQ, SEO local por cidades/bairros, footer profissional). Serão criadas: 1 página de listagem de blog, 3 artigos de blog e 3 landing pages long-tail. SEO técnico: JSON-LD (`LegalService`/`LocalBusiness`/`FAQPage`/`Article`), sitemap, robots, canonical, OG tags.

**Tech Stack:** HTML5 semântico, CSS3 (custom properties já existentes), JavaScript vanilla, Google Fonts, Schema.org JSON-LD.

## Global Constraints

- **Identidade visual preservada:** paleta `--primary-blue: #0b1c2e`, `--secondary-blue: #152a40`, `--darker-blue: #061121`, `--accent-gold: #cfa76e`, `--text-light: #f4f4f4`, `--text-dark: #333333`. Header preto com borda dourada. NUNCA alterar essas cores.
- **Tipografia nova (aprovada pelo dono):** títulos `'Cormorant Garamond', serif` (pesos 500/600/700); corpo `'Lato', sans-serif` (mantido). O logotipo "ALISSON BRANDÃO" no header PERMANECE em `'Cinzel'` (identidade). Carregar só esses 3 fonts com `display=swap`.
- **Idioma:** todo conteúdo em pt-BR. `<html lang="pt-br">` em toda página.
- **WhatsApp:** número `5527992291973`, link padrão `https://wa.me/5527992291973?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20gostaria%20de%20falar%20sobre%20o%20meu%20caso.`
- **Contato:** Av. Gov. Bley 186, sala 804, Edifício Bemge, Centro, Vitória/ES, CEP 29010-150. Telefones (27) 99229-1973 e (27) 99979-6809. Instagram `@alissonbrandao.adv`.
- **Domínio:** ainda não confirmado. Usar a constante `https://alissonbrandao.adv.br` em canonical/sitemap/JSON-LD e registrar em `docs/PENDENCIAS.md` que o dono deve confirmar o domínio antes do deploy (busca e troca global).
- **OAB:** número da OAB/ES do advogado não informado. Usar o texto `OAB/ES` e registrar pendência em `docs/PENDENCIAS.md`.
- **URLs:** arquivos `.html` planos com slug keyword-rich (ex.: `advogado-extravio-de-bagagem-vitoria-es.html`). Artigos em `blog/*.html`. Links internos sempre relativos.
- **Todas as imagens** com `alt` descritivo contendo, quando natural, palavra-chave local (ex.: "Escritório de advocacia em Vitória ES — recepção").
- **Nunca copiar texto literal do site de referência** (advogadak.com.br) — usar apenas a estrutura; todo copy é original.
- **Não usar frameworks/CDNs de JS.** Só HTML/CSS/JS próprios + Google Fonts + Google Maps embed já existente.
- **Commits frequentes**, mensagens em Conventional Commits.

---

## Estrutura final de arquivos

```
C:\projetos\alisson\
├── index.html                                     (remodelado)
├── blog.html                                      (novo — listagem do blog)
├── blog\
│   ├── extravio-de-bagagem-indenizacao.html       (novo — artigo 1)
│   ├── emprestimo-consignado-nao-contratado.html  (novo — artigo 2)
│   └── negativacao-indevida-nome-sujo.html        (novo — artigo 3)
├── advogado-extravio-de-bagagem-vitoria-es.html   (novo — landing 1)
├── advogado-emprestimo-indevido-vitoria-es.html   (novo — landing 2)
├── advogado-negativacao-indevida-vitoria-es.html  (novo — landing 3)
├── css\style.css                                  (novo — CSS compartilhado)
├── js\main.js                                     (novo — JS compartilhado)
├── js\bairros.js                                  (novo — dados cidades/bairros)
├── sitemap.xml                                    (novo)
├── robots.txt                                     (novo)
├── docs\PENDENCIAS.md                             (novo — pendências do cliente)
├── fotos\ (já existe — 3 fotos reais do escritório, usar no carrossel)
├── bg.webp, log.webp, bg.png (já existem)
```

## Mapa da home remodelada (ordem das seções)

1. `<header>` — logo + nav (Início / Atuação / Sobre / Blog / Contato) — âncoras novas
2. `<section id="inicio">` Hero (primeira dobra — mantém bg.webp, h1 novo com keyword)
3. `<section class="manifesto">` — logo após a primeira dobra, fundo azul-escuro, frase de impacto (padrão da referência)
4. `<section id="atuacao">` — eyebrow tag "ATUAÇÃO" + h2 "Onde podemos te ajudar" + 6 cards
5. `<section class="casos">` — "Alguns casos em que podemos te ajudar" — 6 mini-blocos com texto de 4 linhas + link long-tail para blog/landing
6. `<section id="sobre">` — eyebrow tag "SOBRE" + h2 "Quem conduz o seu caso" + carrossel com fotos reais
7. `<section id="faq">` — "Perguntas frequentes" — accordion com 8 perguntas + schema FAQPage
8. `<section id="contato">` — grid contato + mapa (mantido do site atual)
9. `<section id="atendimento">` — SEO local: "Regiões atendidas na Grande Vitória" — 7 cidades clicáveis que expandem bairros
10. `<footer>` — 4 colunas profissional (padrão screenshot `Captura de tela 2026-07-18 010537.png`)
11. Botão WhatsApp flutuante pulsante (fixo, canto inferior direito)

---

### Task 0: Git init e commit de baseline

**Files:**
- Create: `.gitignore`
- Create: `docs\PENDENCIAS.md`

**Interfaces:**
- Produces: repositório git com snapshot do site atual, para diff seguro em todas as tasks seguintes.

- [ ] **Step 1: Inicializar repositório**

```powershell
git init; git add -A; git status
```

Expected: lista `index.html`, `bg.webp`, `log.webp`, `bg.png`, `fotos/*`, o plano em `docs/superpowers/plans/` e as duas capturas de tela.

- [ ] **Step 2: Criar `.gitignore`**

```
Thumbs.db
desktop.ini
*.log
```

- [ ] **Step 3: Criar `docs\PENDENCIAS.md`**

```markdown
# Pendências com o cliente (Alisson)

- [ ] Confirmar domínio definitivo. O código usa `https://alissonbrandao.adv.br` em canonical, sitemap, robots e JSON-LD — fazer busca/troca global antes do deploy.
- [ ] Número da inscrição OAB/ES (hoje o site mostra apenas "OAB/ES").
- [ ] E-mail profissional para o footer e JSON-LD (hoje não há e-mail no site).
- [ ] Conferir lista de bairros por cidade (js/bairros.js) — foi montada a partir de fontes públicas; validar com o cliente as regiões prioritárias.
- [ ] Criar/otimizar Google Business Profile apontando para o endereço do Edifício Bemge (fundamental para SEO local — fora do escopo do código).
```

- [ ] **Step 4: Commit**

```powershell
git add -A; git commit -m "chore: baseline do site atual antes da remodelacao SEO"
```

---

### Task 1: Extrair CSS/JS para arquivos compartilhados + nova tipografia

**Files:**
- Create: `css\style.css`
- Create: `js\main.js`
- Modify: `index.html` (remover `<style>` e `<script>` inline, linkar arquivos)

**Interfaces:**
- Produces: `css/style.css` com todas as classes atuais + design tokens; `js/main.js` com funções `moveSlide(n)`, `currentSlide(n)` e o modal WhatsApp. Todas as páginas novas linkarão `css/style.css` e `js/main.js` com caminho relativo (`css/style.css` na raiz, `../css/style.css` dentro de `blog/`).

- [ ] **Step 1: Criar `css/style.css`** — mover TODO o conteúdo do `<style>` do `index.html` atual (linhas 9–320) para o arquivo, sem alterações ainda.

- [ ] **Step 2: Atualizar tipografia no `css/style.css`**

Substituir o bloco `:root` e `h1,h2,h3`:

```css
:root {
    --primary-blue: #0b1c2e;
    --secondary-blue: #152a40;
    --darker-blue: #061121;
    --accent-gold: #cfa76e;
    --text-light: #f4f4f4;
    --text-dark: #333333;
    --font-logo: 'Cinzel', serif;
    --font-heading: 'Cormorant Garamond', serif;
    --font-body: 'Lato', sans-serif;
    --whatsapp-green: #25D366;
    --whatsapp-dark: #128C7E;
}

h1, h2, h3 {
    font-family: var(--font-heading);
    color: var(--primary-blue);
    font-weight: 600;
    letter-spacing: 0.3px;
}
```

E adicionar a classe do eyebrow tag (padrão da referência — etiqueta pequena dourada acima do h2):

```css
.eyebrow {
    display: block;
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--accent-gold);
    margin-bottom: 12px;
}
```

- [ ] **Step 3: Criar `js/main.js`** — mover todo o `<script>` inline do `index.html` (modal + carrossel). Envolver a inicialização em guardas para as páginas que não têm carrossel/modal:

```javascript
// Modal WhatsApp
const modal = document.getElementById("whatsappModal");
const btn = document.getElementById("openModalBtn");
const form = document.getElementById("waForm");

if (modal && btn && form) {
    const span = modal.querySelector(".close-btn");
    btn.onclick = () => { modal.style.display = "block"; };
    span.onclick = () => { modal.style.display = "none"; };
    window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
    form.onsubmit = (event) => {
        event.preventDefault();
        const nome = document.getElementById("nome").value;
        const telefone = document.getElementById("telefone").value;
        const descricao = document.getElementById("descricao").value;
        const mensagem = `Olá, meu nome é ${nome}. \nTelefone: ${telefone}. \n\nGostaria de falar sobre: ${descricao}`;
        window.open(`https://wa.me/5527992291973?text=${encodeURIComponent(mensagem)}`, "_blank");
        modal.style.display = "none";
        form.reset();
    };
}

// Carrossel
const track = document.querySelector(".carousel-track");
if (track) {
    let slideIndex = 0;
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    const updateCarousel = () => {
        track.style.transform = `translateX(-${slideIndex * 100}%)`;
        dots.forEach(d => d.classList.remove("active"));
        if (dots[slideIndex]) dots[slideIndex].classList.add("active");
    };
    window.moveSlide = (n) => {
        slideIndex = (slideIndex + n + slides.length) % slides.length;
        updateCarousel();
    };
    window.currentSlide = (n) => { slideIndex = n; updateCarousel(); };
    setInterval(() => window.moveSlide(1), 5000);
}
```

- [ ] **Step 4: Atualizar `index.html`** — remover `<style>` e `<script>` inline; no `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cormorant+Garamond:wght@500;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
```

E antes de `</body>`: `<script src="js/main.js"></script>`.

- [ ] **Step 5: Verificar** — abrir `index.html` no navegador: visual idêntico ao anterior exceto títulos em Cormorant Garamond; carrossel gira; modal abre e monta URL do WhatsApp.

```powershell
Start-Process "C:\projetos\alisson\index.html"
```

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "refactor: extrai CSS/JS para arquivos compartilhados e nova tipografia"
```

---

### Task 2: Hero + seção Manifesto (logo após a primeira dobra)

**Files:**
- Modify: `index.html` (hero e nova section)
- Modify: `css\style.css` (estilos `.manifesto`)

**Interfaces:**
- Consumes: `.eyebrow` da Task 1.
- Produces: âncoras `#inicio`, `#atuacao`, `#sobre`, `#contato`, `#faq`, `#atendimento` usadas pelo nav e pelas landing pages.

- [ ] **Step 1: Atualizar nav do header**

```html
<nav>
    <ul>
        <li><a href="#inicio">Início</a></li>
        <li><a href="#atuacao">Atuação</a></li>
        <li><a href="#sobre">Sobre</a></li>
        <li><a href="blog.html">Blog</a></li>
        <li><a href="#contato">Contato</a></li>
    </ul>
</nav>
```

- [ ] **Step 2: Atualizar hero com keyword local** (id muda de `home` para `inicio`; h1 ganha keyword "Advocacia em Vitória ES"):

```html
<section id="inicio" class="hero">
    <div class="container hero-content">
        <h1>Justiça, Ética e Compromisso</h1>
        <p>Advocacia e consultoria jurídica em Vitória/ES. Atendimento presencial na Grande Vitória e online para todo o Brasil.</p>
        <a href="#contato" class="btn-gold">Agendar Consulta</a>
    </div>
</section>
```

- [ ] **Step 3: Inserir seção manifesto logo após o hero** (estrutura da referência: fundo escuro, eyebrow "MANIFESTO", frase em duas linhas com palavra em dourado itálico, parágrafo curto, assinatura):

```html
<section class="manifesto">
    <div class="container">
        <span class="eyebrow">Manifesto</span>
        <h2>Não cuidamos apenas de processos.<br>
        Cuidamos de <em>pessoas</em> atravessando momentos decisivos.</h2>
        <p>Por trás de cada petição existe uma história, um patrimônio construído com esforço, uma família. Conduzimos cada caso com rigor técnico e com o respeito que esse momento exige.</p>
        <span class="manifesto-assinatura">— Alisson Brandão</span>
    </div>
</section>
```

- [ ] **Step 4: Estilos em `css/style.css`**

```css
.manifesto {
    background-color: var(--darker-blue);
    padding: 90px 0;
    text-align: center;
    color: var(--text-light);
}
.manifesto h2 {
    color: var(--text-light);
    font-size: 2.6rem;
    line-height: 1.3;
    max-width: 850px;
    margin: 0 auto 25px;
}
.manifesto h2 em {
    color: var(--accent-gold);
    font-style: italic;
}
.manifesto p {
    max-width: 650px;
    margin: 0 auto 30px;
    color: #c9c9c9;
    font-weight: 300;
    font-size: 1.05rem;
}
.manifesto-assinatura {
    font-family: var(--font-heading);
    font-style: italic;
    color: var(--accent-gold);
    font-size: 1.2rem;
}
@media (max-width: 600px) {
    .manifesto { padding: 60px 0; }
    .manifesto h2 { font-size: 1.8rem; }
}
```

- [ ] **Step 5: Verificar** — abrir no navegador: manifesto aparece imediatamente após rolar a primeira dobra, fundo azul-escuríssimo, frase com "pessoas" em dourado.

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "feat: hero com keyword local e secao manifesto apos primeira dobra"
```

---

### Task 3: Seção Atuação (tag ATUAÇÃO) + seção "Alguns casos em que podemos te ajudar" (long-tail)

**Files:**
- Modify: `index.html`
- Modify: `css\style.css`

**Interfaces:**
- Consumes: `.eyebrow`, âncora `#atuacao`.
- Produces: links relativos para `blog/extravio-de-bagagem-indenizacao.html`, `blog/emprestimo-consignado-nao-contratado.html`, `blog/negativacao-indevida-nome-sujo.html` e para as 3 landing pages (criadas nas Tasks 7–8; os links podem ficar 404 até lá — aceitável dentro do branch).

- [ ] **Step 1: Remodelar a seção de atuação** — mover para logo após o manifesto (antes do "Sobre", seguindo a referência). Adicionar eyebrow e trocar o h2:

```html
<section id="atuacao" class="services">
    <div class="container">
        <span class="eyebrow" style="text-align:center; display:block;">Atuação</span>
        <h2>Onde podemos te ajudar</h2>
        <div class="services-grid">
            <!-- manter os 6 service-cards atuais (Direito Civil, Família, Trabalhista, Criminal, Consultoria Empresarial, Consumidor) -->
        </div>
    </div>
</section>
```

Os 6 cards atuais permanecem com os mesmos textos.

- [ ] **Step 2: Criar seção de casos long-tail logo abaixo da atuação:**

```html
<section class="casos">
    <div class="container">
        <span class="eyebrow">Casos frequentes</span>
        <h2>Alguns casos em que podemos te ajudar</h2>
        <div class="casos-grid">
            <article class="caso-card">
                <h3>Empréstimo indevido no seu nome</h3>
                <p>Descontos de um empréstimo consignado que você nunca contratou aparecendo no benefício do INSS ou na folha de pagamento? Isso é mais comum do que parece — e a Justiça garante a devolução em dobro dos valores e, em muitos casos, indenização por danos morais. Veja como agir.</p>
                <a href="blog/emprestimo-consignado-nao-contratado.html">Empréstimo consignado não contratado: o que fazer →</a>
            </article>
            <article class="caso-card">
                <h3>Extravio ou perda de bagagem</h3>
                <p>A companhia aérea perdeu, danificou ou atrasou a entrega da sua mala? A responsabilidade da empresa é objetiva: você tem direito a reembolso das despesas e indenização por danos morais e materiais, mesmo em voos internacionais. Saiba os prazos e como documentar tudo.</p>
                <a href="blog/extravio-de-bagagem-indenizacao.html">Extravio de bagagem: seus direitos e indenização →</a>
            </article>
            <article class="caso-card">
                <h3>Nome negativado indevidamente</h3>
                <p>Foi surpreendido com o nome no Serasa ou SPC por uma dívida que não reconhece — ou que já pagou? A negativação indevida gera dano moral presumido, sem necessidade de provar prejuízo. É possível limpar o nome rapidamente por liminar e ainda ser indenizado.</p>
                <a href="blog/negativacao-indevida-nome-sujo.html">Negativação indevida: como limpar seu nome →</a>
            </article>
            <article class="caso-card">
                <h3>Voo cancelado ou com atraso</h3>
                <p>Cancelamentos e atrasos superiores a 4 horas geram direito a assistência material (alimentação, hospedagem, transporte) e, quando há falha da companhia, indenização por danos morais. Guarde os comprovantes: cada documento fortalece o seu caso contra a empresa aérea.</p>
                <a href="advogado-extravio-de-bagagem-vitoria-es.html">Advogado para problemas com voo em Vitória →</a>
            </article>
            <article class="caso-card">
                <h3>Cobrança indevida e golpes bancários</h3>
                <p>Tarifas que você não contratou, seguros embutidos no cartão, golpe do PIX ou compras não reconhecidas: as instituições financeiras respondem pelos danos causados por falhas na segurança dos seus serviços. Você pode reaver os valores e ser indenizado pelo transtorno.</p>
                <a href="advogado-emprestimo-indevido-vitoria-es.html">Advogado especialista em fraudes bancárias →</a>
            </article>
            <article class="caso-card">
                <h3>Plano de saúde negou cobertura</h3>
                <p>Negativa de exame, cirurgia, medicamento ou home care pelo plano de saúde costuma ser abusiva — especialmente em situações de urgência. É possível obter liminar em poucos dias para garantir o tratamento, além de indenização quando a recusa agrava o quadro do paciente.</p>
                <a href="advogado-negativacao-indevida-vitoria-es.html">Fale com um advogado do consumidor em Vitória →</a>
            </article>
        </div>
    </div>
</section>
```

- [ ] **Step 3: Estilos em `css/style.css`**

```css
.casos {
    background-color: #ffffff;
    padding: 90px 0;
}
.casos .eyebrow { text-align: center; }
.casos h2 { text-align: center; font-size: 2.4rem; margin-bottom: 50px; }
.casos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 30px;
}
.caso-card {
    border: 1px solid #e5e0d8;
    border-top: 3px solid var(--accent-gold);
    padding: 30px;
    background: #fdfcfa;
    transition: box-shadow 0.3s ease;
}
.caso-card:hover { box-shadow: 0 10px 25px rgba(11, 28, 46, 0.08); }
.caso-card h3 { font-size: 1.35rem; margin-bottom: 12px; }
.caso-card p { color: #555; font-size: 0.95rem; margin-bottom: 15px; }
.caso-card a { color: var(--primary-blue); font-weight: 700; font-size: 0.95rem; border-bottom: 1px solid var(--accent-gold); }
.caso-card a:hover { color: var(--accent-gold); }
@media (max-width: 600px) {
    .casos { padding: 50px 0; }
    .casos-grid { grid-template-columns: 1fr; gap: 20px; }
}
```

- [ ] **Step 4: Verificar** — abrir no navegador: 6 cards em grid, hover com sombra, links âncora corretos (os destinos ainda não existem — conferir apenas o `href`).

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat: secao atuacao com eyebrow e secao de casos long-tail"
```

---

### Task 4: Seção Sobre (tag SOBRE + fotos reais) + FAQ com schema

**Files:**
- Modify: `index.html`
- Modify: `css\style.css`

**Interfaces:**
- Consumes: carrossel (`moveSlide`/`currentSlide`) da Task 1; fotos em `fotos\`.
- Produces: âncora `#faq`; bloco JSON-LD `FAQPage` (mesmas 8 perguntas do HTML).

- [ ] **Step 1: Remodelar seção sobre** (fica DEPOIS de atuação/casos, seguindo a referência "Quem conduz seu caso"). Adicionar eyebrow "Sobre" e trocar imagens placeholder do Google pelas fotos reais:

```html
<section id="sobre" class="excellence-section">
    <div class="container">
        <span class="eyebrow">Sobre</span>
        <h2>Quem conduz o seu caso</h2>
        <p class="excellence-text">
            O escritório <strong>Alisson Brandão Advocacia &amp; Consultoria Jurídica</strong> pauta sua atuação na defesa intransigente dos direitos de seus clientes. Com sede no Edifício Bemge, no coração de Vitória/ES, atende toda a Grande Vitória — Vila Velha, Serra, Cariacica, Viana e Guarapari — de forma presencial, e todo o Brasil na modalidade online, oferecendo atendimento personalizado e estratégico na esfera consultiva e contenciosa.
        </p>
        <!-- carrossel mantido, com src trocados: -->
        <!-- fotos/WhatsApp Image 2026-07-17 at 16.16.41.jpeg  | alt="Escritório de advocacia Alisson Brandão em Vitória ES" -->
        <!-- fotos/WhatsApp Image 2026-07-17 at 16.16.17.jpeg  | alt="Ambiente interno do escritório Alisson Brandão Advocacia em Vitória" -->
        <!-- fotos/WhatsApp Image 2026-07-17 at 16.16.17 (1).jpeg | alt="Sala de reuniões do escritório de advocacia no Edifício Bemge, Centro de Vitória" -->
    </div>
</section>
```

Nos `<img>` do carrossel adicionar `loading="lazy"`.

- [ ] **Step 2: Criar seção FAQ** logo após a seção sobre:

```html
<section id="faq" class="faq">
    <div class="container">
        <span class="eyebrow">Dúvidas</span>
        <h2>Perguntas frequentes</h2>
        <div class="faq-list">
            <details class="faq-item">
                <summary>Quanto custa uma consulta com advogado em Vitória?</summary>
                <p>O valor da consulta varia conforme a complexidade do caso. Em muitos casos de direito do consumidor, a análise inicial pelo WhatsApp é gratuita e os honorários só são cobrados em caso de êxito. Entre em contato para entender como funciona no seu caso.</p>
            </details>
            <details class="faq-item">
                <summary>O escritório atende fora de Vitória?</summary>
                <p>Sim. Atendemos presencialmente toda a Grande Vitória — Vila Velha, Serra, Cariacica, Viana, Guarapari e Fundão — e, na modalidade online, clientes em todo o Brasil, com processos 100% digitais.</p>
            </details>
            <details class="faq-item">
                <summary>Preciso ir ao escritório para iniciar meu processo?</summary>
                <p>Não necessariamente. Hoje a maioria dos processos é eletrônica: documentos podem ser enviados pelo WhatsApp ou e-mail, e a procuração pode ser assinada digitalmente. O atendimento presencial no Edifício Bemge, no Centro de Vitória, está disponível para quem preferir.</p>
            </details>
            <details class="faq-item">
                <summary>Quanto tempo demora um processo de indenização?</summary>
                <p>Casos de consumidor de menor valor podem tramitar no Juizado Especial Cível, com decisões em poucos meses. Ações mais complexas na Justiça comum levam mais tempo. Na primeira análise do caso já indicamos o caminho mais rápido e a expectativa realista de prazo.</p>
            </details>
            <details class="faq-item">
                <summary>Descontaram um empréstimo que não fiz. O que faço primeiro?</summary>
                <p>Não assine nada com o banco antes de orientação jurídica. Reúna extratos que mostrem os descontos e registre a contestação no banco ou no INSS. Você pode ter direito à devolução em dobro dos valores e indenização por danos morais. Fale conosco para avaliar o caso.</p>
            </details>
            <details class="faq-item">
                <summary>A companhia aérea extraviou minha bagagem. Tenho direito a indenização?</summary>
                <p>Sim. A responsabilidade da companhia é objetiva: além do reembolso de despesas com itens de necessidade, é comum a condenação em danos morais. Registre o RIB (Registro de Irregularidade de Bagagem) ainda no aeroporto e guarde todos os comprovantes.</p>
            </details>
            <details class="faq-item">
                <summary>Advogado trabalhista cobra quanto?</summary>
                <p>Na esfera trabalhista é comum o contrato de honorários ad exitum — o advogado só recebe um percentual se você ganhar. Assim, o trabalhador consegue buscar seus direitos sem custo inicial. Consulte-nos para entender as condições do seu caso.</p>
            </details>
            <details class="faq-item">
                <summary>Como falar agora com um advogado?</summary>
                <p>Clique no botão do WhatsApp nesta página ou ligue para (27) 99229-1973. Descreva brevemente sua situação e retornaremos com uma primeira orientação e os próximos passos.</p>
            </details>
        </div>
    </div>
</section>
```

- [ ] **Step 3: Estilos FAQ em `css/style.css`**

```css
.faq { background-color: #f7f5f1; padding: 90px 0; }
.faq .eyebrow, .faq h2 { text-align: center; display: block; }
.faq h2 { font-size: 2.4rem; margin-bottom: 50px; }
.faq-list { max-width: 800px; margin: 0 auto; }
.faq-item {
    background: #fff;
    border: 1px solid #e5e0d8;
    margin-bottom: 12px;
    padding: 0;
}
.faq-item summary {
    cursor: pointer;
    padding: 20px 25px;
    font-weight: 700;
    color: var(--primary-blue);
    font-size: 1.05rem;
    list-style: none;
    position: relative;
    padding-right: 50px;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after {
    content: '+';
    position: absolute;
    right: 25px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--accent-gold);
    font-size: 1.5rem;
    font-weight: 400;
}
.faq-item[open] summary::after { content: '–'; }
.faq-item p { padding: 0 25px 20px; color: #555; }
@media (max-width: 600px) { .faq { padding: 50px 0; } }
```

- [ ] **Step 4: Adicionar JSON-LD FAQPage no `<head>` do `index.html`** — um `<script type="application/ld+json">` com `@type: FAQPage` e `mainEntity` contendo as MESMAS 8 perguntas/respostas do HTML (copiar o texto exato de cada `summary` para `name` e de cada `<p>` para `acceptedAnswer.text`).

- [ ] **Step 5: Verificar** — abrir no navegador: fotos reais no carrossel; FAQ abre/fecha com `+`/`–`; validar JSON-LD colando o bloco em https://validator.schema.org (sem erros).

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "feat: secao sobre com fotos reais e FAQ com schema FAQPage"
```

---

### Task 5: Seção SEO local — cidades e bairros da Grande Vitória (accordion acima do rodapé)

**Files:**
- Create: `js\bairros.js`
- Modify: `index.html` (nova section entre `#contato` e `<footer>`)
- Modify: `css\style.css`

**Interfaces:**
- Consumes: nada.
- Produces: `window.BAIRROS_GV` (objeto `{cidade: [bairros]}`) e a section `#atendimento` renderizada por JS.

- [ ] **Step 1: Criar `js/bairros.js`** com o objeto de dados. Lista base abaixo (montada a partir das divisões oficiais dos municípios; um passo de verificação vem a seguir):

```javascript
window.BAIRROS_GV = {
    "Vitória": ["Centro", "Jardim da Penha", "Jardim Camburi", "Praia do Canto", "Mata da Praia", "Bento Ferreira", "Enseada do Suá", "Santa Helena", "Santa Lúcia", "Santa Luíza", "Barro Vermelho", "Ilha do Boi", "Ilha do Frade", "Ilha de Santa Maria", "Monte Belo", "Jucutuquara", "Fradinhos", "Horto", "Nazareth", "Parque Moscoso", "Vila Rubim", "Santo Antônio", "Caratoíra", "Bela Vista", "Inhanguetá", "Estrelinha", "Mário Cypreste", "Santa Tereza", "Ariovaldo Favalessa", "Fonte Grande", "Forte São João", "Romão", "Cruzamento", "Ilha das Caieiras", "São Pedro", "Santos Reis", "Redenção", "Nova Palestina", "Resistência", "Conquista", "São José", "Santo André", "Comdusa", "Maria Ortiz", "Solon Borges", "Segurança do Lar", "Antônio Honório", "Boa Vista", "Goiabeiras", "Aeroporto", "Jabour", "Morada de Camburi", "Pontal de Camburi", "República", "Maruípe", "São Cristóvão", "Tabuazeiro", "Bonfim", "Itararé", "Joana D'Arc", "Andorinhas", "Santa Martha", "Santa Cecília", "São Benedito", "Bairro da Penha", "Consolação", "Gurigica", "Praia do Suá", "Santa Clara", "Do Quadro", "Do Cabral", "Universitário", "Piedade", "Do Moscoso"],
    "Vila Velha": ["Centro de Vila Velha", "Praia da Costa", "Itapuã", "Itaparica", "Coqueiral de Itaparica", "Praia de Itaparica", "Glória", "Cristóvão Colombo", "Divino Espírito Santo", "Vila Garrido", "Paul", "Argolas", "São Torquato", "Ataíde", "Cobilândia", "Cobi de Baixo", "Cobi de Cima", "Alvorada", "Jardim Colorado", "Vale Encantado", "Cocal", "Santa Inês", "Ibes", "Araçás", "Jardim Guadalajara", "Jardim Asteca", "Vila Nova", "Novo México", "Soteco", "Guaranhuns", "Jockey de Itaparica", "Pontal das Garças", "Santa Mônica", "Santa Paula", "Nossa Senhora da Penha", "Boa Vista I", "Boa Vista II", "Coqueiral", "Ponta da Fruta", "Barra do Jucu", "Riviera da Barra", "Terra Vermelha", "São Conrado", "Morada da Barra", "Interlagos", "Barramares", "Cidade da Barra", "Jabaeté", "23 de Maio", "Ulisses Guimarães", "João Goulart", "Morada do Sol", "Rio Marinho", "Vale Verde", "Santa Rita", "Aribiri", "Ilha dos Ayres", "Dom João Batista", "Garoto", "Olaria", "Pedra dos Búzios", "Residencial Coqueiral"],
    "Serra": ["Serra Sede", "Laranjeiras", "Parque Residencial Laranjeiras", "Valparaíso", "Colina de Laranjeiras", "Morada de Laranjeiras", "Jardim Limoeiro", "Carapina", "Carapina Grande", "Bairro de Fátima", "Hélio Ferraz", "Manoel Plaza", "Serra Dourada I", "Serra Dourada II", "Serra Dourada III", "Barcelona", "Porto Canoa", "Vista da Serra I", "Vista da Serra II", "Planalto Serrano", "Novo Horizonte", "Feu Rosa", "Vila Nova de Colares", "Jardim Tropical", "Central Carapina", "André Carloni", "Jacaraípe", "Portal de Jacaraípe", "São Francisco", "Castelândia", "Estância Monazítica", "São Patrício", "Costa Dourada", "Bicanga", "Manguinhos", "Nova Almeida", "Praia Grande", "Cidade Continental", "Continental", "Jardim Carapina", "Eurico Salles", "Diamantina", "José de Anchieta", "Parque Res. Mestre Álvaro", "Caçaroca", "Chácara Parreiral", "Taquara I", "Taquara II", "Maringá", "Divinópolis", "Guaraciaba", "Cantinho do Céu", "Balneário de Carapebus", "Bairro das Laranjeiras", "Civit I", "Civit II"],
    "Cariacica": ["Campo Grande", "Itacibá", "Jardim América", "Alto Lage", "São Francisco", "Cruzeiro do Sul", "Vera Cruz", "Porto de Santana", "Flexal I", "Flexal II", "Nova Rosa da Penha", "Nova Canaã", "Castelo Branco", "Vila Capixaba", "Rio Branco", "Santana", "Itaquari", "Jardim Botânico", "Morada de Campo Grande", "Santa Fé", "São Geraldo", "Bela Aurora", "Mucuri", "Itanguá", "Dom Bosco", "Santo André", "São Vicente", "Vasco da Gama", "Padre Mathias", "Tucum", "Sotema", "Nova Valverde", "Valparaíso", "Expedito", "Santa Cecília", "Presidente Médici", "Aparecida", "Bandeirantes", "Oriente", "Maracanã", "Santa Catarina", "Alzira Ramos", "Novo Brasil", "Rosa da Penha", "Piranema"],
    "Viana": ["Viana Sede", "Marcílio de Noronha", "Vila Bethânia", "Nova Bethânia", "Industrial", "Universal", "Arlindo Villaschi", "Areinha", "Primavera", "Canaã", "Vale do Sol", "Soteco de Viana", "Parque Industrial", "Bom Pastor", "Ipanema", "Jucu"],
    "Guarapari": ["Centro de Guarapari", "Muquiçaba", "Praia do Morro", "Meaípe", "Nova Guarapari", "Enseada Azul", "Setiba", "Santa Mônica", "Aeroporto", "Ipiranga", "Jardim Boa Vista", "Kubitschek", "Itapebussu", "Praia dos Padres", "Bela Vista", "São Judas Tadeu", "Village do Sol", "Una", "Perocão", "Santa Margarida"],
    "Fundão": ["Fundão Sede", "Praia Grande de Fundão", "Timbuí", "Encantado", "Piabas", "Praça Oito"]
};
```

- [ ] **Step 2: Verificar/completar as listas** — usar WebSearch com consultas `"lista de bairros" Vitória ES site oficial`, `bairros de Vila Velha ES lista completa`, etc. (uma por cidade). Corrigir nomes errados e adicionar bairros oficiais faltantes ao `js/bairros.js`. Se a busca não estiver disponível na execução, manter a lista base e registrar em `docs/PENDENCIAS.md`.

- [ ] **Step 3: Adicionar a section no `index.html`** entre `#contato` e `<footer>`:

```html
<section id="atendimento" class="atendimento">
    <div class="container">
        <span class="eyebrow">Onde atendemos</span>
        <h2>Advocacia na Grande Vitória — cidades e bairros atendidos</h2>
        <p class="atendimento-intro">Atendemos presencialmente em toda a Região Metropolitana da Grande Vitória e online em todo o Brasil. Clique na sua cidade para ver os bairros atendidos.</p>
        <div id="cidades-accordion" class="cidades-grid"></div>
    </div>
</section>
```

- [ ] **Step 4: Renderização no `js/main.js`** (adicionar ao final):

```javascript
// SEO local — accordion cidades/bairros
const accordion = document.getElementById("cidades-accordion");
if (accordion && window.BAIRROS_GV) {
    for (const [cidade, bairros] of Object.entries(window.BAIRROS_GV)) {
        const det = document.createElement("details");
        det.className = "cidade-item";
        const sum = document.createElement("summary");
        sum.textContent = `Advogado em ${cidade}`;
        det.appendChild(sum);
        const wrap = document.createElement("div");
        wrap.className = "bairros-lista";
        const ul = document.createElement("ul");
        for (const b of bairros) {
            const li = document.createElement("li");
            li.textContent = b;
            ul.appendChild(li);
        }
        wrap.appendChild(ul);
        det.appendChild(wrap);
        accordion.appendChild(det);
    }
}
```

**Importante para SEO:** como o conteúdo é gerado por JS, o Google renderiza mas o ideal é conteúdo estático. DECISÃO: gerar o HTML final estático — depois de conferir o visual, copiar o HTML renderizado do accordion para dentro do `index.html` (conteúdo estático) e transformar o JS acima em fallback apenas se `#cidades-accordion` estiver vazio. Alternativa mais simples e preferida: escrever os `<details>` direto no HTML desde o início (sem JS), usando `js/bairros.js` apenas como fonte para gerar o bloco uma única vez durante a implementação. **Implementar a versão 100% estática no HTML final.**

- [ ] **Step 5: Estilos em `css/style.css`**

```css
.atendimento { background-color: var(--primary-blue); padding: 80px 0; }
.atendimento .eyebrow { text-align: center; }
.atendimento h2 { color: var(--text-light); text-align: center; font-size: 2rem; margin-bottom: 15px; }
.atendimento-intro { color: #b8c2cc; text-align: center; max-width: 700px; margin: 0 auto 40px; font-weight: 300; }
.cidades-grid { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 10px; }
.cidade-item { background: var(--secondary-blue); border: 1px solid rgba(207, 167, 110, 0.25); }
.cidade-item summary {
    cursor: pointer; padding: 16px 22px; color: var(--accent-gold);
    font-weight: 700; letter-spacing: 0.5px; list-style: none; position: relative;
}
.cidade-item summary::-webkit-details-marker { display: none; }
.cidade-item summary::after { content: '+'; position: absolute; right: 22px; color: var(--accent-gold); }
.cidade-item[open] summary::after { content: '–'; }
.bairros-lista ul {
    list-style: none; display: flex; flex-wrap: wrap; gap: 8px 18px;
    padding: 5px 22px 20px; margin: 0;
}
.bairros-lista li { color: #cfd8e0; font-size: 0.85rem; font-weight: 300; }
```

- [ ] **Step 6: Verificar** — abrir no navegador: 7 retângulos (um por cidade), clicar expande a lista de bairros, tudo acima do rodapé; conferir no "Exibir código-fonte" que os bairros estão no HTML estático (não só via JS).

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat: secao SEO local com cidades e bairros da Grande Vitoria"
```

---

### Task 6: Footer profissional 4 colunas + botão WhatsApp flutuante pulsante

**Files:**
- Modify: `index.html`
- Modify: `css\style.css`

**Interfaces:**
- Produces: markup `<footer>` e botão `.whatsapp-float` que serão REPLICADOS (copiar/colar ajustando caminhos relativos) em todas as páginas das Tasks 7–9.

- [ ] **Step 1: Substituir o `<footer>`** pelo padrão do screenshot de referência (4 colunas: marca / atuação / cidades / contato):

```html
<footer>
    <div class="container footer-grid">
        <div class="footer-col footer-brand">
            <p class="footer-logo">Alisson Brandão</p>
            <p class="footer-sub">ADVOCACIA</p>
            <p class="footer-desc">Advocacia e Consultoria Jurídica.<br>Atendimento estratégico com olhar humano.</p>
            <p class="footer-oab">OAB/ES</p>
        </div>
        <div class="footer-col">
            <h4>Atuação</h4>
            <ul>
                <li><a href="#atuacao">Direito Civil</a></li>
                <li><a href="#atuacao">Direito de Família</a></li>
                <li><a href="#atuacao">Direito Trabalhista</a></li>
                <li><a href="#atuacao">Direito do Consumidor</a></li>
                <li><a href="blog.html">Artigos</a></li>
                <li><a href="#faq">Perguntas Frequentes</a></li>
                <li><a href="advogado-extravio-de-bagagem-vitoria-es.html">Extravio de Bagagem</a></li>
                <li><a href="advogado-emprestimo-indevido-vitoria-es.html">Empréstimo Indevido</a></li>
                <li><a href="advogado-negativacao-indevida-vitoria-es.html">Negativação Indevida</a></li>
            </ul>
        </div>
        <div class="footer-col">
            <h4>Cidades</h4>
            <ul>
                <li><a href="#atendimento">Vitória</a></li>
                <li><a href="#atendimento">Vila Velha</a></li>
                <li><a href="#atendimento">Serra</a></li>
                <li><a href="#atendimento">Cariacica</a></li>
                <li><a href="#atendimento">Viana</a></li>
                <li><a href="#atendimento">Guarapari</a></li>
                <li><a href="#atendimento">Todas as cidades e bairros →</a></li>
            </ul>
        </div>
        <div class="footer-col">
            <h4>Contato</h4>
            <ul>
                <li><a href="tel:+5527992291973">(27) 99229-1973</a></li>
                <li><a href="tel:+5527999796809">(27) 99979-6809</a></li>
                <li>Av. Gov. Bley 186, sala 804<br>Edifício Bemge · Centro<br>Vitória/ES · CEP 29010-150</li>
                <li><a href="https://www.instagram.com/alissonbrandao.adv" rel="noopener" target="_blank">Instagram</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom">
        <div class="container footer-bottom-inner">
            <p>© 2026 Alisson Brandão Advocacia. Todos os direitos reservados.</p>
        </div>
    </div>
</footer>
```

- [ ] **Step 2: Botão WhatsApp flutuante** antes de `</body>`:

```html
<a href="https://wa.me/5527992291973?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20gostaria%20de%20falar%20sobre%20o%20meu%20caso."
   class="whatsapp-float" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
    <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M16 .8C7.6.8.8 7.6.8 16c0 2.7.7 5.3 2 7.6L.8 31.2l7.8-2c2.2 1.2 4.7 1.9 7.4 1.9 8.4 0 15.2-6.8 15.2-15.1S24.4.8 16 .8zm0 27.6c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.6 1.2 1.2-4.5-.3-.5c-1.3-2-2-4.4-2-6.8C3.2 9 8.9 3.2 16 3.2S28.8 9 28.8 16 23.1 28.4 16 28.4zm7-9.4c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.5-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.6-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 2.9 4.4 7 6.2 1 .4 1.7.7 2.3.9 1 .3 1.9.3 2.6.2.8-.1 2.3-.9 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.7-.5z"/></svg>
</a>
```

- [ ] **Step 3: Estilos em `css/style.css`**

```css
/* Footer profissional */
footer { background-color: #0a0a0a; color: rgba(255,255,255,0.65); padding: 70px 0 0; text-align: left; border-top: 3px solid var(--accent-gold); }
.footer-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1.1fr; gap: 40px; padding-bottom: 50px; }
.footer-logo { font-family: var(--font-heading); font-size: 1.7rem; color: #fff; margin-bottom: 2px; }
.footer-sub { color: var(--accent-gold); font-size: 0.75rem; letter-spacing: 4px; margin-bottom: 20px; }
.footer-desc { font-size: 0.95rem; font-weight: 300; margin-bottom: 20px; }
.footer-oab { color: rgba(255,255,255,0.4); font-size: 0.85rem; letter-spacing: 2px; }
.footer-col h4 { color: var(--accent-gold); font-family: var(--font-body); font-size: 0.8rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 22px; }
.footer-col ul { list-style: none; padding: 0; margin: 0; }
.footer-col li { margin-bottom: 12px; font-size: 0.95rem; font-weight: 300; }
.footer-col a { color: rgba(255,255,255,0.75); }
.footer-col a:hover { color: var(--accent-gold); }
.footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding: 22px 0; }
.footer-bottom-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; }
@media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; } }

/* WhatsApp flutuante pulsante */
.whatsapp-float {
    position: fixed; bottom: 25px; right: 25px; z-index: 1500;
    width: 60px; height: 60px; border-radius: 50%;
    background-color: var(--whatsapp-green);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: pulse-wa 2s infinite;
}
.whatsapp-float:hover { background-color: var(--whatsapp-dark); }
@keyframes pulse-wa {
    0%   { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6); }
    70%  { box-shadow: 0 0 0 18px rgba(37, 211, 102, 0); }
    100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
}
@media (prefers-reduced-motion: reduce) { .whatsapp-float { animation: none; } }
```

- [ ] **Step 4: Verificar** — footer com 4 colunas (empilha no mobile — testar com DevTools em 375px); botão verde pulsando no canto inferior direito, clique abre `wa.me`.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat: footer profissional 4 colunas e botao whatsapp flutuante"
```

---

### Task 7: SEO técnico do head da home (meta, OG, canonical, JSON-LD LegalService)

**Files:**
- Modify: `index.html` (`<head>`)

**Interfaces:**
- Produces: padrão de `<head>` SEO que as Tasks 8–9 replicam com os próprios títulos/descrições/canonicals.

- [ ] **Step 1: Substituir o `<head>` da home** (mantendo os links de fonte/CSS da Task 1):

```html
<title>Advogado em Vitória ES | Alisson Brandão Advocacia — Grande Vitória</title>
<meta name="description" content="Advogado em Vitória/ES. Direito do consumidor, civil, trabalhista e família. Atendimento na Grande Vitória — Vila Velha, Serra, Cariacica — e online em todo o Brasil. Fale no WhatsApp.">
<link rel="canonical" href="https://alissonbrandao.adv.br/">
<meta property="og:type" content="website">
<meta property="og:title" content="Advogado em Vitória ES | Alisson Brandão Advocacia">
<meta property="og:description" content="Advocacia e consultoria jurídica na Grande Vitória. Atendimento humano, estratégia jurídica rigorosa. Fale no WhatsApp.">
<meta property="og:url" content="https://alissonbrandao.adv.br/">
<meta property="og:image" content="https://alissonbrandao.adv.br/bg.png">
<meta property="og:locale" content="pt_BR">
<meta name="robots" content="index, follow">
```

- [ ] **Step 2: JSON-LD LegalService/LocalBusiness** (no `<head>`):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["LegalService", "LocalBusiness"],
  "@id": "https://alissonbrandao.adv.br/",
  "name": "Alisson Brandão Advocacia e Consultoria Jurídica",
  "description": "Advocacia especializada em direito do consumidor, civil, trabalhista, criminal e de família em Vitória/ES e Grande Vitória.",
  "url": "https://alissonbrandao.adv.br/",
  "image": "https://alissonbrandao.adv.br/bg.png",
  "telephone": "+55-27-99229-1973",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av. Governador Bley, 186, sala 804, Edifício Bemge",
    "addressLocality": "Vitória",
    "addressRegion": "ES",
    "postalCode": "29010-150",
    "addressCountry": "BR"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": -20.3196, "longitude": -40.3384 },
  "areaServed": ["Vitória", "Vila Velha", "Serra", "Cariacica", "Viana", "Guarapari", "Fundão", "Grande Vitória", "Espírito Santo", "Brasil"],
  "sameAs": ["https://www.instagram.com/alissonbrandao.adv"],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  "priceRange": "$$"
}
</script>
```

- [ ] **Step 3: Verificar** — validar os dois JSON-LD (LegalService + FAQPage da Task 4) em https://validator.schema.org — zero erros; conferir `<title>` na aba do navegador.

- [ ] **Step 4: Commit**

```powershell
git add -A; git commit -m "feat: SEO tecnico da home com meta tags, OG e JSON-LD LegalService"
```

---

### Task 8: Blog — listagem + 3 artigos

**Files:**
- Create: `blog.html`
- Create: `blog\extravio-de-bagagem-indenizacao.html`
- Create: `blog\emprestimo-consignado-nao-contratado.html`
- Create: `blog\negativacao-indevida-nome-sujo.html`
- Modify: `css\style.css` (estilos `.blog-*`, `.artigo-*`)

**Interfaces:**
- Consumes: `css/style.css`, `js/main.js`, footer e `.whatsapp-float` da Task 6 (copiar markup ajustando caminhos: dentro de `blog/` usar `../css/style.css`, `../js/main.js`, `../index.html#atuacao` etc.).
- Produces: os 3 URLs de artigo linkados pela home (Task 3) e pelas landings (Task 9).

**Template comum das páginas de blog** (usar em todas; trocar apenas title/description/canonical/conteúdo):

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{TITLE}</title>
    <meta name="description" content="{DESCRIPTION}">
    <link rel="canonical" href="https://alissonbrandao.adv.br/{PATH}">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cormorant+Garamond:wght@500;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{REL}css/style.css">
    {JSONLD_ARTICLE}
</head>
<body>
    <header> <!-- mesmo header da home, links com prefixo {REL} e âncoras para {REL}index.html#... --> </header>
    <main class="artigo-container container">
        {CONTEUDO}
    </main>
    <!-- footer da Task 6 com links prefixados {REL} -->
    <!-- .whatsapp-float da Task 6 -->
    <script src="{REL}js/main.js"></script>
</body>
</html>
```

- [ ] **Step 1: Estilos de blog em `css/style.css`**

```css
/* Blog */
.blog-hero { background-color: var(--primary-blue); padding: 70px 0; text-align: center; }
.blog-hero h1 { color: var(--accent-gold); font-size: 2.8rem; }
.blog-hero p { color: #b8c2cc; font-weight: 300; max-width: 650px; margin: 15px auto 0; }
.blog-lista { max-width: 800px; margin: 60px auto; padding: 0 20px; }
.blog-card { border: 1px solid #e5e0d8; border-left: 3px solid var(--accent-gold); padding: 30px; margin-bottom: 25px; background: #fdfcfa; }
.blog-card h2 { font-size: 1.6rem; margin-bottom: 10px; }
.blog-card h2 a { color: var(--primary-blue); }
.blog-card h2 a:hover { color: var(--accent-gold); }
.blog-card .blog-meta { color: #999; font-size: 0.85rem; margin-bottom: 12px; }
.blog-card p { color: #555; }

/* Artigo */
.artigo-container { max-width: 760px; padding: 60px 20px; }
.artigo-container h1 { font-size: 2.5rem; line-height: 1.2; margin-bottom: 15px; }
.artigo-container .blog-meta { color: #999; font-size: 0.9rem; margin-bottom: 35px; }
.artigo-container h2 { font-size: 1.8rem; margin: 40px 0 15px; }
.artigo-container h3 { font-size: 1.35rem; margin: 30px 0 12px; }
.artigo-container p, .artigo-container li { color: #444; font-size: 1.05rem; line-height: 1.8; margin-bottom: 18px; }
.artigo-container ul, .artigo-container ol { padding-left: 25px; }
.artigo-cta {
    background: var(--primary-blue); padding: 30px; margin: 40px 0; text-align: center; border-top: 3px solid var(--accent-gold);
}
.artigo-cta p { color: var(--text-light); margin-bottom: 20px; }
```

- [ ] **Step 2: Criar `blog.html`** — hero + listagem:

```html
<!-- head: -->
<title>Blog Jurídico | Alisson Brandão Advocacia — Vitória ES</title>
<meta name="description" content="Artigos sobre direito do consumidor, extravio de bagagem, empréstimo não contratado, negativação indevida e mais. Por Alisson Brandão Advocacia, Vitória/ES.">
<link rel="canonical" href="https://alissonbrandao.adv.br/blog.html">

<!-- body: -->
<section class="blog-hero">
    <div class="container">
        <h1>Blog Jurídico</h1>
        <p>Conteúdo prático sobre os seus direitos, escrito por quem atua todos os dias na defesa deles.</p>
    </div>
</section>
<main class="blog-lista">
    <article class="blog-card">
        <h2><a href="blog/extravio-de-bagagem-indenizacao.html">Extravio de bagagem: seus direitos e como pedir indenização</a></h2>
        <p class="blog-meta">Direito do Consumidor · Direito Aéreo</p>
        <p>A companhia aérea perdeu ou danificou sua mala? Veja os prazos para reclamar, os documentos que você precisa guardar e quanto os tribunais têm concedido de indenização.</p>
    </article>
    <article class="blog-card">
        <h2><a href="blog/emprestimo-consignado-nao-contratado.html">Empréstimo consignado não contratado: como cancelar e ser indenizado</a></h2>
        <p class="blog-meta">Direito do Consumidor · Direito Bancário</p>
        <p>Descontos no benefício do INSS por um empréstimo que você nunca fez? Saiba o passo a passo para cancelar, recuperar os valores em dobro e buscar danos morais.</p>
    </article>
    <article class="blog-card">
        <h2><a href="blog/negativacao-indevida-nome-sujo.html">Negativação indevida: como limpar seu nome e ser indenizado</a></h2>
        <p class="blog-meta">Direito do Consumidor</p>
        <p>Nome no Serasa ou SPC por dívida que não existe ou já foi paga? Entenda o dano moral presumido, a liminar para retirada rápida e os valores de indenização.</p>
    </article>
</main>
```

- [ ] **Step 3: Artigo 1 — `blog\extravio-de-bagagem-indenizacao.html`**

Head: `<title>Extravio de Bagagem: Direitos e Indenização [Guia 2026] | Alisson Brandão</title>`; description: `Bagagem extraviada, danificada ou violada? Veja prazos da ANAC, como registrar o RIB, valores de indenização por danos morais e como acionar a companhia aérea na Justiça.`; canonical `https://alissonbrandao.adv.br/blog/extravio-de-bagagem-indenizacao.html`; JSON-LD `Article` (headline = title, author `Person: Alisson Brandão`, publisher `Alisson Brandão Advocacia`, datePublished `2026-07-18`).

Conteúdo (escrever na íntegra, 1.200–1.800 palavras, seguindo exatamente esta estrutura de headings — o texto de cada seção deve desenvolver os pontos indicados):

```
H1: Extravio de bagagem: seus direitos e como pedir indenização
Meta interna: Direito do Consumidor · Atualizado em julho de 2026
Intro (2 parágrafos): cenário comum (esteira vazia, mala não aparece), responsabilidade objetiva da companhia (CDC + Código Brasileiro de Aeronáutica), promessa do artigo.
H2: O que caracteriza extravio, dano e violação de bagagem
  - extravio temporário vs. definitivo (mais de 7 dias voo doméstico / 21 dias internacional = definitivo, Resolução ANAC 400)
H2: O que fazer imediatamente no aeroporto
  - registrar o RIB (Registro de Irregularidade de Bagagem) antes de sair da área de desembarque
  - fotos, cartão de embarque, etiqueta da bagagem
H2: Seus direitos enquanto a mala não aparece
  - reembolso de despesas emergenciais (itens de higiene, roupas), prazo de ressarcimento
H2: Indenização por danos materiais e morais
  - danos materiais: valor dos bens (importância declarada), danos morais: jurisprudência STJ, faixas de valores usuais (R$ 3 mil a R$ 15 mil conforme o caso — citar como referência, não promessa)
H2: Prazos para entrar na Justiça
  - 5 anos relação de consumo voo doméstico (CDC); Convenção de Montreal 2 anos para voo internacional (STF RE 636.331)
H2: Como um advogado pode ajudar
  - Juizado Especial vs. Justiça comum, provas, cálculo do pedido
CTA (.artigo-cta): "Teve problema com bagagem em voo saindo de Vitória ou de qualquer aeroporto? Fale agora com um advogado." + botão WhatsApp (.btn-gold)
Link interno no fim: para advogado-extravio-de-bagagem-vitoria-es.html ("Atendemos Vitória, Vila Velha e toda a Grande Vitória") e para os outros 2 artigos.
```

- [ ] **Step 4: Artigo 2 — `blog\emprestimo-consignado-nao-contratado.html`**

Head: `<title>Empréstimo Consignado Não Contratado: Como Cancelar e Ser Indenizado | Alisson Brandão</title>`; description: `Desconto de empréstimo que você não fez no INSS ou salário? Aprenda a cancelar, receber em dobro o que foi descontado e pedir danos morais. Advogado em Vitória/ES.`; canonical próprio; JSON-LD `Article` (mesmos moldes).

Estrutura (1.200–1.800 palavras):

```
H1: Empréstimo consignado não contratado: como cancelar e ser indenizado
Intro: aposentado/pensionista descobre desconto no benefício; fraude comum; direitos claros.
H2: Como descobrir se há empréstimo em seu nome
  - extrato do benefício no Meu INSS, registro no banco
H2: Primeiros passos: conteste por escrito
  - contestação no banco, reclamação no Banco Central/Procon, boletim de ocorrência
  - NÃO aceitar acordo por telefone sem orientação
H2: Devolução em dobro dos valores descontados
  - art. 42, parágrafo único, CDC; entendimento do STJ (EAREsp 676.608 — dispensa má-fé, basta desconto indevido)
H2: Danos morais: quando cabem e valores usuais
  - desconto em verba alimentar = dano moral presumido em muitos julgados; faixas usuais (referência, não promessa)
H2: Documentos necessários para a ação
  - lista objetiva: RG/CPF, extrato do benefício, extratos bancários, contestação, contrato (se fornecido)
H2: Quanto tempo demora e quanto custa
  - Juizado Especial sem custas iniciais; honorários ad exitum comuns nesses casos
CTA: "Descontos indevidos no seu benefício? Envie seu extrato pelo WhatsApp e receba uma análise." + botão
Links internos: landing advogado-emprestimo-indevido-vitoria-es.html + outros 2 artigos.
```

- [ ] **Step 5: Artigo 3 — `blog\negativacao-indevida-nome-sujo.html`**

Head: `<title>Negativação Indevida: Como Limpar o Nome e Ser Indenizado | Alisson Brandão</title>`; description: `Nome sujo no Serasa/SPC por dívida inexistente ou já paga? Veja como obter liminar para limpar o nome em dias e indenização por dano moral presumido. Vitória/ES.`; canonical próprio; JSON-LD `Article`.

Estrutura (1.200–1.800 palavras):

```
H1: Negativação indevida: como limpar seu nome e ser indenizado
Intro: crédito negado no caixa; descoberta da negativação; impacto na vida financeira.
H2: O que é negativação indevida
  - dívida inexistente, fraude, dívida paga não baixada (prazo de 5 dias úteis para baixa após pagamento — jurisprudência STJ), dívida prescrita
H2: Dano moral presumido (in re ipsa)
  - Súmula 385 STJ (exceção: quem já tem negativação legítima anterior não ganha dano moral, mas mantém direito à exclusão)
H2: Como limpar o nome rapidamente: a liminar
  - tutela de urgência; multa diária ao órgão/empresa
H2: Quanto pagam de indenização
  - faixas usuais em ES/Brasil (referência, não promessa)
H2: Passo a passo prático
  - consultar Serasa/SPC/Boa Vista gratuitamente, juntar comprovantes, notificar a empresa, procurar advogado
H2: Perguntas rápidas (3 mini Q&A no corpo)
CTA + links internos: landing advogado-negativacao-indevida-vitoria-es.html + outros 2 artigos.
```

- [ ] **Step 6: Verificar** — abrir `blog.html`: 3 cards linkando para os artigos; abrir cada artigo: header/footer/whatsapp funcionando, links internos válidos (clicar em todos), JSON-LD validado em validator.schema.org.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat: blog com listagem e 3 artigos pilares de consumidor"
```

---

### Task 9: Landing pages long-tail (3 páginas de serviço local)

**Files:**
- Create: `advogado-extravio-de-bagagem-vitoria-es.html`
- Create: `advogado-emprestimo-indevido-vitoria-es.html`
- Create: `advogado-negativacao-indevida-vitoria-es.html`
- Modify: `css\style.css` (estilos `.landing-*` se necessário — reutilizar `.artigo-*`, `.faq-*`, `.manifesto`)

**Interfaces:**
- Consumes: todos os componentes anteriores (header, footer, whatsapp-float, faq-item, btn-gold, eyebrow). Caminhos relativos SEM prefixo (estão na raiz).
- Produces: as 3 páginas linkadas pela home (Task 3) e pelo footer (Task 6).

**Estrutura comum das landings** (na ordem):

1. Header (igual à home; nav aponta `index.html#...`)
2. Hero compacto (reutilizar `.blog-hero`): H1 com a keyword + subtítulo + `.btn-gold` para WhatsApp
3. Bloco de confiança: parágrafo "Atendemos Vitória, Vila Velha, Serra, Cariacica, Viana e Guarapari — presencialmente no Centro de Vitória (Edifício Bemge) e online em todo o Brasil."
4. Seção "Como funciona" (3 passos: WhatsApp → análise gratuita do caso → ação e acompanhamento)
5. Seção de conteúdo (600–900 palavras específicas da página, H2s próprios)
6. Mini-FAQ (4 `details.faq-item` específicos do tema) — com JSON-LD FAQPage próprio
7. CTA final `.artigo-cta` + link para o artigo de blog irmão ("Leia o guia completo")
8. Footer + whatsapp-float

**Head SEO por página:**

| Página | `<title>` | meta description (≤160c) |
|---|---|---|
| `advogado-extravio-de-bagagem-vitoria-es.html` | `Advogado Extravio de Bagagem em Vitória e Vila Velha ES` | `Advogado especialista em extravio de bagagem e problemas com voo em Vitória, Vila Velha e Grande Vitória. Análise do caso pelo WhatsApp. Indenização por danos morais.` |
| `advogado-emprestimo-indevido-vitoria-es.html` | `Advogado Empréstimo Consignado Indevido em Vitória ES` | `Advogado especialista em empréstimo não contratado e fraude bancária em Vitória/ES. Cancelamento, devolução em dobro e danos morais. Fale no WhatsApp.` |
| `advogado-negativacao-indevida-vitoria-es.html` | `Advogado Negativação Indevida em Vitória ES — Limpe seu Nome` | `Nome negativado indevidamente no Serasa/SPC? Advogado em Vitória/ES para liminar de exclusão e indenização por danos morais. Atende toda a Grande Vitória.` |

Cada página: canonical próprio, JSON-LD `LegalService` reduzido (name = título da página, `areaServed` = cidades da Grande Vitória, `url` = canonical) + `FAQPage` do mini-FAQ.

**H1 por página:**
- Landing 1: `Advogado especialista em extravio de bagagem em Vitória e Vila Velha`
- Landing 2: `Advogado especialista em empréstimo consignado indevido em Vitória`
- Landing 3: `Advogado para negativação indevida em Vitória — limpe seu nome`

**Conteúdo específico (H2s) por página:**

- Landing 1: `Perdeu a bagagem em voo saindo de Vitória?` / `O que a companhia aérea é obrigada a fazer` / `Quanto você pode receber de indenização` / `Por que agir rápido (prazos)` — mini-FAQ: "A companhia ofereceu um voucher, aceito?"; "Vale a pena processar por mala danificada?"; "Voo internacional muda alguma coisa?"; "Preciso ir ao fórum?".
- Landing 2: `Desconto no INSS ou no salário que você não reconhece?` / `Cancelamento e devolução em dobro` / `Danos morais por desconto em verba alimentar` / `Como enviamos seu caso à Justiça` — mini-FAQ: "O banco me ofereceu acordo, assino?"; "Sou aposentado, tenho custo inicial?"; "Quanto tempo para parar os descontos?"; "Posso resolver só pelo WhatsApp?".
- Landing 3: `Nome sujo por dívida que você não fez ou já pagou?` / `Liminar: exclusão do cadastro em poucos dias` / `Indenização por dano moral presumido` / `Dívida prescrita pode negativar?` — mini-FAQ: "Paguei a dívida e o nome continua sujo"; "Fui vítima de fraude com meu CPF"; "Consulta ao Serasa é de graça?"; "Quanto custa a ação?".

- [ ] **Step 1: Criar landing 1** completa conforme especificação acima (conteúdo original de 600–900 palavras).
- [ ] **Step 2: Criar landing 2** completa conforme especificação acima.
- [ ] **Step 3: Criar landing 3** completa conforme especificação acima.
- [ ] **Step 4: Verificar** — abrir as 3 páginas: visual consistente com a home; todos os links internos navegam; JSON-LD das 3 validado; títulos únicos (ver aba do navegador).
- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat: landing pages long-tail de servicos locais"
```

---

### Task 10: sitemap.xml, robots.txt e verificação final

**Files:**
- Create: `sitemap.xml`
- Create: `robots.txt`

**Interfaces:**
- Consumes: todas as páginas criadas.

- [ ] **Step 1: Criar `sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://alissonbrandao.adv.br/</loc><priority>1.0</priority></url>
  <url><loc>https://alissonbrandao.adv.br/blog.html</loc><priority>0.7</priority></url>
  <url><loc>https://alissonbrandao.adv.br/advogado-extravio-de-bagagem-vitoria-es.html</loc><priority>0.9</priority></url>
  <url><loc>https://alissonbrandao.adv.br/advogado-emprestimo-indevido-vitoria-es.html</loc><priority>0.9</priority></url>
  <url><loc>https://alissonbrandao.adv.br/advogado-negativacao-indevida-vitoria-es.html</loc><priority>0.9</priority></url>
  <url><loc>https://alissonbrandao.adv.br/blog/extravio-de-bagagem-indenizacao.html</loc><priority>0.8</priority></url>
  <url><loc>https://alissonbrandao.adv.br/blog/emprestimo-consignado-nao-contratado.html</loc><priority>0.8</priority></url>
  <url><loc>https://alissonbrandao.adv.br/blog/negativacao-indevida-nome-sujo.html</loc><priority>0.8</priority></url>
</urlset>
```

- [ ] **Step 2: Criar `robots.txt`**

```
User-agent: *
Allow: /
Sitemap: https://alissonbrandao.adv.br/sitemap.xml
```

- [ ] **Step 3: Checklist final de verificação (manual, navegador):**

- Home: ordem das seções = hero → manifesto → atuação → casos → sobre → faq → contato → atendimento (cidades) → footer.
- Todos os links internos clicados uma vez, sem 404 (8 páginas).
- Mobile 375px: header empilha, cards 1 coluna, footer 1 coluna, whatsapp-float não cobre conteúdo.
- Cada página tem `<title>` único, meta description única, canonical único.
- `Exibir código-fonte` da home: bairros presentes no HTML estático.
- JSON-LD de todas as páginas validado em validator.schema.org.
- Imagens do carrossel: fotos reais, `loading="lazy"`, `alt` preenchido.

- [ ] **Step 4: Commit final**

```powershell
git add -A; git commit -m "feat: sitemap, robots e verificacao final do SEO"
```

---

## Fora do escopo do código (orientar o cliente — já em `docs/PENDENCIAS.md`)

1. **Google Business Profile** — criar/reivindicar a ficha do escritório com o endereço do Edifício Bemge, categoria "Advogado", fotos reais e pedidos de avaliação a clientes. É o fator nº 1 de SEO local; sem isso o site sozinho não entra no map pack.
2. **Google Search Console** — verificar o domínio e enviar `sitemap.xml` após o deploy.
3. **Backlinks locais** — cadastro em diretórios (OAB-ES, listas de advogados, jornais locais capixabas).
4. **Publicação recorrente** — 1 artigo/mês no blog mantendo o padrão das 3 páginas pilares.
