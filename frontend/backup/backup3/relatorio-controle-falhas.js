// relatorio-controle-falhas.js v3.1 (Corrigido)
document.addEventListener('DOMContentLoaded', async () => {
  // Elementos
  const btnVerGraficos = document.getElementById('btnVerGraficos');
  const graficosOverlay = document.getElementById('graficosOverlay');
  const btnFecharGraficos = document.getElementById('btnFecharGraficos');
  const graficoDefeitos = document.getElementById('graficoDefeitos');
  const graficoPizzaFalhas = document.getElementById('graficoPizzaFalhas');
  const legendaPizzaFalhas = document.getElementById('legendaPizzaFalhas');
  const container = document.getElementById('falhasReportContainer');
  const btnExportarCSV = document.getElementById('btnExportarCSV');
  const filtroOM = document.getElementById('filtroOMFalhas');
  const filtroData = document.getElementById('filtroDataFalhas');
  const filtroOperador = document.getElementById('filtroOperadorFalhas');
  const filtroDefeito = document.getElementById('filtroDefeitoFalhas');
  const omTimeDisplay = document.getElementById('omTimeDisplay');

  // Estado
  let flatRegistros = [];
  let defeitoChart = null;
  let pizzaChart = null;

  // Paleta neon recomendada (varia para muitos itens)
  const CORES_NEON = [
    '#00f5d4', '#9b5de5', '#f15bb5', '#fee440', '#00bbf9', '#00f6ed',
    '#ff6b6b', '#ffd93d', '#6a4c93', '#80ed99', '#f72585', '#4895ef'
  ];

  // ---------------- UI: modal (CORRIGIDO) ----------------
  btnVerGraficos.addEventListener('click', () => {
    // Em vez de 'style.display', removemos a classe 'hidden'
    graficosOverlay.classList.remove('hidden');
    graficosOverlay.setAttribute('aria-hidden', 'false');
    
    // A animação 'modalPop' do CSS cuida da entrada
    mostrarGraficos();
  });

  btnFecharGraficos.addEventListener('click', () => {
    // Em vez de 'style.display = none', apenas adicionamos a classe 'hidden'
    graficosOverlay.classList.add('hidden');
    graficosOverlay.setAttribute('aria-hidden', 'true');
  });
  // ---------------- FIM DA CORREÇÃO ----------------

  // ---------------- Funções utilitárias ----------------
  const formatTimer = ms => {
    if (!ms || ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatTimestamp = ms => ms ? new Date(ms).toLocaleString('pt-BR') : 'N/A';

  async function fetchAndDisplayOmTime(omNumber) {
    if (!omNumber) {
      omTimeDisplay.innerHTML = '';
      return;
    }
    try {
      const resp = await fetch(`/api/om-time/${omNumber}`);
      if (!resp.ok) {
        omTimeDisplay.innerHTML = '<span style="color:#94a3b8">Tempo não registrado</span>';
        return;
      }
      const data = await resp.json();
      if (data) {
        omTimeDisplay.innerHTML = `
          <strong>Início:</strong> ${formatTimestamp(data.startTime)}<br>
          <strong>Fim:</strong> ${formatTimestamp(data.endTime)}<br>
          <strong>Tempo Total:</strong> ${formatTimer(data.elapsed || 0)}
        `;
      }
    } catch (e) {
      console.error(e);
      omTimeDisplay.innerHTML = '<span style="color:#ef4444">Erro ao buscar tempo</span>';
    }
  }

  // ---------------- Gráficos ----------------
  function mostrarGraficos() {
    let regs = [...flatRegistros];
    if (!regs.length) {
      // limpa caso não tenha dados
      if (defeitoChart) defeitoChart.destroy();
      if (pizzaChart) pizzaChart.destroy();
      legendaPizzaFalhas.innerHTML = '';
      return;
    }

    // Aplicar filtros
    const omSel = filtroOM.value;
    const dataSel = filtroData.value;
    const operadorSel = filtroOperador.value.trim().toLowerCase();
    const defeitoSel = filtroDefeito.value.trim().toLowerCase();

    if (omSel) regs = regs.filter(r => r.om === omSel);
    if (dataSel) {
      const dstr = new Date(dataSel).toDateString();
      regs = regs.filter(r => r.createdat && new Date(r.createdat).toDateString() === dstr);
    }
    if (operadorSel) regs = regs.filter(r => r.operador && r.operador.toLowerCase().includes(operadorSel));
    if (defeitoSel) regs = regs.filter(r => ((r.tipodefeito || r.defeito) || '').toLowerCase().includes(defeitoSel));

    // Contar por defeito
    const mapa = {};
    regs.forEach(r => {
      const key = r.tipodefeito || r.defeito || 'N/A';
      mapa[key] = (mapa[key] || 0) + 1;
    });
    const labels = Object.keys(mapa);
    const data = Object.values(mapa);

    // Destroi gráficos anteriores com segurança
    if (defeitoChart) { try { defeitoChart.destroy(); } catch (e) {} }
    if (pizzaChart) { try { pizzaChart.destroy(); } catch (e) {} }

    // Pizza (centralizada, com animação de escala)
    pizzaChart = new Chart(graficoPizzaFalhas, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: CORES_NEON }] },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Permite que o CSS controle a altura
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} (${((ctx.parsed / data.reduce((a,b) => a+b,0)) * 100).toFixed(1)}%)`
          }}
        },
        animation: { animateScale: true, duration: 1200, easing: 'easeOutCubic' }
      }
    });

    // Legenda customizada (melhor leitura em tema escuro)
    legendaPizzaFalhas.innerHTML = '';
    const total = data.reduce((a,b) => a+b, 0);
    labels.forEach((lab, i) => {
      const cor = CORES_NEON[i % CORES_NEON.length];
      const val = data[i];
      const perc = total ? ((val / total) * 100).toFixed(1) : '0.0';
      const el = document.createElement('div');
      el.className = 'legenda-item';
      el.innerHTML = `<span class="legenda-cor" style="background:${cor}"></span>
                      <span class="legenda-label">${lab}</span>
                      <strong class="legenda-val">${val} (${perc}%)</strong>`;
      legendaPizzaFalhas.appendChild(el);
    });

    // Barras (abaixo) — cor de destaque e animação
    defeitoChart = new Chart(graficoDefeitos, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ocorrências',
          data,
          backgroundColor: '#00bbf9'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Permite que o CSS controle a altura
        plugins: { legend: { display: false } },
        animation: { duration: 900, easing: 'easeOutQuart' },
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } }
        }
      }
    });
  }

  // ---------------- Tabela / filtros / CSV ----------------
  function renderTabela(registros) {
    if (!registradosVal(registros)) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    let html = `<table class="table"><thead><tr>
      <th>OM</th><th>Cod. Alt</th><th>Serial</th><th>Designador</th>
      <th>Defeito</th><th>Descrição</th><th>Data/Hora</th><th>Operador</th>
    </tr></thead><tbody>`;
    registros.forEach(r => {
      html += `<tr>
        <td>${esc(r.om)}</td><td>${esc(r.pn)}</td><td>${esc(r.serial)}</td>
        <td>${esc(r.designador)}</td><td>${esc(r.tipodefeito || r.defeito)}</td>
        <td>${esc(r.descricao)}</td>
        <td>${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'}</td>
        <td>${esc(r.operador)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }
  function registradosVal(arr) { return Array.isArray(arr) && arr.length > 0; }
  function esc(v) { return v == null ? '' : String(v).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function filtrarRegistros() {
    let regs = [...flatRegistros];
    if (filtroOM.value) regs = regs.filter(r => r.om === filtroOM.value);
    if (filtroData.value) {
      const d = new Date(filtroData.value).toDateString();
      regs = regs.filter(r => r.createdat && new Date(r.createdat).toDateString() === d);
    }
    if (filtroOperador.value.trim()) regs = regs.filter(r => r.operador && r.operador.toLowerCase().includes(filtroOperador.value.toLowerCase()));
    if (filtroDefeito.value.trim()) regs = regs.filter(r => (r.tipodefeito || r.defeito || '').toLowerCase().includes(filtroDefeito.value.toLowerCase()));
    renderTabela(regs);
  }

  function popularFiltroOM() {
    const oms = [...new Set(flatRegistros.map(r => r.om))].filter(Boolean).sort();
    filtroOM.innerHTML = '<option value="">Filtrar por OM</option>';
    oms.forEach(o => {
      const opt = document.createElement('option'); opt.value = o; opt.textContent = o;
      filtroOM.appendChild(opt);
    });
  }

  btnExportarCSV.addEventListener('click', () => {
    let regs = [...flatRegistros];
    if (!regs.length) return alert('Nenhum dado para exportar.');
    let csv = 'OM,Cod. Alt,Serial,Designador,Defeito,Descrição,Data/Hora,Operador\n';
    regs.forEach(r => {
      const row = [
        r.om, r.pn || '', r.serial || '', r.designador || '',
        r.tipodefeito || r.defeito || '', (r.descricao || '').replace(/,/g,';'),
        r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-', r.operador || ''
      ];
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `relatorio-falhas.csv`; a.click();
  });

  filtroOM.addEventListener('change', () => { filtrarRegistros(); fetchAndDisplayOmTime(filtroOM.value); });
  filtroData.addEventListener('change', filtrarRegistros);
  filtroOperador.addEventListener('input', filtrarRegistros);
  filtroDefeito.addEventListener('input', filtrarRegistros);

  // ---------------- Carga inicial ----------------
  try {
    container.innerHTML = '<div class="note">Carregando dados...</div>';
    const resp = await fetch('/api/relatorio-falhas');
    if (!resp.ok) throw new Error(`Erro ${resp.status}`);
    const raw = await resp.json();
    // Aceita duas formas: array direto ou { data: [...] }
    const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : raw?.data || []);
    // Normaliza para lista de registros planos
    flatRegistros = arr.flatMap(omGroup => {
      const om = omGroup.om ?? omGroup.numero ?? omGroup.name ?? '';
      return (omGroup.falhas || []).map(f => ({
        om: om,
        qtdlote: omGroup.qtdlote,
        pn: f.pn, serial: f.serial, designador: f.designador,
        tipodefeito: f.tipodefeito, descricao: f.descricao,
        createdat: f.createdat, operador: f.operador
      }));
    });
    popularFiltroOM();
    filtrarRegistros();
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="note" style="color:#ef4444;">Erro ao carregar dados: ${e.message || e}</div>`;
  }
});