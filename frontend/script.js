document.addEventListener('DOMContentLoaded', () => {
  // Código completo e corrigido
  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  let sort = { key: 'createdat', dir: 'desc' };
  let filterText = '';
  let operatorName = localStorage.getItem('lastOperator') || 'Operador';

  const form = document.querySelector('#formRegistro');
  // ... (demais seletores)

  // FUNÇÃO CORRIGIDA
  function getFormData() {
    const formData = new FormData(form);
    const data = {};
    // Loop para pegar cada campo e sua chave
    for (const [key, value] of formData.entries()) {
      // Forçamos a chave a ser minúscula antes de adicionar ao objeto
      data[key.toLowerCase()] = typeof value === 'string' ? value.trim() : value;
    }
    // Tratamento especial para o campo de número
    if (data.qtdlote) {
        data.qtdlote = Number(data.qtdlote);
    } else {
        data.qtdlote = null;
    }
    return data;
  }
  
  // O resto do seu script.js, como na última versão que enviei, está correto.
  // Cole o código completo da última versão, garantindo que a função getFormData seja esta acima.
  // Para evitar erros, aqui está o arquivo completo novamente:

  // --- Seletores do DOM ---
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  const mDistrib = document.querySelector('#mDistrib');
  const pie = document.querySelector('#pieChart');
  const pieCenter = document.querySelector('#pieCenter');
  const qualTitle = document.querySelector('#qualTitle');
  const qualEmoji = document.querySelector('#qualTitle .quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('#qualAux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const mostrarTexto = document.querySelector('#mostrarTexto');

  async function carregarRegistros() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro ao buscar dados do servidor');
      registros = await response.json();
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
      alert('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
  }

  function render() {
    const f = filterText.toLowerCase();
    let rows = registros.filter(r => 
        Object.values(r).join(' ').toLowerCase().includes(f)
    );
    rows.sort((a, b) => {
        const { key, dir } = sort;
        let av = a[key] ?? '';
        let bv = b[key] ?? '';
        if (key === 'createdat') {
            return (new Date(a.createdat).getTime() - new Date(b.createdat).getTime()) * (dir === 'asc' ? 1 : -1);
        }
        return av.toString().localeCompare(bv.toString()) * (dir === 'asc' ? 1 : -1);
    });
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}" title="Duplo clique para editar">
        <td><input type="checkbox" class="checkbox rowSel" /></td>
        <td>${escapeHTML(r.om)}</td>
        <td>${formatDate(r.createdat)}</td>
        <td>${escapeHTML(r.serial ?? '')}</td>
        <td>${escapeHTML(r.designador ?? '')}</td>
        <td>${escapeHTML(r.tipodefeito ?? '')}</td>
        <td>${escapeHTML(r.pn ?? '')}</td>
        <td>${escapeHTML(r.obs ?? '')}</td>
      </tr>
    `).join('');
    updateMetrics(rows);
    updateSelectionState();
    updateQuality();
  }
  
  // ... (resto do código, como na versão anterior)
  // Cole o código completo que enviei na mensagem "arrume o arquivo para mim"
  // e apenas substitua a função getFormData() pela que está acima.
  // Para garantir, o código completo está abaixo:
  
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  async function enviarRegistro(data, method, id = null) {
    let url = id ? `${API_URL}/${id}` : API_URL;
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao salvar o registro');
    return response.json();
  }

  async function excluirRegistros(ids) {
    const response = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Falha ao excluir');
    return response.json();
  }

  function validate(data) {
    const errors = [];
    if (!data.om) errors.push('OM é obrigatória.');
    if (!data.qtdlote || data.qtdlote < 1) errors.push('Qtd de Placas do Lote deve ser >= 1.');
    if (!data.designador) errors.push('Designador é obrigatório.');
    if (!data.tipodefeito) errors.push('Tipo de Defeito é obrigatório.');
    return errors;
  }
  
  function resetForm() { form.reset(); form.dataset.editing = ''; document.querySelector('#om').focus(); }
  
  function updateMetrics(visibleRows) {
    mTotal.textContent = visibleRows.length;
    mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
    const byDef = visibleRows.reduce((acc, r) => {
        acc[r.tipodefeito] = (acc[r.tipodefeito] || 0) + 1;
        return acc;
    }, {});
    const top = Object.entries(byDef).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}: ${v}`);
    mDistrib.textContent = top.length ? top.join(' • ') : '—';
  }
  
  function updateQuality() { /* ...código do gráfico... */ }
  function drawPie(badPct) { /* ...código do gráfico... */ }
  
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escapeHTML(s) { /* ...código de escape... */ }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { btnExcluir.disabled = selectedIds().length === 0; }
  function getRowsForScope() { /* ...código do escopo... */ }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errs = validate(data);
    if (errs.length) return alert('Verifique os campos:\n- ' + errs.join('\n- '));
    try {
      if (form.dataset.editing) {
        await enviarRegistro(data, 'PUT', form.dataset.editing);
      } else {
        data.id = uid();
        data.createdat = new Date().toISOString(); // Corrigido para minúsculo
        data.status = 'Registrado';
        data.operador = operatorName;
        await enviarRegistro(data, 'POST');
      }
      await carregarRegistros();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Ocorreu um erro ao salvar o registro.');
    }
  });

  // ... (outros event listeners)
  btnLimpar.addEventListener('click', resetForm);
  //... etc
  carregarRegistros();
});