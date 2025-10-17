document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('reparoReportContainer');
  const buscaInput = document.getElementById('buscaReparo');
  const filtroOM = document.getElementById('filtroOMReparo');
  // Filtros removidos
  const btnExportarCSV = document.getElementById('btnExportarCSVReparo');

  let allRegistros = [];
  let flatRegistros = [];

  function renderTabela(registros) {
    if (!registros.length) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    let html = '<table class="table"><thead><tr>' +
      '<th>OM</th><th>Cod. Alt</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>Descrição</th><th>Data/Hora</th><th>Operador</th><th>Status do Reparo</th><th>Observações</th>' +
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
        <td data-label="Status do Reparo">${r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : ''}</td>
        <td data-label="Observações">${r.obs || ''}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // Função de atualizar filtros removida

  let omSelecionada = '';
  function filtrarRegistros() {
    let regs = [...flatRegistros];
    // Busca
    const busca = (buscaInput.value || '').toLowerCase();
    if (busca) {
      regs = regs.filter(r => Object.values(r).some(v => ((v || '').toString().toLowerCase().includes(busca))));
    }
    // Filtro OM
    if (omSelecionada) {
      regs = regs.filter(r => r.om === omSelecionada);
    }
    renderTabela(regs);
  }

  function exportarCSV() {
    let csv = 'OM,Cod. Alt,Serial,Designador,Defeito,Descrição,Data/Hora,Operador,Status do Reparo,Observações\n';
    for (const r of flatRegistros) {
      csv += `${r.om},${r.pn},${r.serial},${r.designador},${r.tipodefeito || r.defeito || ''},${r.descricao},${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'},${r.operador},${r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : ''},${r.obs || ''}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio-reparo.csv';
    link.click();
  }

  buscaInput.addEventListener('input', filtrarRegistros);
  btnExportarCSV.addEventListener('click', exportarCSV);
  filtroOM.addEventListener('change', () => {
    omSelecionada = filtroOM.value;
    filtrarRegistros();
  });

  // Busca dados
  container.innerHTML = '<div class="note">Carregando dados...</div>';
  try {
    const token = localStorage.getItem('authToken');
    const resp = await fetch('/api/registros', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Erro ao buscar dados');
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    flatRegistros = data.map(r => ({
      om: r.om,
      qtdlote: r.qtdlote,
      pn: r.pn,
      serial: r.serial,
      designador: r.designador,
      tipodefeito: r.tipodefeito ?? r.tipoDefeito ?? '',
      descricao: r.descricao,
      createdat: r.createdat ?? r.createdAt ?? '',
      operador: r.operador,
      status: r.status,
      obs: r.obs
    }));
    // Preencher opções de OM
    const oms = [...new Set(flatRegistros.map(r => r.om))];
    filtroOM.innerHTML = '<option value="">Filtrar por OM</option>' + oms.map(om => `<option value="${om}">${om}</option>`).join('');
    filtrarRegistros();
  } catch (e) {
    container.innerHTML = `<div class="note">Erro: ${e.message}</div>`;
  }
});
