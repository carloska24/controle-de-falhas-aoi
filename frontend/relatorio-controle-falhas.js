
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('falhasReportContainer');
  const buscaInput = document.getElementById('buscaFalhas');
  const btnExportarCSV = document.getElementById('btnExportarCSV');

  let allRegistros = [];
  let flatRegistros = [];

  function renderTabela(registros) {
    console.log('[DEBUG] Registros recebidos para renderização:', registros);
    if (!registros.length) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    let html = '<table class="table"><thead><tr>' +
      '<th>OM</th><th>Cod. Alt</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>Descrição</th><th>Data/Hora</th><th>Operador</th>' +
      '</tr></thead><tbody>';
      for (const r of registros) {
        console.log(`[DEBUG] Linha: OM=${r.om}, PN=${r.pn}, Serial=${r.serial}, Designador=${r.designador}, Defeito=${r.tipodefeito || r.defeito}, Descricao=${r.descricao}, Data=${r.createdat}, Operador=${r.operador}`);
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
    // Busca
    const busca = (buscaInput.value || '').toLowerCase();
    if (busca) {
      regs = regs.filter(r => Object.values(r).some(v => (v || '').toString().toLowerCase().includes(busca)));
    }
    renderTabela(regs);
  }

  function exportarCSV() {
    let csv = 'OM,Cod. Alt,Serial,Designador,Defeito,Descrição,Data/Hora,Operador\n';
    for (const r of flatRegistros) {
      csv += `${r.om},${r.pn},${r.serial},${r.designador},${r.tipodefeito || r.defeito || ''},${r.descricao},${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'},${r.operador}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio-registro-falhas.csv';
    link.click();
  }

  // Eventos
  buscaInput.addEventListener('input', filtrarRegistros);
  btnExportarCSV.addEventListener('click', exportarCSV);

  // Busca dados
  container.innerHTML = '<div class="note">Carregando dados...</div>';
  try {
    const resp = await fetch('/api/relatorio-falhas');
    if (!resp.ok) throw new Error('Erro ao buscar dados');
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    allRegistros = data;
    // Achata todos os registros em uma lista única
    flatRegistros = allRegistros.flatMap(om => om.falhas.map(f => ({
      om: om.om,
      qtdlote: om.qtdlote,
      pn: f.pn,
      serial: f.serial,
      designador: f.designador,
      tipodefeito: f.tipodefeito,
      descricao: f.descricao,
      createdat: f.createdat,
      operador: f.operador
    })));
  filtrarRegistros();
  } catch (e) {
    container.innerHTML = `<div class="note">Erro: ${e.message}</div>`;
  }
});
