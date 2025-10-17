document.addEventListener('DOMContentLoaded', async () => {
  const omReportContainer = document.getElementById('omReportContainer');
  omReportContainer.innerHTML = '<div class="note">Carregando inspeções...</div>';

  try {
    // Tenta endereço relativo e absoluto
    let resp = await fetch('/api/om/relatorio');
    if (!resp.ok) {
      resp = await fetch('http://localhost:3001/api/om/relatorio');
    }
    if (!resp.ok) {
      resp = await fetch('http://192.168.0.67:3001/api/om/relatorio');
    }
    if (!resp.ok) throw new Error(`Erro ao buscar inspeções (status ${resp.status})`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      omReportContainer.innerHTML = '<div class="note">Nenhuma inspeção finalizada encontrada.</div>';
      return;
    }
    // Renderiza tabela de OMs
    let html = '<table class="table"><thead><tr><th>OM</th><th>Qtd. Placas</th><th>Tempo</th><th>Defeitos</th></tr></thead><tbody>';
    for (const om of data) {
      html += `<tr><td>${om.omNumber}</td><td>${om.qtdlote}</td><td>${om.tempo || '-'}</td><td>${(om.defeitos && om.defeitos.length) ? om.defeitos.join(', ') : 'Nenhum'}</td></tr>`;
    }
    html += '</tbody></table>';
    omReportContainer.innerHTML = html;
  } catch (e) {
    omReportContainer.innerHTML = `<div class="note">Erro ao buscar inspeções: ${e.message}` +
      '<br>Verifique se o backend está rodando e acessível.<br>Se necessário, ajuste o endereço no arquivo relatorio-inspecoes.js.</div>';
  }
});
