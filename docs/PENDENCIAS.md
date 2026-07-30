# Pendências com o cliente (Alisson)

- [x] Domínio definitivo resolvido: **`https://www.alissonbrandao.com.br`**. Canonical, sitemap, robots e JSON-LD já usam esse domínio (a anotação anterior sobre `alissonbrandao.adv.br` estava desatualizada — corrigida em 30/07/2026). A regra está registrada em `CLAUDE.md`.
- [x] Número da inscrição OAB/ES — resolvido: OAB/ES 27.871 aplicado no rodapé, badges e política de privacidade (18/07/2026).
- [x] E-mail profissional no footer: `alissonbrandao.adv@gmail.com` (aplicado em todas as páginas).
- [ ] **Deploy pendente no Coolify** do lote de 12 páginas de 30/07/2026. Depois do deploy, solicitar indexação das 12 URLs listadas em `docs/INDEXACAO.md`.
- [ ] Conferir lista de bairros por cidade (js/bairros.js) — foi montada a partir de fontes públicas; validar com o cliente as regiões prioritárias. A verificação via WebSearch (Task 5, Step 2) não pôde ser executada por falta de acesso à web no ambiente; as listas base do brief foram mantidas sem alteração. Revalidar nomes/completude antes do deploy.
- [x] DNS movido para o Cloudflare (27/07/2026): zona `alissonbrandao.com.br` no plano Free, registros A `@` e `www` → 187.77.34.112 (VPS Hostinger/Coolify) com proxy ligado, os 2 TXT de verificação do Google preservados, SSL em Full (strict) e Always Use HTTPS ativo. Nameservers no registro.br trocados para `chip.ns.cloudflare.com` e `dawn.ns.cloudflare.com`; o DNSSEC (DS) sai na transição de ~2h aplicada pelo registro.br. Se quiser DNSSEC de novo, gerar o DS pelo Cloudflare e cadastrar no registro.br depois da ativação.
- [ ] Após a ativação do Cloudflare: reenviar o `sitemap.xml` no Search Console e pedir indexação das 5 páginas novas de direito trabalhista.
- [ ] Trocar a senha da conta registro.br (FEPSA199) — o próprio painel sinalizou senha comumente usada, e é a conta que controla o domínio.
- [ ] Criar/otimizar Google Business Profile apontando para o endereço do Edifício Bemge (fundamental para SEO local — fora do escopo do código).
- [x] Fotos de capa dos 3 novos posts do blog — resolvido: trocadas fotos do escritório por imagens de banco de imagens (Pexels, uso livre) temáticas de cada assunto em `img/blog/` (21/07/2026).
