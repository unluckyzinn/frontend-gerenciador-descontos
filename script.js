let BASE_URL = localStorage.getItem('api_base_url') || 'gerenciador-descontos-api-tlp3-production.up.railway.app';
let descontoAtual = 0;

// ── INIT ──
document.getElementById('apiUrlText').textContent = BASE_URL.replace('http://', '').replace('https://', '');
document.getElementById('baseUrlInput').value = BASE_URL;
checkStatus();
carregarProdutos();
setInterval(checkStatus, 30000);

document.getElementById('buscaId').addEventListener('keydown', e => { if (e.key === 'Enter') buscarPorId(); });
document.getElementById('descontoInput').addEventListener('keydown', e => { if (e.key === 'Enter') atualizarDesconto(); });

// ── URL CONFIG ──
function toggleUrlEditor() {
  const editor = document.getElementById('urlEditor');
  const input = document.getElementById('baseUrlInput');
  const showing = editor.style.display !== 'none';
  editor.style.display = showing ? 'none' : 'block';
  if (!showing) input.value = BASE_URL;
}

function salvarUrl() {
  const val = document.getElementById('baseUrlInput').value.trim();
  if (!val) return;
  BASE_URL = val.replace(/\/$/, '');
  localStorage.setItem('api_base_url', BASE_URL);
  document.getElementById('apiUrlText').textContent = BASE_URL.replace('http://', '').replace('https://', '');
  document.getElementById('urlEditor').style.display = 'none';
  toast('URL atualizada: ' + BASE_URL, 'success');
  carregarProdutos();
}

// ── STATUS ──
async function checkStatus() {
  try {
    const r = await fetch(`${BASE_URL}/produtos`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      document.getElementById('statusText').textContent = 'API online';
      document.getElementById('statusPill').style.borderColor = 'rgba(69,229,176,0.4)';
    }
  } catch {
    document.getElementById('statusText').textContent = 'API offline';
    document.getElementById('statusPill').style.background = 'rgba(255,107,107,0.08)';
    document.getElementById('statusPill').style.borderColor = 'rgba(255,107,107,0.2)';
    document.getElementById('statusPill').querySelector('.status-dot').style.background = 'var(--accent2)';
  }
}

// ── TABS ──
function switchTab(tipo, btn) {
  document.getElementById('formFisico').style.display = tipo === 'fisico' ? 'block' : 'none';
  document.getElementById('formDigital').style.display = tipo === 'digital' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

// ── TOAST ──
function toast(msg, tipo = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerHTML = `<span class="toast-icon">${tipo === 'success' ? '✓' : '✕'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── FORMATAÇÃO ──
function formatBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── DESCONTO ──
function atualizarDesconto() {
  const val = parseFloat(document.getElementById('descontoInput').value);
  if (isNaN(val) || val < 0 || val > 1) {
    toast('Valor entre 0 e 1 (ex: 0.20 para 20%)', 'error');
    return;
  }
  fetch(`${BASE_URL}/produtos/desconto`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(val)
  }).then(r => {
    if (r.ok) {
      descontoAtual = val;
      document.getElementById('descontoDisplay').textContent = (val * 100).toFixed(0) + '%';
      document.getElementById('descontoInput').value = '';
      toast('Desconto global atualizado para ' + (val * 100).toFixed(0) + '%', 'success');
      document.querySelectorAll('.preco-final-inline').forEach(el => el.style.display = 'none');
    } else {
      toast('Erro ao atualizar desconto', 'error');
    }
  }).catch(() => toast('Sem conexão com a API', 'error'));
}

// ── LISTAR PRODUTOS ──
async function carregarProdutos() {
  const grid = document.getElementById('produtoGrid');
  grid.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const r = await fetch(`${BASE_URL}/produtos`);
    if (!r.ok) throw new Error();
    const produtos = await r.json();
    renderProdutos(produtos);
  } catch {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">Não foi possível conectar à API.<br>Verifique se o servidor está rodando.</div>
      </div>`;
  }
}

function renderProdutos(produtos) {
  const grid = document.getElementById('produtoGrid');
  document.getElementById('countBadge').textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;

  if (!produtos.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Nenhum produto cadastrado ainda.</div></div>`;
    return;
  }

  grid.innerHTML = produtos.map(p => {
    const tipo = p.tipo || (p.taxaFrete !== undefined ? 'FISICO' : 'DIGITAL');
    const isFisico = tipo === 'FISICO';
    const cor = isFisico ? 'var(--tag-fisico)' : 'var(--tag-digital)';
    const extraInfo = isFisico && p.taxaFrete !== undefined
        ? `<div class="info-row"><span class="info-key">taxa de frete</span><span class="info-val">${formatBRL(p.taxaFrete)}</span></div>`
        : '';

    return `
      <div class="produto-card" style="--tipo-color:${cor}">
        <div class="produto-card-header">
          <div class="produto-nome">${p.nome}</div>
          <span class="tag tag-${tipo.toLowerCase()}">${tipo}</span>
        </div>
        <div class="produto-info">
          <div class="info-row">
            <span class="info-key">id</span>
            <span class="info-val">#${p.id}</span>
          </div>
          <div class="info-row">
            <span class="info-key">preço base</span>
            <span class="preco-base-val">${formatBRL(p.precoBase)}</span>
          </div>
          ${extraInfo}
        </div>
        <div class="preco-final-inline" id="precoFinal-${p.id}">
          <span style="color:var(--muted);font-size:0.72rem">preço c/ desconto</span>
          <span class="preco-final-val" id="precoFinalVal-${p.id}">—</span>
        </div>
        <div class="produto-actions">
          <button class="btn btn-ghost" style="flex:1;font-size:0.75rem" onclick="calcularPreco(${p.id})">
            🏷️ Ver preço final
          </button>
          <button class="btn btn-ghost" style="font-size:0.75rem" onclick="abrirModal(${p.id}, '${tipo}', '${p.nome}', ${p.precoBase}, ${p.taxaFrete ?? 0})">
            ✏️
          </button>
          <button class="btn btn-ghost" style="font-size:0.75rem;color:var(--accent2);border-color:rgba(255,107,107,0.2)" onclick="deletarProduto(${p.id})">
            🗑️
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── CALCULAR PREÇO ──
async function calcularPreco(id) {
  try {
    const r = await fetch(`${BASE_URL}/produtos/${id}/preco`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    const el = document.getElementById(`precoFinal-${id}`);
    const val = document.getElementById(`precoFinalVal-${id}`);
    val.textContent = formatBRL(data.precoFinal);
    el.style.display = 'flex';
  } catch {
    toast('Erro ao calcular preço', 'error');
  }
}

// ── BUSCAR POR ID ──
async function buscarPorId() {
  const id = document.getElementById('buscaId').value;
  if (!id) { toast('Digite um ID', 'error'); return; }

  const resultado = document.getElementById('resultadoBusca');
  resultado.style.display = 'block';
  resultado.innerHTML = '<span class="spinner"></span>';

  try {
    const r = await fetch(`${BASE_URL}/produtos/${id}`);
    if (r.status === 404) {
      resultado.innerHTML = `<span style="color:var(--accent2)">✕ Produto #${id} não encontrado</span>`;
      return;
    }
    if (!r.ok) throw new Error();
    const p = await r.json();
    const tipo = p.tipo || (p.taxaFrete !== undefined ? 'FISICO' : 'DIGITAL');
    resultado.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong style="font-family:'Syne',sans-serif">${p.nome}</strong>
        <span class="tag tag-${tipo.toLowerCase()}">${tipo}</span>
      </div>
      <div style="color:var(--muted);font-size:0.75rem">ID: #${p.id}</div>
      <div style="color:var(--accent3);margin-top:4px">${formatBRL(p.precoBase)}</div>
      ${p.taxaFrete !== undefined ? `<div style="color:var(--muted);font-size:0.75rem;margin-top:2px">Frete: ${formatBRL(p.taxaFrete)}</div>` : ''}
    `;
  } catch {
    resultado.innerHTML = `<span style="color:var(--accent2)">✕ Erro na busca</span>`;
  }
}

// ── DELETAR ──
async function deletarProduto(id) {
  if (!confirm(`Deletar produto #${id}?`)) return;
  try {
    const r = await fetch(`${BASE_URL}/produtos/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast('Produto deletado!', 'success');
      carregarProdutos();
    } else {
      toast('Erro ao deletar produto', 'error');
    }
  } catch { toast('Sem conexão com a API', 'error'); }
}

// ── MODAL DE EDIÇÃO ──
function abrirModal(id, tipo, nome, preco, frete) {
  document.getElementById('editId').value = id;
  document.getElementById('editTipo').value = tipo;
  document.getElementById('editNome').value = nome;
  document.getElementById('editPreco').value = preco;
  document.getElementById('editFrete').value = frete;
  document.getElementById('editFreteGroup').style.display = tipo === 'FISICO' ? 'block' : 'none';
  document.getElementById('modalTitulo').textContent = `Editar ${tipo === 'FISICO' ? 'Produto Físico' : 'Produto Digital'} #${id}`;
  document.getElementById('modalOverlay').classList.add('active');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

async function salvarEdicao() {
  const id   = document.getElementById('editId').value;
  const tipo = document.getElementById('editTipo').value;
  const nome  = document.getElementById('editNome').value.trim();
  const preco = parseFloat(document.getElementById('editPreco').value);
  const frete = parseFloat(document.getElementById('editFrete').value);

  if (!nome || isNaN(preco)) { toast('Preencha todos os campos', 'error'); return; }
  if (tipo === 'FISICO' && isNaN(frete)) { toast('Preencha a taxa de frete', 'error'); return; }

  const body = tipo === 'FISICO'
      ? { nome, precoBase: preco, taxaFrete: frete }
      : { nome, precoBase: preco };

  const endpoint = tipo === 'FISICO' ? `fisico/${id}` : `digital/${id}`;

  try {
    const r = await fetch(`${BASE_URL}/produtos/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      toast('Produto atualizado!', 'success');
      fecharModal();
      carregarProdutos();
    } else {
      const err = await r.json().catch(() => ({}));
      toast(err.message || 'Erro ao editar', 'error');
    }
  } catch { toast('Sem conexão com a API', 'error'); }
}

// ── CADASTRAR FÍSICO ──
async function cadastrarFisico() {
  const nome  = document.getElementById('fisicoNome').value.trim();
  const preco = parseFloat(document.getElementById('fisicoPreco').value);
  const frete = parseFloat(document.getElementById('fisicoFrete').value);
  if (!nome || isNaN(preco) || isNaN(frete)) { toast('Preencha todos os campos', 'error'); return; }

  try {
    const r = await fetch(`${BASE_URL}/produtos/fisico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, precoBase: preco, taxaFrete: frete })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast(err.message || 'Erro ao cadastrar', 'error');
      return;
    }
    const data = await r.json();
    toast(`"${data.nome}" cadastrado com sucesso!`, 'success');
    document.getElementById('fisicoNome').value  = '';
    document.getElementById('fisicoPreco').value = '';
    document.getElementById('fisicoFrete').value = '';
    carregarProdutos();
  } catch { toast('Sem conexão com a API', 'error'); }
}

// ── CADASTRAR DIGITAL ──
async function cadastrarDigital() {
  const nome  = document.getElementById('digitalNome').value.trim();
  const preco = parseFloat(document.getElementById('digitalPreco').value);
  if (!nome || isNaN(preco)) { toast('Preencha todos os campos', 'error'); return; }

  try {
    const r = await fetch(`${BASE_URL}/produtos/digital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, precoBase: preco })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast(err.message || 'Erro ao cadastrar', 'error');
      return;
    }
    const data = await r.json();
    toast(`"${data.nome}" cadastrado com sucesso!`, 'success');
    document.getElementById('digitalNome').value  = '';
    document.getElementById('digitalPreco').value = '';
    carregarProdutos();
  } catch { toast('Sem conexão com a API', 'error'); }
}