document.addEventListener('DOMContentLoaded', async () => {
  const btnVerGraficos = document.getElementById('btnVerGraficos');
  const graficosOverlay = document.getElementById('graficosOverlay');
  const btnFecharGraficos = document.getElementById('btnFecharGraficos');
  const graficoDefeitos = document.getElementById('graficoDefeitos');
  const graficoPizzaFalhas = document.getElementById('graficoPizzaFalhas');
  const legendaPizzaFalhas = document.getElementById('legendaPizzaFalhas');

  // Mostra painel modal de gráficos ao clicar
  btnVerGraficos.addEventListener('click', () => {
    graficosOverlay.style.display = 'flex';
    mostrarGraficos();
  });
  btnFecharGraficos.addEventListener('click', () => {
    graficosOverlay.style.display = 'none';
  });

  // Função para preparar dados e exibir gráficos
  function mostrarGraficos() {
    let regs = Array.isArray(flatRegistros) ? [...flatRegistros] : [];
    if (!regs.length) {
      graficoDefeitos.getContext('2d').clearRect(0,0,graficoDefeitos.width,graficoDefeitos.height);
      graficoOMs.getContext('2d').clearRect(0,0,graficoOMs.width,graficoOMs.height);
      graficoOperadores.getContext('2d').clearRect(0,0,graficoOperadores.width,graficoOperadores.height);
      return;
    }
    // Aplica filtros
    const omSelecionada = filtroOM.value;
    if (omSelecionada) regs = regs.filter(r => r.om === omSelecionada);
    const dataSelecionada = filtroData.value;
    if (dataSelecionada) {
      regs = regs.filter(r => {
        if (!r.createdat) return false;
        const dataReg = new Date(r.createdat);
        const dataFiltro = new Date(dataSelecionada);
        return dataReg.toDateString() === dataFiltro.toDateString();
      });
    }
    const operadorSelecionado = filtroOperador.value.trim();
    if (operadorSelecionado) regs = regs.filter(r => r.operador && r.operador.toLowerCase().includes(operadorSelecionado.toLowerCase()));
    const defeitoSelecionado = filtroDefeito.value.trim();
    if (defeitoSelecionado) {
      regs = regs.filter(r => ((r.tipodefeito || r.defeito || '').toLowerCase().includes(defeitoSelecionado.toLowerCase())));
    }

    // Gráfico principal de barras (falhas por tipo)
    const defeitos = {};
    regs.forEach(r => {
      const tipo = r.tipodefeito || r.defeito || 'N/A';
      defeitos[tipo] = (defeitos[tipo] || 0) + 1;
    });
    const defeitoLabels = Object.keys(defeitos);
    const defeitoData = Object.values(defeitos);
    if (window.defeitoChart) window.defeitoChart.destroy();
    window.defeitoChart = new window.Chart(graficoDefeitos, {
      type: 'bar',
      data: { labels: defeitoLabels, datasets: [{ label: 'Falhas por tipo', data: defeitoData, backgroundColor: '#38bdf8' }] },
      options: { responsive: true, indexAxis: 'x', plugins: { legend: { display: false } } }
    });

    // Gráfico de pizza (todas as falhas)
    if (window.pizzaChart) window.pizzaChart.destroy();
    window.pizzaChart = new window.Chart(graficoPizzaFalhas, {
      type: 'pie',
      data: {
        labels: defeitoLabels,
        datasets: [{
          data: defeitoData,
          backgroundColor: [
            '#38bdf8','#34d399','#f59e42','#f87171','#a78bfa','#fbbf24','#4ade80','#818cf8','#f472b6','#fb7185','#facc15','#a3e635','#fcd34d','#fca5a5','#c084fc','#f9fafb'
          ]
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Legenda lateral do gráfico de pizza
    legendaPizzaFalhas.innerHTML = '';
    defeitoLabels.forEach((label, idx) => {
      const cor = window.pizzaChart.data.datasets[0].backgroundColor[idx % window.pizzaChart.data.datasets[0].backgroundColor.length];
      const valor = defeitoData[idx];
      const bloco = document.createElement('div');
      bloco.style.display = 'flex';
      bloco.style.alignItems = 'center';
      bloco.style.gap = '8px';
      bloco.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:${cor};border:1.5px solid #334155;"></span><span style="color:#f1f5f9;font-size:1em;">${label}</span><span style="color:#38bdf8;font-weight:bold;">${valor}</span>`;
      legendaPizzaFalhas.appendChild(bloco);
    });
  }
  // Garante que o botão nunca fique desabilitado
  btnVerGraficos.disabled = false;
  btnVerGraficos.classList.remove('btn-secondary');
  btnVerGraficos.classList.add('bg-sky-600', 'text-white');
  btnVerGraficos.addEventListener('click', () => {
    graficosPanel.style.display = 'block';
    mostrarGraficos();
  });
  const container = document.getElementById('falhasReportContainer');
  const btnExportarCSV = document.getElementById('btnExportarCSV');
  const filtroOM = document.getElementById('filtroOMFalhas');
  const filtroData = document.getElementById('filtroDataFalhas');
  const filtroOperador = document.getElementById('filtroOperadorFalhas');
  const filtroDefeito = document.getElementById('filtroDefeitoFalhas');
  const omTimeDisplay = document.getElementById('omTimeDisplay');

  let flatRegistros = [];
  let currentPage = 1;
  let totalPages = 1;
  const limit = 50;

  // Helper para formatar o tempo de MS para HH:MM:SS
  function formatTimer(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ================== FUNÇÃO ADICIONADA ==================
  function formatTimestamp(ms) {
    if (!ms) return 'N/A';
    // Formato: 23/10/2025, 13:50:15
    return new Date(ms).toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
  // ================== FIM DA ADIÇÃO ==================


  // ================== FUNÇÃO ATUALIZADA ==================
  async function fetchAndDisplayOmTime(omNumber) {
    if (!omNumber) {
      omTimeDisplay.innerHTML = '';
      return;
    }
    try {
      const resp = await fetch(`/api/om-time/${omNumber}`);
      if (!resp.ok) {
        omTimeDisplay.innerHTML = '<span style="color: #94a3b8; font-size: 0.9rem;">Tempo não registrado</span>';
        return;
      }
      const data = await resp.json();
      
      // Atualizado para usar os novos dados (startTime, endTime, elapsed)
      if (data.elapsed) {
        omTimeDisplay.innerHTML = `
          <strong>Início:</strong> ${formatTimestamp(data.startTime)}<br>
          <strong>Fim:</strong> ${formatTimestamp(data.endTime)}<br>
          <strong>Tempo Total: ${formatTimer(data.elapsed)}</strong>
        `;
      }
    } catch (e) {
      console.error(`Erro ao buscar tempo para OM ${omNumber}:`, e);
      omTimeDisplay.innerHTML = '<span style="color: #ef4444; font-size: 0.9rem;">Erro ao buscar tempo</span>';
    }
  }
  // ================== FIM DA ATUALIZAÇÃO ==================

  function renderTabela(registros) {
    if (!registros || !registros.length) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado para os filtros aplicados.</div>';
      return;
    }
    let html = '<table class="table"><thead><tr>' +
      '<th>OM</th><th>Cod. Alt</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>Descrição</th><th>Data/Hora</th><th>Operador</th>' +
      '</tr></thead><tbody>';
    for (const r of registros) {
      html += `<tr>
          <td data-label="OM">${r.om}</td>
          <td data-label="Cod. Alt">${r.pn || ''}</td>
          <td data-label="Serial">${r.serial || ''}</td>
          <td data-label="Designador">${r.designador || ''}</td>
          <td data-label="Defeito">${r.tipodefeito || r.defeito || ''}</td>
          <td data-label="Descrição">${r.descricao || ''}</td>
          <td data-label="Data/Hora">${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'}</td>
          <td data-label="Operador">${r.operador || ''}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    // Paginação visual
    html += `<div class='pagination'>
      <button id='btnPrevPage' ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${currentPage} de ${totalPages}</span>
      <button id='btnNextPage' ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
    </div>`;
    container.innerHTML = html;
    // Eventos de paginação
    document.getElementById('btnPrevPage').onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        filtrarRegistros();
      }
    };
    document.getElementById('btnNextPage').onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        filtrarRegistros();
      }
    };
  }

  function filtrarRegistros() {
    let regs = [...flatRegistros];
    // Filtro por OM
    const omSelecionada = filtroOM.value;
    if (omSelecionada) {
      regs = regs.filter(r => r.om === omSelecionada);
    }
    // Filtro por data
    const dataSelecionada = filtroData.value;
    if (dataSelecionada) {
      regs = regs.filter(r => {
        if (!r.createdat) return false;
        const dataReg = new Date(r.createdat);
        const dataFiltro = new Date(dataSelecionada);
        return dataReg.toDateString() === dataFiltro.toDateString();
      });
    }
    // Filtro por operador
    const operadorSelecionado = filtroOperador.value.trim();
    if (operadorSelecionado) {
      regs = regs.filter(r => r.operador && r.operador.toLowerCase().includes(operadorSelecionado.toLowerCase()));
    }
    // Filtro por tipo de defeito
    const defeitoSelecionado = filtroDefeito.value.trim();
    if (defeitoSelecionado) {
      regs = regs.filter(r => (r.tipodefeito || r.defeito || '').toLowerCase().includes(defeitoSelecionado.toLowerCase()));
    }
    // Paginação
    totalPages = Math.max(1, Math.ceil(regs.length / limit));
    const startIdx = (currentPage - 1) * limit;
    const paginados = regs.slice(startIdx, startIdx + limit);
    renderTabela(paginados);
  }

  function popularFiltroOM() {
    const oms = [...new Set(flatRegistros.map(r => r.om))];
    oms.sort();
    for (const om of oms) {
      const option = document.createElement('option');
      option.value = om;
      option.textContent = om;
      filtroOM.appendChild(option);
    }
  }

  function exportarCSV() {
    // Usa os registros atualmente filtrados para o CSV
    let regsParaExportar = [...flatRegistros];
    const omSelecionada = filtroOM.value;
    if (omSelecionada) {
      regsParaExportar = regsParaExportar.filter(r => r.om === omSelecionada);
    }

    if (regsParaExportar.length === 0) {
        alert("Nenhum dado para exportar com os filtros atuais.");
        return;
    }

    let csv = 'OM,Cod. Alt,Serial,Designador,Defeito,Descrição,Data/Hora,Operador\n';
    for (const r of regsParaExportar) {
      // Limpa os dados para evitar quebras no CSV
      const cleanDesc = (r.descricao || '').replace(/,/g, ';');
      const row = [r.om, r.pn, r.serial, r.designador, (r.tipodefeito || r.defeito || ''), cleanDesc, (r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'), r.operador];
      csv += row.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const omSuffix = omSelecionada ? `_${omSelecionada}` : '';
    link.download = `relatorio-falhas${omSuffix}.csv`;
    link.click();
  }

  // Eventos
  filtroOM.addEventListener('change', () => {
    currentPage = 1;
    filtrarRegistros();
    fetchAndDisplayOmTime(filtroOM.value);
  });
  filtroData.addEventListener('change', () => {
    currentPage = 1;
    filtrarRegistros();
  });
  filtroOperador.addEventListener('input', () => {
    currentPage = 1;
    filtrarRegistros();
  });
  filtroDefeito.addEventListener('input', () => {
    currentPage = 1;
    filtrarRegistros();
  });
  btnExportarCSV.addEventListener('click', exportarCSV);

  // --- Carga Inicial ---
  container.innerHTML = '<div class="note">Carregando dados...</div>';
  try {
    const resp = await fetch('/api/relatorio-falhas');
    if (!resp.ok) throw new Error(`Erro ao buscar dados (${resp.status})`);
    let rawData = await resp.json();
    let dataArr = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
    if (!Array.isArray(dataArr) || dataArr.length === 0) {
      container.innerHTML = '<div class="note">Nenhum registro de falha encontrado no sistema.</div>';
      return;
    }
    flatRegistros = dataArr.flatMap(omGroup => 
      omGroup.falhas.map(f => ({
        om: omGroup.om,
        qtdlote: omGroup.qtdlote,
        pn: f.pn,
        serial: f.serial,
        designador: f.designador,
        tipodefeito: f.tipodefeito,
        descricao: f.descricao,
        createdat: f.createdat,
        operador: f.operador
      }))
    );
    popularFiltroOM();
    filtrarRegistros();
  } catch (e) {
    container.innerHTML = `<div class="note" style="color: #ef4444;"><b>Erro ao carregar relatório:</b> ${e.message}</div>`;
  }
});