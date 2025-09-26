// 📁 script.js (VERSÃO FINAL COM CAMPO COD.CAD)

document.addEventListener('DOMContentLoaded', () => {
    // ... (todo o início do script, seletores, etc., continua igual)

    function render() {
        const f = busca.value.toLowerCase();
        let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
        
        // ATUALIZADO: Adicionada a nova célula para Cod.CAD
        tbody.innerHTML = rowsToRender.map(r => `
            <tr data-id="${r.id}">
            <td><input type="checkbox" class="checkbox rowSel" /></td>
            <td>${escapeHTML(r.om)}</td>
            <td>${formatDate(r.createdat)}</td>
            <td>${escapeHTML(r.serial ?? '')}</td>
            <td>${escapeHTML(r.designador ?? '')}</td>
            <td>${escapeHTML(r.tipodefeito ?? '')}</td>
            <td>${escapeHTML(r.pn ?? '')}</td>
            <td>${escapeHTML(r.cod_cad ?? '')}</td> <td>${escapeHTML(r.obs ?? '')}</td>
            </tr>
        `).join('');
        // ...
    }

    form.addEventListener('submit', async (e) => {
        // ...
        try {
            if (editingId) {
                // ATUALIZADO: Lógica de Edição para incluir cod_cad
                const updateData = {
                    om: data.om, qtdlote: data.qtdlote, serial: data.serial, 
                    designador: data.designador, tipodefeito: data.tipodefeito, 
                    pn: data.pn, cod_cad: data.cod_cad, obs: data.obs 
                };
                // ...
            } else {
                // Lógica de Gravação já pega o novo campo automaticamente do getFormData
                // ...
            }
        } catch (error) { /* ... */ }
    });

    tbody.addEventListener('dblclick', (e) => {
        // ...
        if (registroParaEditar) {
            // ATUALIZADO: Preenche o formulário com o novo campo
            form.om.value = registroParaEditar.om || '';
            form.qtdlote.value = registroParaEditar.qtdlote || '';
            form.serial.value = registroParaEditar.serial || '';
            form.designador.value = registroParaEditar.designador || '';
            form.tipodefeito.value = registroParaEditar.tipodefeito || '';
            form.pn.value = registroParaEditar.pn || '';
            form.cod_cad.value = registroParaEditar.cod_cad || ''; // NOVO CAMPO
            form.obs.value = registroParaEditar.obs || '';
            // ...
        }
    });

    btnReqCSV.addEventListener('click', () => {
        // ATUALIZADO: Exportação CSV para incluir o novo campo
        const header = ['OM', 'Data', 'Serial', 'Designador', 'Defeito', 'PN', 'Cod_CAD', 'Observacoes'];
        let csvContent = header.join(',') + '\n';

        dadosParaExportar.forEach(r => {
            const row = [ r.om, formatDate(r.createdat), r.serial || '', r.designador, r.tipodefeito, r.pn || '', r.cod_cad || '', (r.obs || '').replace(/,/g, ';') ];
            csvContent += row.join(',') + '\n';
        });
        // ...
    });

    btnPDF.addEventListener('click', () => {
        // ATUALIZADO: Exportação PDF para incluir o novo campo
        const head = [['OM', 'Data', 'Designador', 'Defeito', 'Cod.CAD', 'Obs']];
        const body = dadosParaExportar.map(r => [
            r.om, formatDate(r.createdat), r.designador,
            r.tipodefeito, r.cod_cad || '-', r.obs || '-'
        ]);
        // ...
    });
    
    // O resto do seu script continua aqui. Use a última versão funcional completa.
});