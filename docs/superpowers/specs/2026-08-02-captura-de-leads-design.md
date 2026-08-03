# Captura de leads — Meta Pixel, formulário e painel

**Data:** 02/08/2026
**Status:** design aprovado, aguardando plano de implementação

## Problema

O site não mede nada e não guarda nada. Não há pixel, nem Analytics, nem qualquer tag. O modal de formulário que existe hoje (`#whatsappModal` no `index.html`, tratado em `js/main.js`) monta uma mensagem e abre o WhatsApp: o dado digitado morre no navegador. As outras 35 páginas — 4 landings comerciais e ~30 posts do blog — nem modal têm; seus CTAs vão direto para `wa.me`.

Consequência: não existe base de leads, não existe histórico e as campanhas do Meta não têm sinal de conversão para otimizar.

## Objetivo

1. Instalar o Meta Pixel `2516505455429077` em todas as páginas.
2. Capturar nome, WhatsApp, área do direito e descrição do caso antes de mandar o visitante para o WhatsApp.
3. Reportar cada lead ao Meta pelo Pixel **e** pela Conversions API, deduplicados.
4. Persistir os leads e servir uma lista consultável em `lead.alissonbrandao.com.br`, protegida por senha.

## Fora de escopo

- Notificação de lead novo por e-mail ou push. O visitante cai no WhatsApp do Alisson no mesmo instante em que envia o formulário — essa mensagem já é a notificação. Notificar de novo seria redundante.
- Gráficos e relatórios no painel. Com o volume atual ficariam vazios.
- Google Analytics, Tag Manager ou qualquer outra tag. Só o Meta Pixel.
- CRM, funil, atribuição multi-toque.

## Decisões tomadas

| Questão | Decisão | Por quê |
|---|---|---|
| Onde roda o backend | Serviço Node no Coolify, mesmo VPS | Fluxo de deploy já dominado, DNS já aponta para `187.77.34.112`, custo zero adicional |
| Onde mora o código do backend | Mesmo repositório, pasta `lead-api/` | Um `git push` só; o deploy do site estático lê da raiz e não é afetado |
| Integração com o Meta | Pixel **e** Conversions API | O Pixel sozinho perde 20–40% dos eventos para bloqueadores e iOS/ATT |
| Cobertura do formulário | CTAs de texto em todo o site; botão flutuante segue direto | Quem clica no botão flutuante do canto quer falar agora — formulário ali só perde o contato |
| Campos | Nome, WhatsApp, área, descrição, consentimento LGPD | A área permite triagem sem abrir cada lead; o consentimento é exigência do art. 7º da LGPD |
| Autenticação do painel | Senha única + sessão em cookie assinado | Um usuário só; funciona bem no celular, que é onde ele vai olhar |
| Painel | Lista, busca, filtro por área, status, exportar CSV | Status evita perder lead na rolagem; CSV é a saída se um dia trocar de ferramenta |

## Arquitetura

Três peças:

| Peça | Onde vive | Responsabilidade |
|---|---|---|
| Site estático | repositório atual, serviço Coolify existente | dispara o Pixel, abre o modal, envia o lead, redireciona ao WhatsApp |
| `lead-api` | `lead-api/`, novo serviço Coolify em `lead.alissonbrandao.com.br` | valida e grava o lead, dispara a Conversions API, serve o painel |
| SQLite | volume persistente do Coolify montado em `/data` | armazena os leads |

### Fluxo de um lead

```
Visitante clica num CTA (qualquer <a href*="wa.me">, exceto .whatsapp-float)
   │  preventDefault
   ▼
Modal abre — nome, WhatsApp, área (pré-selecionada pela página), descrição, consentimento
   │  submit
   ▼
Nada é aguardado — o gesto do usuário precisa continuar vivo:
   ├─ fetch POST /api/leads  (keepalive: true, sem await)
   ├─ fbq('track','Lead', {...}, { eventID })
   └─ window.open(wa.me/5527992291973?text=<mensagem montada>)
         │
         ▼ no servidor, em paralelo
   grava no SQLite ──→ Conversions API com o MESMO eventID ──→ Meta deduplica
```

O `await` é proibido antes do `window.open`: sem contexto de gesto, o navegador bloqueia o popup. Se a API falhar, o lead entra numa fila no `localStorage` e é reenviado no próximo carregamento de página; o WhatsApp abre normalmente e o visitante nunca vê erro.

### Eventos enviados ao Meta

| Evento | Gatilho | Canal |
|---|---|---|
| `PageView` | carregamento de qualquer página | Pixel |
| `Lead` | submit do formulário | Pixel + Conversions API, mesmo `event_id` |
| `Contact` | clique no botão flutuante do canto | Pixel |

## Site estático

### Pixel

Arquivo novo `js/pixel.js` com o código base do Pixel, `fbq('init','2516505455429077')` e `fbq('track','PageView')`. O ID fica num lugar só.

Carregado por `<script src="/js/pixel.js"></script>` inserido antes de `</head>` nas 36 páginas, por script mecânico. Sem `<noscript>`: quem está sem JavaScript não consegue enviar o formulário de qualquer forma.

### Formulário

Toda a lógica vai para `js/main.js`, que **35 das 36 páginas já carregam** (só `privacidade.html` não carrega, e não precisa de formulário). Nenhum `<script>` novo é necessário para o formulário.

O HTML do modal passa a ser **injetado por JavaScript**. O bloco hardcoded no `index.html` é removido, para não existirem duas versões divergindo.

Interceptação por seletor, sem editar o corpo de nenhuma página:

```js
document.querySelectorAll('a[href*="wa.me"]:not(.whatsapp-float)')
```

O `.whatsapp-float` continua sendo um link direto e passa a disparar `Contact`.

### Campos

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome | texto | sim |
| WhatsApp | tel, máscara `(DD) 9XXXX-XXXX` | sim |
| Área do direito | select | sim, pré-selecionado pela página de origem |
| Descrição | textarea | sim |
| Consentimento LGPD | checkbox com link para `privacidade.html` | sim |

Opções do select: Previdenciário, Consumidor, Trabalhista, Família, Cível, Criminal, Outro.

A pré-seleção vem de um `data-area` no `<body>` da página quando presente, com fallback para `Outro`. As landings e os posts do blog recebem esse atributo conforme a área que tratam.

### CSS

`css/style.css` já tem `.modal`, `.modal-content`, `.form-group`, `.btn-submit`. Faltam estilos para `<select>` e para o checkbox de consentimento — acréscimo pequeno, seguindo o padrão visual existente.

## Backend `lead-api`

Node 20, Express, `better-sqlite3`, Dockerfile próprio. Sem ORM. O painel é HTML renderizado no servidor mais um `<script>`; nenhum framework de front.

### Tabela `leads`

| Coluna | Origem |
|---|---|
| `id`, `created_at` | servidor |
| `nome`, `telefone`, `telefone_e164`, `area`, `descricao`, `consentimento` | formulário |
| `pagina_origem`, `referrer` | navegador |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` | query string |
| `fbp`, `fbc` | cookies `_fbp` / `_fbc` — é o que dá bom índice de correspondência no Meta |
| `ip`, `user_agent` | servidor; exigidos pela Conversions API e usados contra abuso |
| `event_id`, `capi_status` | rastreia se o evento chegou ao Meta |
| `status` | `novo` \| `atendido` \| `fechado`, padrão `novo` |

Índices em `created_at`, `area` e `status`.

### Endpoints

| Rota | Proteção |
|---|---|
| `POST /api/leads` | CORS restrito a `https://www.alissonbrandao.com.br` e ao apex; 10 requisições/hora por IP; limite de tamanho em todos os campos |
| `GET /` | painel; sem sessão, cai na tela de login |
| `POST /login` | 5 tentativas / 15 min por IP |
| `POST /logout` | sessão |
| `GET /api/panel/leads?q=&area=&status=` | sessão |
| `PATCH /api/panel/leads/:id` | sessão; só altera `status` |
| `GET /api/panel/export.csv` | sessão |
| `GET /healthz` | aberto; usado pelo healthcheck do Coolify |

### Conversions API

`POST https://graph.facebook.com/<versão>/2516505455429077/events`

- `event_name`: `Lead`
- `event_id`: o mesmo UUID que o Pixel usou — é o que permite a deduplicação
- `event_source_url`: a página de origem
- `action_source`: `website`
- `user_data`: `ph` (SHA-256 do telefone em E.164 sem `+`), `fn` e `ln` (SHA-256 do nome em minúsculas, sem acento), `client_ip_address`, `client_user_agent`, `fbp`, `fbc`

Uma retentativa em caso de falha; o resultado é gravado em `capi_status`. Falha na CAPI **nunca** derruba a gravação do lead.

A versão da Graph API é configurável por variável de ambiente `META_API_VERSION` — as versões são depreciadas em ciclo de cerca de dois anos e o valor precisa ser conferido no Gerenciador de Eventos no momento do deploy, não fixado no código.

### Segurança

- Senha do painel guardada **apenas** como hash argon2id na variável `PANEL_PASSWORD_HASH`. Nunca em texto, nunca no Git.
- Sessão em cookie `httpOnly` + `Secure` + `SameSite=Lax`, assinada com HMAC de `SESSION_SECRET`.
- Token da Conversions API em variável de ambiente.
- O painel serve dado pessoal de cliente de advogado: `Cache-Control: no-store`, `X-Robots-Tag: noindex`, CSP restritiva.
- Comparação de senha em tempo constante; mensagem de erro genérica no login.

### Variáveis de ambiente

| Variável | Função |
|---|---|
| `PANEL_PASSWORD_HASH` | hash argon2id da senha do painel |
| `SESSION_SECRET` | chave HMAC do cookie de sessão |
| `META_PIXEL_ID` | `2516505455429077` |
| `META_CAPI_TOKEN` | token do Gerenciador de Eventos |
| `META_API_VERSION` | versão da Graph API |
| `ALLOWED_ORIGINS` | origens aceitas no CORS |
| `WHATSAPP_NUMBER` | `5527992291973` |
| `DB_PATH` | caminho do SQLite no volume, `/data/leads.db` |

## Infraestrutura

**Cloudflare:** registro A `lead` → `187.77.34.112`, proxy ligado.

**Coolify:** novo serviço, mesmo repositório, *Base Directory* `/lead-api`, domínio `lead.alissonbrandao.com.br`, volume persistente montado em `/data`, variáveis de ambiente acima.

> **O volume persistente é obrigatório.** Sem ele o arquivo SQLite vive dentro do container e **todo redeploy apaga a base de leads inteira**. Conferir antes do primeiro lead entrar.

O backup do volume é responsabilidade da infraestrutura; os leads são o ativo do projeto. O `export.csv` do painel é a saída manual de emergência.

## LGPD

`privacidade.html` ganha uma seção nova sobre o formulário: quais dados são coletados, para qual finalidade, qual a base legal (consentimento, art. 7º, I), o compartilhamento com a Meta Platforms para fins de publicidade, o prazo de retenção e como solicitar exclusão.

Isso **não** altera o `noindex` da página nem a mantém fora do `sitemap.xml` — as duas decisões do projeto continuam valendo.

## Testes

O repositório não tem infraestrutura de teste hoje. O `lead-api` traz a sua, com `node:test` (nativo, sem dependência nova):

- validação: campo faltando, campo longo demais, consentimento falso, telefone inválido
- normalização de telefone para E.164
- hash SHA-256 dos dados de usuário da CAPI
- login: senha errada, rate limit, expiração de sessão
- endpoints do painel sem sessão retornam 401
- CORS rejeita origem desconhecida

Verificação manual, após o deploy:

1. Ferramenta *Testar Eventos* do Gerenciador de Eventos do Meta mostra `PageView`, `Lead` e `Contact`.
2. O `Lead` aparece **uma vez**, não duas — confirma a deduplicação Pixel/CAPI.
3. Lead de teste enviado pelo site aparece no painel.
4. Redeploy do serviço e o lead de teste continua lá — confirma o volume persistente.
5. `lead.alissonbrandao.com.br` sem sessão não mostra nenhum dado.

## Critérios de aceitação

- [ ] Pixel `2516505455429077` ativo nas 36 páginas
- [ ] Formulário abre a partir dos CTAs de texto em todas as páginas que carregam `js/main.js`
- [ ] Botão flutuante continua indo direto ao WhatsApp e dispara `Contact`
- [ ] Lead gravado no SQLite com origem, UTMs e cookies do Meta
- [ ] `Lead` chega ao Meta pelos dois canais e é deduplicado
- [ ] Visitante chega ao WhatsApp com a mensagem preenchida, mesmo se a API estiver fora do ar
- [ ] `lead.alissonbrandao.com.br` pede senha e lista os leads com busca, filtro, status e CSV
- [ ] `privacidade.html` descreve a coleta
- [ ] Nenhum segredo no repositório

## Pendente do usuário

1. Access Token da Conversions API, gerado no Gerenciador de Eventos do Meta.
2. Versão atual da Graph API, conferida no mesmo lugar.
3. A senha que o Alisson vai usar no painel — informada só na hora de gerar o hash; o hash é que vai para o Coolify.
4. Criar o registro A `lead` no Cloudflare.
5. Criar o serviço no Coolify com o volume persistente e as variáveis de ambiente.
