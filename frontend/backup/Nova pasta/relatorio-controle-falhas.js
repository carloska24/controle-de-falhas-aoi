document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('falhasReportContainer');
  const btnExportarCSV = document.getElementById('btnExportarCSV');
  const filtroOM = document.getElementById('filtroOMFalhas');
  const omTimeDisplay = document.getElementById('omTimeDisplay');

  let allRegistros = [];
  let flatRegistros = [];

  // Helper para formatar o tempo de MS para HH:MM:SS
  function formatTimer(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

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
      if (data.elapsed) {
        omTimeDisplay.innerHTML = `<strong>Tempo Total de Inspeção:</strong> ${formatTimer(data.elapsed)}`;
      }
    } catch (e) {
      console.error(`Erro ao buscar tempo para OM ${omNumber}:`, e);
      omTimeDisplay.innerHTML = '<span style="color: #ef4444; font-size: 0.9rem;">Erro ao buscar tempo</span>';
    }
  }

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
    container.innerHTML = html;
  }

  function filtrarRegistros() {
    let regs = [...flatRegistros];
    
    // Filtro por OM
    const omSelecionada = filtroOM.value;
    if (omSelecionada) {
      regs = regs.filter(r => r.om === omSelecionada);
    }
    
    renderTabela(regs);
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
    filtrarRegistros();
    fetchAndDisplayOmTime(filtroOM.value);
  });
  btnExportarCSV.addEventListener('click', exportarCSV);

  // --- Carga Inicial ---
  container.innerHTML = '<div class="note">Carregando dados...</div>';
  try {
    const resp = await fetch('/api/relatorio-falhas');
    if (!resp.ok) throw new Error(`Erro ao buscar dados (${resp.status})`);
    const data = await resp.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="note">Nenhum registro de falha encontrado no sistema.</div>';
      return;
    }
    
    allRegistros = data;
    // Achata todos os registros em uma lista única para facilitar a filtragem
    flatRegistros = allRegistros.flatMap(omGroup => 
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