'use strict';

const ESTILO = `
:root { --azul:#0b1c2e; --ouro:#b9975b; --verde:#25d366; }
* { box-sizing:border-box; }
body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:#f4f5f7; color:#1a1a1a; }
header { background:var(--azul); color:#fff; padding:16px 20px;
  display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
header h1 { font-size:1.1rem; margin:0; flex:1; }
header a, header button { color:#fff; background:transparent; border:1px solid rgba(255,255,255,.4);
  border-radius:6px; padding:8px 14px; font-size:.85rem; cursor:pointer; text-decoration:none;
  font-family:inherit; }
header a:hover, header button:hover { background:rgba(255,255,255,.1); }
main { padding:20px; max-width:1400px; margin:0 auto; }
.filtros { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.filtros input, .filtros select { padding:10px; border:1px solid #d7d7d7; border-radius:6px;
  font-size:.95rem; background:#fff; font-family:inherit; }
.filtros input { flex:1; min-width:200px; }
.contagem { color:#666; font-size:.85rem; margin:0 0 10px; }
table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.08); }
th, td { padding:12px; text-align:left; font-size:.9rem; border-bottom:1px solid #eee;
  vertical-align:top; }
th { background:#fafafa; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color:#666; }
td.desc { max-width:320px; white-space:pre-wrap; }
td.origem { max-width:220px; word-break:break-all; font-size:.78rem; color:#777; }
.zap { color:#128c3e; font-weight:700; text-decoration:none; white-space:nowrap; }
select.status { padding:6px; border-radius:6px; border:1px solid #d7d7d7; font-size:.85rem;
  font-family:inherit; }
tr[data-status="novo"] td:first-child { border-left:3px solid var(--ouro); }
tr[data-status="fechado"] { opacity:.55; }
.vazio { padding:40px; text-align:center; color:#888; }
.login { max-width:360px; margin:12vh auto; background:#fff; padding:32px; border-radius:8px;
  box-shadow:0 4px 20px rgba(0,0,0,.1); }
.login h1 { font-size:1.3rem; color:var(--azul); margin:0 0 20px; }
.login label { display:block; font-size:.85rem; font-weight:700; color:var(--azul);
  margin-bottom:6px; }
.login input { width:100%; padding:12px; border:1px solid #ddd; border-radius:6px; font-size:1rem;
  font-family:inherit; }
.login button { width:100%; margin-top:14px; padding:12px; border:0; border-radius:6px;
  background:var(--azul); color:#fff; font-size:1rem; cursor:pointer; font-family:inherit; }
.erro { background:#fdecea; color:#b3261e; padding:10px; border-radius:6px; font-size:.9rem;
  margin-bottom:14px; }
@media (max-width:760px) {
  table, tbody, tr, td { display:block; }
  thead { display:none; }
  tr { margin-bottom:12px; background:#fff; border-radius:8px; padding:8px; }
  td { border:0; padding:6px 10px; max-width:none; }
  td::before { content:attr(data-rotulo); display:block; font-size:.7rem; text-transform:uppercase;
    color:#999; }
}
`;

function paginaLogin({ erro } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-br"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Leads — Alisson Brandão</title>
<style>${ESTILO}</style></head>
<body><form class="login" method="post" action="/login">
<h1>Painel de Leads</h1>
${erro ? '<p class="erro">Senha incorreta.</p>' : ''}
<label for="senha">Senha</label>
<input type="password" id="senha" name="senha" autocomplete="current-password" required autofocus>
<button type="submit">Entrar</button>
</form></body></html>`;
}

function paginaPainel({ areas }) {
  const opcoesArea = areas.map((a) => `<option value="${a}">${a}</option>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-br"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Leads — Alisson Brandão</title>
<style>${ESTILO}</style></head>
<body>
<header>
  <h1>Leads</h1>
  <a href="/api/panel/export.csv">Exportar CSV</a>
  <form method="post" action="/logout" style="margin:0"><button type="submit">Sair</button></form>
</header>
<main>
  <div class="filtros">
    <input id="busca" type="search" placeholder="Buscar por nome, telefone ou texto">
    <select id="area"><option value="">Todas as áreas</option>${opcoesArea}</select>
    <select id="status">
      <option value="">Todos os status</option>
      <option value="novo">Novo</option>
      <option value="atendido">Atendido</option>
      <option value="fechado">Fechado</option>
    </select>
  </div>
  <p class="contagem" id="contagem"></p>
  <table>
    <thead><tr>
      <th>Data</th><th>Nome</th><th>WhatsApp</th><th>Área</th>
      <th>Descrição</th><th>Origem</th><th>Status</th>
    </tr></thead>
    <tbody id="corpo"></tbody>
  </table>
  <div class="vazio" id="vazio" hidden>Nenhum lead encontrado.</div>
</main>
<script>
// Todo dado de lead entra por textContent. innerHTML com conteúdo de
// formulário público seria XSS armazenado direto no painel do escritório.
var busca = document.getElementById('busca');
var area = document.getElementById('area');
var status = document.getElementById('status');
var corpo = document.getElementById('corpo');
var vazio = document.getElementById('vazio');
var contagem = document.getElementById('contagem');
var timer = null;

function dataBr(iso) {
  var d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function celula(linha, rotulo, texto) {
  var td = document.createElement('td');
  td.setAttribute('data-rotulo', rotulo);
  td.textContent = texto == null ? '' : String(texto);
  linha.appendChild(td);
  return td;
}

function desenhar(leads) {
  corpo.textContent = '';
  vazio.hidden = leads.length > 0;
  contagem.textContent = leads.length + (leads.length === 1 ? ' lead' : ' leads');
  leads.forEach(function (l) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-status', l.status);
    celula(tr, 'Data', dataBr(l.created_at));
    celula(tr, 'Nome', l.nome);

    var tdZap = document.createElement('td');
    tdZap.setAttribute('data-rotulo', 'WhatsApp');
    var a = document.createElement('a');
    a.className = 'zap';
    a.target = '_blank';
    a.rel = 'noopener';
    a.href = 'https://wa.me/' + encodeURIComponent(l.telefone_e164 || '');
    a.textContent = l.telefone;
    tdZap.appendChild(a);
    tr.appendChild(tdZap);

    celula(tr, 'Área', l.area);
    celula(tr, 'Descrição', l.descricao).className = 'desc';
    celula(tr, 'Origem', (l.utm_source ? l.utm_source + ' · ' : '') + (l.pagina_origem || '')).className = 'origem';

    var tdStatus = document.createElement('td');
    tdStatus.setAttribute('data-rotulo', 'Status');
    var sel = document.createElement('select');
    sel.className = 'status';
    ['novo', 'atendido', 'fechado'].forEach(function (s) {
      var o = document.createElement('option');
      o.value = s;
      o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (l.status === s) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      var anterior = l.status;
      fetch('/api/panel/leads/' + l.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sel.value })
      }).then(function (r) {
        if (!r.ok) { sel.value = anterior; return; }
        l.status = sel.value;
        tr.setAttribute('data-status', l.status);
      }).catch(function () { sel.value = anterior; });
    });
    tdStatus.appendChild(sel);
    tr.appendChild(tdStatus);
    corpo.appendChild(tr);
  });
}

function carregar() {
  var p = new URLSearchParams();
  if (busca.value.trim()) p.set('q', busca.value.trim());
  if (area.value) p.set('area', area.value);
  if (status.value) p.set('status', status.value);
  fetch('/api/panel/leads?' + p.toString())
    .then(function (r) { if (r.status === 401) { location.href = '/'; return null; } return r.json(); })
    .then(function (d) { if (d) desenhar(d.leads); })
    .catch(function () { contagem.textContent = 'Falha ao carregar. Recarregue a página.'; });
}

busca.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(carregar, 250); });
area.addEventListener('change', carregar);
status.addEventListener('change', carregar);
carregar();
</script>
</body></html>`;
}

module.exports = { paginaLogin, paginaPainel };
