document.addEventListener('DOMContentLoaded', async () => {
  // Função para controlar a visibilidade do botão Nova OM
  function updateNovaOMVisibility() {
    if (btnPausarOM && btnNovaInspecao) {
      btnNovaInspecao.style.display = btnPausarOM.style.display !== 'none' ? '' : 'none';
    }
  }
  // --- Filtro por OM (dropdown no lugar do busca) ---
  const filtroOM = document.getElementById('filtroOM');

  let omsCache = [];
  async function popularFiltroOM() {
    if (!filtroOM) return;
    filtroOM.innerHTML = '<option value="">FiltrarOM</option>';
    try {
      // Agora busca apenas OMs pausadas para o dropdown de retomada
      omsCache = await fetchAutenticado('/api/oms?status=pausada');
    } catch (e) { omsCache = []; }
    omsCache.forEach(om => {
      const opt = document.createElement('option');
      opt.value = om.omNumber;
      opt.textContent = `${om.omNumber} (${om.qtdlote || '?' } placas)`;
      opt.dataset.status = om.status;
      filtroOM.appendChild(opt);
    });
  }
  
  // ================== BLOCO 1 (filtroOM) ATUALIZADO ==================
  if (filtroOM) {
    filtroOM.addEventListener('change', async () => {
      const omValue = filtroOM.value;

      // 1. SE O USUÁRIO LIMPAR O FILTRO (selecionar "FiltrarOM")
      if (!omValue) {
        showToast('Filtro de OM removido. Carregando todos os registros.', 'info');
        if (omRunning) {
          await pauseOM(); // Pausa a OM que estava ativa
        }
        // Reseta a UI (timer, botões, campos)
        resetParaNovaOM(); 
        // 'resetParaNovaOM' já limpa os filtros e chama render() com dados antigos.
        // Agora, recarregamos TUDO do zero.
        await carregarRegistros(); // Isso busca TUDO e chama render() novamente.
        return;
      }

      // 2. SE O USUÁRIO SELECIONAR UMA OM
      
      // Garante que qualquer OM ativa no cliente seja pausada
      if (omRunning) {
        console.warn("[OM] Trocando de OM sem pausar. Pausando OM ativa...");
        await pauseOM(); 
      }
      
      // Limpa o estado do timer local
      if (omTimer) clearInterval(omTimer);
      omRunning = false;
      omStart = null;
      omPausedAt = null;
      omTotalPaused = 0;
      localStorage.removeItem('omEmAndamento'); 

      // Busca os dados completos da OM selecionada
      let omData;
      try {
          const resp = await fetch(`/api/om/${encodeURIComponent(omValue)}`);
          if (!resp.ok) throw new Error(`OM ${omValue} não encontrada na API.`);
          omData = await resp.json();
          
          if (omData.status !== 'pausada') {
            showToast(`Esta OM (${omValue}) não está pausada. Status: ${omData.status}`, 'error');
            return;
          }
      } catch (e) {
          showToast(`Erro ao carregar dados da OM ${omValue}: ${e.message}`, 'error');
          unlockOMFields(); 
          return;
      }

      // Preenche o formulário
      const omCacheData = omsCache.find(o => o.omNumber === omValue); 
      omInput.value = omData.omNumber;
      
      try {
         // <<< AQUI ESTÁ A MÁGICA >>>
         // Agora que o backend está corrigido, esta chamada buscará SÓ os registros da OM
         const regResp = await fetchAutenticado(`/api/registros?om=${encodeURIComponent(omData.omNumber)}`);
         registros = regResp || []; // Atualiza o array global SÓ com os registros filtrados
         
         if (busca) busca.value = ''; // <<< NOVO: Limpa o outro filtro (busca por texto)
         
         render(); // <<< NOVO: Renderiza a tabela SÓ com os registros filtrados

         // Tenta pegar o qtdlote
         if (omCacheData && omCacheData.qtdlote) {
            qtdLoteInput.value = omCacheData.qtdlote;
         } else if (registros.length > 0) {
            qtdLoteInput.value = registros[0].qtdlote;
         }
      } catch(e) { 
         showToast('Erro ao carregar registros da OM.', 'error');
      }
      lockOMFields(); // Trava os campos da OM

      // Configura o estado do timer local para a OM carregada
      localStorage.setItem('omEmAndamento', omData.omNumber); 
      omStart = Date.now() - (omData.elapsed || 0); 
      omTotalPaused = omData.pausedTime || 0;
      omRunning = false; 
      omPausedAt = Date.now(); 

      // Atualiza a UI (botões e timer)
      ensureOMDisplay();
      btnIniciarOM.style.display = 'none';
      btnPausarOM.style.display = '';
      btnFinalizarOM.style.display = '';
      btnNovaInspecao.style.display = ''; 

      if (btnPausarOM) {
        btnPausarOM.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span class="btn-label">Retomar</span>';
        try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
        btnPausarOM.setAttribute('title','Retomar Inspeção');
      }
      
      if (omDisplay) omDisplay.textContent = formatTimer(omData.elapsed || 0);

      showToast(`OM ${omData.omNumber} carregada e pronta para retomar.`, 'info');
      
      // Reseta o <select> para o placeholder
      filtroOM.value = ''; 
    });
    
    // O popularFiltroOM() continua o mesmo
    popularFiltroOM();
  }
  // ================== FIM DA ALTERAÇÃO 1 ==================

  // --- Elementos do Formulário ---
  const form = document.querySelector('#formRegistro');
  const omInput = document.getElementById('om');
  const qtdLoteInput = document.getElementById('qtdlote');

  // --- Controle de Inspeção OM ---
  let omTimer = null;
  let omStart = null;
  let omPausedAt = null;
  let omTotalPaused = 0;
  let omRunning = false;
  let omDisplay = document.getElementById('omTimerDisplay');
  const omTimerBox = document.getElementById('omTimerBox');
  const omFinalTime = document.getElementById('omFinalTime');

  const btnIniciarOM = document.querySelector('[data-action="start-om"]') || document.getElementById('btnIniciarOM');
  const btnPausarOM = document.querySelector('[data-action="pause-om"]') || document.getElementById('btnPausarOM');
  const btnFinalizarOM = document.querySelector('[data-action="finish-om"]') || document.getElementById('btnFinalizarOM');
  const btnNovaInspecao = document.querySelector('[data-action="new-om"]') || document.getElementById('btnNovaInspecao');
  
  if (!btnIniciarOM || !btnPausarOM || !btnFinalizarOM) {
    alert('Erro: Botões OM não encontrados no DOM! Verifique se o script está sendo carregado após o HTML.');
    console.error('[OM] Botões não encontrados:', { btnIniciarOM, btnPausarOM, btnFinalizarOM });
  } else {
    console.log('[OM] Botões encontrados:', { btnIniciarOM, btnPausarOM, btnFinalizarOM });
    updateNovaOMVisibility();
  }

  // --- Funções de Controle de UI ---
  function ensureOMDisplay() {
  if (omTimerBox) omTimerBox.style.display = 'flex'; // Alterado para flex
  if (omDisplay) omDisplay.style.display = '';
  updateNovaOMVisibility();
  }

  function formatTimer(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms/1000);
    const h = Math.floor(totalSec/3600).toString().padStart(2,'0');
    const m = Math.floor((totalSec%3600)/60).toString().padStart(2,'0');
    const s = (totalSec%60).toString().padStart(2,'0');
    return `${h}:${m}:${s}`;
  }

  // ================== BLOCO 2 (formatTimestamp) ADICIONADO ==================
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
  // ================== FIM DA ALTERAÇÃO 2 ==================

  function updateOMTimer() {
    if (!omRunning || !omStart) return;
    const now = Date.now();
    const elapsed = now - omStart - omTotalPaused;
    if (omDisplay) omDisplay.textContent = formatTimer(elapsed);
  }

  // ================== NOVAS FUNÇÕES DE BLOQUEIO ==================
  function lockOMFields() {
    if (omInput) {
        omInput.readOnly = true;
        omInput.classList.add('readonly-field');
    }
    if (qtdLoteInput) {
        qtdLoteInput.readOnly = true;
        qtdLoteInput.classList.add('readonly-field');
    }
  }

  function unlockOMFields() {
    if (omInput) {
        omInput.readOnly = false;
        omInput.classList.remove('readonly-field');
    }
    if (qtdLoteInput) {
        qtdLoteInput.readOnly = false;
        qtdLoteInput.classList.remove('readonly-field');
    }
  }
  // Adicione este CSS para feedback visual dos campos travados
  document.head.insertAdjacentHTML('beforeend', '<style>.readonly-field { background-color: #1e293b !important; color: #94a3b8 !important; cursor: not-allowed; }</style>');
  // ================== FIM DAS FUNÇÕES DE BLOQUEIO ==================


  // ================== FUNÇÃO startOM() ATUALIZADA ==================
  async function startOM() {
    const omValue = omInput.value;
    if (!omValue) {
      showToast('Informe o número da OM antes de iniciar.', 'error');
      return;
    }
    // Trava os campos ANTES de verificar, para evitar cliques duplos
  lockOMFields();
  updateNovaOMVisibility();

    // 1. Verifica se a OM já existe NO SERVIDOR (em memória)
    let existingOMData = null;
    try {
        const checkResp = await fetch(`/api/om/${encodeURIComponent(omValue)}`);
        if (checkResp.ok) {
            existingOMData = await checkResp.json();
        }
    } catch (e) {
        console.warn('[OM] Falha ao verificar OM existente, tratando como nova.', e);
    }

    // 2. Trata status da OM em memória
    if (existingOMData) {
        if (existingOMData.status === 'em_andamento') {
            showToast('Esta OM já está em andamento em outra sessão.', 'error');
            unlockOMFields(); // Desbloqueia se falhar
            return;
        }
        if (existingOMData.status === 'finalizada') {
            showToast('Esta OM já foi finalizada (nesta sessão) e não pode ser reiniciada.', 'error');
            unlockOMFields(); // Desbloqueia se falhar
            return;
        }

        // 3. Se estiver 'pausada', retoma
        if (existingOMData.status === 'pausada') {
            console.log(`[OM] OM ${omValue} encontrada, status 'pausada'. Retomando...`);
            localStorage.setItem('omEmAndamento', omValue);
            
            omStart = Date.now() - (existingOMData.elapsed || 0);
            omTotalPaused = existingOMData.pausedTime || 0;
            omPausedAt = null;
            omRunning = true;

            try {
                await fetchAutenticado(`/api/om/resume`, {
                    method: 'PUT',
                    body: JSON.stringify({ omNumber: omValue })
                });

                ensureOMDisplay();
                if (omFinalTime) omFinalTime.style.display = 'none';
                btnIniciarOM.style.display = 'none';
                btnPausarOM.style.display = '';
                btnFinalizarOM.style.display = '';
                btnNovaInspecao.style.display = 'none'; 
                if (btnPausarOM) {
                    btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
                    try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
                    btnPausarOM.setAttribute('title','Pausar Inspeção');
                }
                if (omTimer) clearInterval(omTimer);
                omTimer = setInterval(updateOMTimer, 1000);
                updateOMTimer();
                showToast(`OM ${omValue} retomada.`, 'info');

                if (busca) busca.value = omValue;
                render(); 
                // Campos já estão travados
            } catch (e) {
                showToast(`Erro ao retomar OM ${omValue}: ${e.message}`, 'error');
                unlockOMFields(); // Desbloqueia se falhar
            }
            return; 
        }
    }

    // 4. Se não está na memória (existingOMData == null), verifica no BANCO DE DADOS (se já foi finalizada)
    try {
        const dbCheckResp = await fetchAutenticado(`/api/om-time/${encodeURIComponent(omValue)}`);
        if (dbCheckResp) { // dbCheckResp.ok não funciona aqui, fetchAutenticado retorna dados ou lança erro
            // Se encontrou (não deu 404), é porque está finalizada no DB
            showToast('Esta OM já foi finalizada anteriormente e não pode ser reiniciada.', 'error');
            unlockOMFields(); // Desbloqueia
            return;
        }
    } catch (dbError) {
        // Erro 404 é esperado (significa que NÃO está no DB), então continuamos.
        if (dbError.status === 404) {
             console.log('[OM] OM não encontrada no DB, pode ser iniciada.');
        } else {
            // Outro erro (ex: rede)
            console.warn('[OM] Falha ao verificar OM no DB.', dbError);
            showToast(`Falha ao verificar OM no banco de dados: ${dbError.message}`, 'error');
            unlockOMFields();
            return;
        }
    }

    // 5. Se passou por tudo, é uma OM nova. Inicia.
    console.log(`[OM] Iniciando nova OM: ${omValue}`);
    localStorage.setItem('omEmAndamento', omValue);
    try {
        const resp = await fetchAutenticado(`/api/om/start`, {
            method: 'POST',
            body: JSON.stringify({ omNumber: omValue })
        });
        
        const data = resp; // fetchAutenticado já retorna o JSON
        
        omStart = data.startTime;
        omTotalPaused = data.pausedTime || 0;
        omPausedAt = null;
        omRunning = true;

        ensureOMDisplay();
        if (omDisplay) omDisplay.textContent = '00:00:00';
        if (omFinalTime) omFinalTime.style.display = 'none';
        btnIniciarOM.style.display = 'none';
        btnPausarOM.style.display = '';
        btnFinalizarOM.style.display = '';
        btnNovaInspecao.style.display = 'none'; 
        if (btnPausarOM) {
            btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
            try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
            btnPausarOM.setAttribute('title','Pausar Inspeção');
        }
        if (omTimer) clearInterval(omTimer);
        omTimer = setInterval(updateOMTimer, 1000);
        // Campos já estão travados
    } catch (e) {
        localStorage.removeItem('omEmAndamento');
        showToast(e.message, 'error');
        unlockOMFields(); // Desbloqueia se falhar
    }
  }
  // ================== FIM DA FUNÇÃO startOM() ==================

  async function pauseOM() {
    if (!omRunning || omPausedAt) return;
    omPausedAt = Date.now();
    omRunning = false;
    if (btnPausarOM) {
      btnPausarOM.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span class="btn-label">Retomar</span>';
      try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
      btnPausarOM.setAttribute('title','Retomar Inspeção');
    }
    btnNovaInspecao.style.display = '';
    if (omTimer) clearInterval(omTimer);
    const omValue = localStorage.getItem('omEmAndamento') || omInput.value;
    if (omValue) {
      await fetchAutenticado(`/api/om/pause`, {
        method: 'PUT',
        body: JSON.stringify({ omNumber: omValue })
      });
      // Repopula o filtro de OMs pausadas após pausar
      await popularFiltroOM();
    }
    updateNovaOMVisibility();
  }

  async function resumeOM() {
    if (!omPausedAt) return;
    omTotalPaused += Date.now() - omPausedAt;
    omPausedAt = null;
    omRunning = true;
      if (btnPausarOM) {
  btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
  try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
      btnPausarOM.setAttribute('title','Pausar Inspeção');
    }
    btnNovaInspecao.style.display = 'none';
    omTimer = setInterval(updateOMTimer, 1000);
    const omValue = localStorage.getItem('omEmAndamento') || omInput.value;
    if (omValue) {
      await fetchAutenticado(`/api/om/resume`, {
        method: 'PUT',
        body: JSON.stringify({ omNumber: omValue })
      });
    }
    updateNovaOMVisibility();
  }

  // ================== BLOCO 3 (finalizarOM) ATUALIZADO ==================
  async function finalizarOM() {
    if (omTimer) clearInterval(omTimer);
    let elapsed = 0;
    let startTime = null; // <<< NOVO
    let endTime = null;   // <<< NOVO

    const omValue = localStorage.getItem('omEmAndamento') || omInput.value;
    if (omValue) {
      try {
        const resp = await fetchAutenticado(`/api/om/finalizar`, {
          method: 'PUT',
          body: JSON.stringify({ omNumber: omValue })
        });
        if (resp) {
          elapsed = resp.elapsed || 0;
          startTime = resp.startTime; // <<< NOVO: Captura o startTime da API
          endTime = resp.endTime;     // <<< NOVO: Captura o endTime da API
        }
      } catch (e) {
        console.error("Erro ao finalizar OM:", e);
      }
    }

    if (!elapsed && omStart) { // Calcula localmente se a chamada falhar mas o timer existia
      const now = Date.now();
      elapsed = (omPausedAt ? omPausedAt : now) - omStart - omTotalPaused;
      if (elapsed < 0) elapsed = 0;
    }
    
    // Fallback caso a API falhe mas o cliente tenha os dados
    if (!endTime) endTime = Date.now(); 
    if (!startTime) startTime = omStart; 

    if (omDisplay) omDisplay.textContent = formatTimer(elapsed);
    btnIniciarOM.style.display = '';
    btnPausarOM.style.display = 'none';
    btnFinalizarOM.style.display = 'none';
    btnNovaInspecao.style.display = 'none'; 
    omRunning = false;
    omStart = null;
    omPausedAt = null;
    omTotalPaused = 0;

    if (omFinalTime) {
      // <<< GRANDE MUDANÇA AQUI >>>
      // Usamos innerHTML para permitir quebras de linha com <br>
      omFinalTime.innerHTML = `
        <strong>Início:</strong> ${formatTimestamp(startTime)}<br>
        <strong>Fim:</strong> ${formatTimestamp(endTime)}<br>
        <strong>Tempo Total: ${formatTimer(elapsed)}</strong>
      `;
      omFinalTime.style.display = ''; // Garante que está visível
      // <<< FIM DA MUDANÇA >>>
    }
    
    showToast(`Tempo total de inspeção: ${formatTimer(elapsed)}`,'info');
    localStorage.removeItem('omEmAndamento');
    unlockOMFields(); // <-- DESBLOQUEIA OS CAMPOS
    updateNovaOMVisibility();
  }
  // ================== FIM DA ALTERAÇÃO 3 ==================


  // ================== BLOCO 4 (resetParaNovaOM) ATUALIZADO ==================
  // Limpa o ESTADO DO CLIENTE para permitir iniciar uma nova OM.
  // A OM pausada continua salva no backend.
  function resetParaNovaOM() {
    console.log('[OM] Resetando UI para nova OM.');
    
    // 1. A OM atual JÁ DEVE estar pausada (o botão só aparece se estiver)
    if (omRunning) {
        //showToast('Ação inesperada. A OM ainda está em execução.', 'error');
        // Não bloqueia, apenas pausa
        pauseOM();
    }
    // 2. Limpar o estado do timer do cliente
    if (omTimer) clearInterval(omTimer);
    omRunning = false;
    omStart = null;
    omPausedAt = null;
    omTotalPaused = 0;
    // 3. Limpar o localStorage para que 'restaurarOM' não puxe a OM antiga
    localStorage.removeItem('omEmAndamento');
    // 4. Resetar a UI do timer
    if (omDisplay) omDisplay.textContent = '00:00:00';
    if (omFinalTime) omFinalTime.style.display = 'none';
    if (btnIniciarOM) btnIniciarOM.style.display = '';
    if (btnPausarOM) btnPausarOM.style.display = 'none';
    if (btnFinalizarOM) btnFinalizarOM.style.display = 'none';
    if (btnNovaInspecao) btnNovaInspecao.style.display = 'none'; // Esconde o próprio botão
    // 5. Resetar o formulário completamente (diferente do resetForm normal)
    form.reset(); // Limpa OM, QtdLote, etc.
    form.dataset.editing = '';
    if (btnGravar) btnGravar.querySelector('.btn-text').textContent = 'Gravar';
    // 6. Limpar o filtro de busca
    if (busca) busca.value = '';
    if (filtroOM) filtroOM.value = ''; // <<< LINHA ADICIONADA
    
    // 7. Renderizar a tabela (agora sem filtro)
    // Não chama carregarRegistros() para não fazer requisição,
    // apenas limpa o array local e renderiza.
    registros = [];
    render();
    
    unlockOMFields(); // <-- DESBLOQUEIA OS CAMPOS
    if (omInput) omInput.focus();
  }
  // ================== FIM DA ALTERAÇÃO 4 ==================

  // Restaurar timer da OM ao carregar a página
  async function restaurarOM() {
    const omValue = localStorage.getItem('omEmAndamento');
    console.log('[OM] [restaurarOM] Valor em localStorage:', omValue);
    if (!omValue) {
      unlockOMFields(); // Garante que os campos estão livres se não há OM
      return;
    }
    omInput.value = omValue;
    try {
      const resp = await fetch(`/api/om/${encodeURIComponent(omValue)}`);
      console.log('[OM] [restaurarOM] Resposta da API:', resp);
      if (!resp.ok) {
        console.warn('[OM] [restaurarOM] Resposta da API não OK:', resp.status);
        localStorage.removeItem('omEmAndamento'); // Limpa OM inválida
        unlockOMFields();
        return;
      }
      const data = await resp.json();
      console.log('[OM] [restaurarOM] Dados recebidos:', data);

      // Carrega a QtdLote da OM (precisa de um fetch nos registros)
      // Otimização: Tenta pegar dos registros já carregados se 'registros' já estiver populado
      let omRegs = [];
      if (registros && registros.length > 0) {
        omRegs = registros.filter(r => r.om === omValue);
      } else {
        // Fallback: busca na API se os registros não estiverem prontos
        // Usamos fetchAutenticado aqui para consistência
        const regResp = await fetchAutenticado(`${API_URL}?om=${encodeURIComponent(omValue)}`); // Busca SÓ os registros da OM
        registros = regResp || []; // Armazena os registros carregados
        omRegs = registros; // Todos os registros agora são dessa OM
      }
      
      if (omRegs.length > 0) {
        qtdLoteInput.value = omRegs[0].qtdlote;
      }
      
      // Renderiza a tabela com os registros da OM restaurada
      render();

      omStart = Date.now() - (data.elapsed || 0);
      omTotalPaused = data.pausedTime || 0;
      omRunning = data.status === 'em_andamento';

      if (omRunning) {
        console.log('[OM] [restaurarOM] OM em andamento, restaurando timer.');
        ensureOMDisplay();
        btnIniciarOM.style.display = 'none';
        btnPausarOM.style.display = '';
        btnFinalizarOM.style.display = '';
        if (btnPausarOM) {
          btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
          try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
          btnPausarOM.setAttribute('title','Pausar Inspeção');
        }
        if (omTimer) clearInterval(omTimer);
        omTimer = setInterval(updateOMTimer, 1000);
        updateOMTimer();
        lockOMFields(); // <-- BLOQUEIA OS CAMPOS
        if (qtdLoteInput) {
          qtdLoteInput.readOnly = true;
          qtdLoteInput.classList.add('readonly-field');
        }
      } else if (data.status === 'pausada') {
        console.log('[OM] [restaurarOM] OM pausada, restaurando estado.');
        omRunning = false;
        omPausedAt = Date.now();
        ensureOMDisplay();
        btnIniciarOM.style.display = 'none';
        btnPausarOM.style.display = '';
        btnFinalizarOM.style.display = '';
        btnNovaInspecao.style.display = '';
        if (btnPausarOM) {
          btnPausarOM.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span class="btn-label">Retomar</span>';
          try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
          btnPausarOM.setAttribute('title','Retomar Inspeção');
        }
        if (omTimer) clearInterval(omTimer);
        // Não inicia o timer, mas mostra o tempo atual
        omDisplay.textContent = formatTimer(data.elapsed || 0);
        lockOMFields(); // <-- BLOQUEIA OS CAMPOS
        if (qtdLoteInput) {
          qtdLoteInput.readOnly = true;
          qtdLoteInput.classList.add('readonly-field');
        }
      } else if (data.status === 'finalizada') {
        console.log('[OM] [restaurarOM] OM finalizada, exibindo tempo final.');
        omRunning = false;
        omPausedAt = null;
        if (omTimer) clearInterval(omTimer);
        btnIniciarOM.style.display = '';
        btnPausarOM.style.display = 'none';
        btnFinalizarOM.style.display = 'none';
        if (omDisplay) omDisplay.textContent = formatTimer(data.elapsed);
        if (omFinalTime) {
          omFinalTime.innerHTML = `
            <strong>Início:</strong> ${formatTimestamp(data.startTime)}<br>
            <strong>Fim:</strong> ${formatTimestamp(data.endTime)}<br>
            <strong>Tempo Total: ${formatTimer(data.elapsed)}</strong>
          `;
          omFinalTime.style.display = '';
        }
        unlockOMFields(); // <-- DESBLOQUEIA OS CAMPOS
        localStorage.removeItem('omEmAndamento');
      }
    } catch (e) {
      console.error('[OM] [restaurarOM] Erro ao restaurar OM:', e);
      unlockOMFields();
      localStorage.removeItem('omEmAndamento');
    }
  }

  // --- Event Listeners dos Botões OM ---
  if (btnIniciarOM) btnIniciarOM.addEventListener('click', () => {
  console.log('[OM] Clique em Iniciar OM');
  showToast('Iniciando OM...', 'info');
  startOM();
  });
  if (btnPausarOM) btnPausarOM.addEventListener('click', () => {
    if (omRunning && !omPausedAt) {
      showToast('OM pausada.', 'info');
      pauseOM();
    } else {
      showToast('OM retomada.', 'info');
      resumeOM();
    }
  });
  if (btnFinalizarOM) btnFinalizarOM.addEventListener('click', () => {
  showToast('Finalizando OM...', 'info');
  finalizarOM();
  });
  if (btnNovaInspecao) btnNovaInspecao.addEventListener('click', () => {
  console.log('[OM] Clique em Nova OM');
  showToast('Preparando para nova OM.', 'info');
  resetParaNovaOM();
  });
  
  // --- Setup Inicial ---
  const { jsPDF } = window.jspdf;
  let user = null;
  
  // Lógica de Controle de Acesso: mostra elementos apenas para admins
  let isAdmin = false; // Definido dentro do IIFE

  // Detecta se estamos em ambiente local ou de produção para definir a URL da API
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  const API_BASE_URL = window.API_BASE_URL || (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : ('')); // Base vazia para usar caminhos relativos
  const API_URL = `${API_BASE_URL}/api/registros`;
  let registros = [];
  const DEMO_KEY = 'registrosDemo';

  function getDemoRegistros() {
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY)) || [];
    } catch { return []; }
  }

  function setDemoRegistros(arr) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(arr || []));
  }
  let sortState = { key: 'createdat', dir: 'desc' }; // padrão: mais recentes primeiro
  let searchTimer;
  
  // --- Seleção de Elementos DOM ---
  // const form = document.querySelector('#formRegistro'); // Já definido
  const btnGravar = form.querySelector('button[type="submit"]');
  const btnLimpar = document.querySelector('[data-action="clear"]') || document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('[data-action="exclude"]') || document.querySelector('#btnExcluir');
  const btnDemo = document.querySelector('[data-action="add-demo"]') || document.querySelector('#btnDemo');
  const btnGerarRequisicao = document.querySelector('[data-action="generate-request"]') || document.querySelector('#btnGerarRequisicao');
  // const btnPDF = document.querySelector('[data-action="export-pdf"]') || document.querySelector('#btnPDF'); // Botão não existe no HTML
  // const btnReqCSV = document.querySelector('[data-action="export-req-csv"]') || document.querySelector('#btnReqCSV'); // Botão não existe no HTML
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  const userDisplay = document.querySelector('#userDisplay');
  const btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user && user.role === 'admin') {
        try {
          await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
        } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
      }
      localStorage.clear();
      sessionStorage.clear();
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(()=>{});
      window.location.href = 'login.html';
    });
  }
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  const mDistrib = document.querySelector('#mDistrib');
  const pie = document.querySelector('#pieChart');
  const pieCenter = document.querySelector('#pieCenter');
  const qualEmoji = document.querySelector('.quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('.quality-aux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const loadingOverlay = document.querySelector('#loadingOverlay');
  const toastContainer = document.querySelector('#toastContainer');
  
  // --- Funções Auxiliares ---
  
  // ================== fetchAutenticado ATUALIZADO ==================
  async function fetchAutenticado(url, options = {}) {
      const defaultHeaders = { 'Content-Type': 'application/json' };
      options.headers = { ...defaultHeaders, ...options.headers };
      options.credentials = options.credentials || 'include';
      const response = await fetch(url, options);
      
      if (response.status === 401 || response.status === 403) {
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Token inválido ou expirado.');
      }
      
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null; // Sucesso sem conteúdo
      }
      
      const data = await response.json().catch(() => ({ error: 'Resposta inválida do servidor (não-JSON)' }));

      if (!response.ok) {
        // Lança um erro que inclui a mensagem da API ou um status
        const errorMsg = data.error || `Erro ${response.status}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }
      
      return data; // Sucesso com conteúdo JSON
  }
  // ================== FIM DA ATUALIZAÇÃO ==================

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }
  // Adiciona a animação de saída ao CSS dinamicamente
  document.head.insertAdjacentHTML('beforeend', '<style>@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }</style>');

  function setLoading(isLoading) {
    if (loadingOverlay) {
      loadingOverlay.classList.toggle('hidden', !isLoading);
    }
  }

  // ================== BLOCO 5 (carregarRegistros) ATUALIZADO ==================
  async function carregarRegistros() {
    setLoading(true);
    try {
      // <<< NOVO: Garante que os filtros sejam limpos ao carregar tudo
      if (filtroOM) filtroOM.value = '';
      if (busca) busca.value = '';
      // Fim da adição

  let apiRegs = await fetchAutenticado(API_URL);
  if (!Array.isArray(apiRegs)) apiRegs = [];
  const demoRegs = getDemoRegistros();
  registros = [...apiRegs, ...demoRegs];
  console.log('[DEBUG] Registros recebidos do backend + DEMO:', registros);
  render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
      showToast(`Falha ao carregar registros: ${error.message}`, 'error');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444;">Erro ao carregar dados.</td></tr>`;
    } finally {
      setLoading(false);
    }
  }
  // ================== FIM DA ALTERAÇÃO 5 ==================

  function getFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => { data[key.toLowerCase()] = value.trim(); });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }

  function render() {
      // ATENÇÃO: A variável global 'registros' agora pode estar
      // pré-filtrada pela OM (se `filtroOM` foi usado).
      // 'busca' (texto) filtra *dentro* do que já foi retornado (seja tudo ou uma OM).
      const f = (busca?.value || '').toLowerCase();
      let rowsToRender = Array.isArray(registros) ? registros : [];

      if (f) {
        rowsToRender = rowsToRender.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
      }

      // Ordenação
      const key = sortState.key;
      const dir = sortState.dir === 'asc' ? 1 : -1;
      if (Array.isArray(rowsToRender)) {
        rowsToRender.sort((a,b) => {
          let va = a[key] ?? '';
          let vb = b[key] ?? '';
          if (key === 'createdat') { va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime(); }
          else { va = va.toString().toLowerCase(); vb = vb.toString().toLowerCase(); }
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }

      const empty = document.getElementById('emptyState');
      if (rowsToRender.length === 0) {
        if (tbody) tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
      } else {
        if (empty) empty.style.display = 'none';
        if (tbody) tbody.innerHTML = rowsToRender.map(r => `
          <tr data-id="${r.id}">
            <td data-label="Selecionar"><input type="checkbox" class="checkbox rowSel" /></td>
            <td data-label="OM">${escapeHTML(r.om ?? '')}</td>
            <td data-label="Cod. Alt">${escapeHTML(r.pn ?? '')}</td>
            <td data-label="Serial">${escapeHTML(r.serial ?? '')}</td>
            <td data-label="Designador">${escapeHTML(r.designador ?? '')}</td>
            <td data-label="Defeito">${escapeHTML(r.tipodefeito ?? '')}</td>
            <td data-label="Descrição">${escapeHTML(r.descricao ?? '')}</td>
            <td data-label="Data/Hora">${formatDate(r.createdat)}</td>
          </tr>
        `).join('');
      }
      updateSelectionState();
      updateQuality(); // Não precisa de argumento, usa getRowsForScope
      
      // Filtro aplicado: usa rowsToRender para métricas
      if (typeof mTotal !== 'undefined' && mTotal) {
        mTotal.textContent = rowsToRender.length;
      }
      if (typeof mOMs !== 'undefined' && mOMs) {
        const omSet = new Set(rowsToRender.map(r => r.om));
        mOMs.textContent = omSet.size;
      }
      // Top 3 defeitos
      if (typeof mDistrib !== 'undefined' && mDistrib) {
        if (rowsToRender.length === 0) {
          mDistrib.textContent = '—';
        } else {
          const counts = {};
          rowsToRender.forEach(r => {
            if (!r.tipodefeito) return;
            counts[r.tipodefeito] = (counts[r.tipodefeito] || 0) + 1;
          });
          const top = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([defeito, qtd]) => `${defeito} (${qtd})`)
            .join(', ');
          mDistrib.textContent = top || '—';
        }
      }
  }

  // if (tbody) tbody.addEventListener('change', (e) => { ... }); // Movido para o IIFE
  // if (selAll) selAll.addEventListener('change', () => { ... }); // Movido para o IIFE
  
  function getRowsForScope() {
    if (!escopoQualidade) return []; // Guarda
    const scope = escopoQualidade.value;
    
    // 'registros' aqui já pode estar filtrado por OM
    const currentRegistros = registros; 

    if (scope === 'selecionados') {
        const ids = selectedIds();
        return currentRegistros.filter(r => ids.includes(r.id));
    }
    // 'visiveis'
    const f = (busca?.value || '').toLowerCase();
    if (f) {
      return currentRegistros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
    }
    return currentRegistros; // Retorna todos os registros da OM (ou todos, se nenhum filtro OM)
  }

  function updateQuality() {
      if (!pie) return;
      const total = Number(totalInspec.value || 0);
      const fails = getRowsForScope().length;
      if (total === 0) {
          const ctx = pie.getContext('2d');
          ctx.clearRect(0,0,pie.width,pie.height);
          if(qualEmoji) qualEmoji.textContent = '😐';
          if(qualText) qualText.textContent = 'Qualidade Indefinida';
          if(pieCenter) pieCenter.textContent = '—';
          if(qualAux) qualAux.innerHTML = 'Informe o <b>Total Inspecionado</b> para calcular.';
          if(qualDetalhe) qualDetalhe.textContent = '—';
          return;
      }
      const badPct = Math.min(100, Math.max(0, (fails / total) * 100));
      const goodPct = 100 - badPct;
      drawPie(goodPct);
      
      let emoji, rotulo, centerColor;
      if (goodPct >= 95) { emoji = '😃'; rotulo = 'Excelente'; }
      else if (goodPct >= 85) { emoji = '🙂'; rotulo = 'Muito Bom'; }
      else if (goodPct >= 75) { emoji = '😐'; rotulo = 'Regular'; }
      else { emoji = '😟'; rotulo = 'Ruim'; centerColor = '#ef4444'; } // Cor perigo

      if (pieCenter) {
        pieCenter.textContent = `${goodPct.toFixed(0)}%`;
        pieCenter.style.color = centerColor || '#f1f5f9'; // Cor texto
      }
      if(qualEmoji) qualEmoji.textContent = emoji;
      if(qualText) qualText.textContent = `${rotulo} (${goodPct.toFixed(1)}% aproveitamento)`;
      if(qualDetalhe) qualDetalhe.textContent = `Falhas contadas: ${fails} de ${total} itens inspecionados (${badPct.toFixed(1)}% de falhas).`;
  }

  function drawPie(goodPct) {
      const canvas = pie;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const R = canvas.width / 2;
      const startAngle = -0.5 * Math.PI; // Começa no topo
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // 1. Desenha o arco de falha (fundo neutro)
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, startAngle, startAngle + 2 * Math.PI);
      ctx.fillStyle = '#334155'; // var(--muted)
      ctx.fill();
  
      // 2. Desenha o arco de sucesso (verde) por cima
      const goodAngle = (goodPct / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, startAngle, startAngle + goodAngle);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  function escapeHTML(s) { return s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }

  function resetForm() {
  const om = omInput.value;
  const qtdlote = qtdLoteInput.value;
  const omTravada = omInput && omInput.readOnly;
  const qtdTravada = qtdLoteInput && qtdLoteInput.readOnly;
  form.reset();
  form.dataset.editing = '';
  btnGravar.querySelector('.btn-text').textContent = 'Gravar';
  // Sempre restaura os valores se os campos estão travados (OM em andamento)
  if (omInput && omTravada) omInput.value = om;
  if (qtdLoteInput && qtdTravada) qtdLoteInput.value = qtdlote;
  // Se não estiver travado, mantém o comportamento anterior
  if (omInput && !omTravada) omInput.value = om;
  if (qtdLoteInput && !qtdTravada) qtdLoteInput.value = qtdlote;
  if (form.designador) form.designador.focus();
  }
  
  function updateSelectionState() {
    const checkedCount = selectedIds().length;
    if (btnExcluir) btnExcluir.disabled = checkedCount === 0;
    if (btnGerarRequisicao) btnGerarRequisicao.disabled = checkedCount === 0;
    
    const totalCheckboxes = document.querySelectorAll('.rowSel').length;
    if (selAll) {
      if (totalCheckboxes > 0 && checkedCount === totalCheckboxes) {
          selAll.checked = true;
          selAll.indeterminate = false;
      } else if (checkedCount > 0) {
          selAll.checked = false;
          selAll.indeterminate = true;
      } else {
          selAll.checked = false;
          selAll.indeterminate = false;
      }
    }
  }
  
  // ================== IIFE DE INICIALIZAÇÃO ==================
  (async () => {
    // --- Autenticação ---
    try {
      let ensureUser = window.__utils__?.ensureUser;
      if (!ensureUser) {
        const mod = await import('./utils.js');
        ensureUser = mod.ensureUser;
      }
      if (typeof ensureUser === 'function') user = await ensureUser();
      if (!user) user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) { user = JSON.parse(localStorage.getItem('user') || 'null'); }
    
    if (!user) { window.location.href = 'login.html'; return; }

    // --- Configuração de UI pós-auth ---
    isAdmin = !!(user && user.role === 'admin');
    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('admin-only'));
    } else {
      if (btnDemo) btnDemo.style.display = 'none';
    }
    if (userDisplay && user) { userDisplay.textContent = user.name || user.username; }

    // --- Carregamento Inicial ---
    // Restaurar OM só deve acontecer DEPOIS de carregarRegistros
    // Mas carregarRegistros() agora é chamado dentro de restaurarOM()
    // se uma OM for encontrada, ou aqui se não for.
    if (!localStorage.getItem('omEmAndamento')) {
      await carregarRegistros();
    }
    await restaurarOM(); 
    
    // --- Event Listeners que dependem de 'render' ou 'updateQuality' ---
    if (tbody) {
      tbody.addEventListener('change', (e) => { 
        if (e.target.classList.contains('rowSel')) { 
          updateSelectionState();
          if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
        }
      });
      
      tbody.addEventListener('dblclick', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = tr.dataset.id;
        const registroParaEditar = registros.find(r => r.id === id);
        if (registroParaEditar) {
            // Não preenche OM e QtdLote se estiverem travados
            if (omInput && !omInput.readOnly) {
                form.om.value = registroParaEditar.om || '';
                form.qtdlote.value = registroParaEditar.qtdlote || '';
            }
            form.serial.value = registroParaEditar.serial || '';
            form.designador.value = registroParaEditar.designador || '';
            form.tipodefeito.value = registroParaEditar.tipodefeito || '';
            form.pn.value = registroParaEditar.pn || '';
            form.descricao.value = registroParaEditar.descricao || '';
            form.obs.value = registroParaEditar.obs || '';
            form.dataset.editing = id;
            btnGravar.querySelector('.btn-text').textContent = 'Atualizar';
            window.scrollTo(0, 0);
            form.designador.focus();
        }
      });
    }
    
    if (selAll) {
      selAll.addEventListener('change', () => {
        const isChecked = selAll.checked;
        document.querySelectorAll('.rowSel').forEach(checkbox => { checkbox.checked = isChecked; });
        updateSelectionState();
        if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
      });
    }

  })(); // Fim do IIFE de inicialização
  // ================== FIM DO IIFE ==================

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingId = form.dataset.editing;
    const data = getFormData();
    if (!data.om || !data.qtdlote || !data.designador || !data.tipodefeito) {
        showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
        return;
    }
    
    // Garante que a OM/QtdLote não foram alteradas manualmente enquanto estavam travadas
    if (omInput.readOnly && (data.om !== omInput.value || data.qtdlote !== Number(qtdLoteInput.value)) ) {
      showToast('Não é possível alterar a OM ou Quantidade de uma inspeção em andamento.', 'error');
      // Restaura o valor do formulário para o valor travado
      omInput.value = omInput.value;
      qtdLoteInput.value = qtdLoteInput.value;
      return;
    }
    data.om = omInput.value; // Garante o valor do campo travado
    data.qtdlote = Number(qtdLoteInput.value); // Garante o valor do campo travado

    try {
    if (editingId) {
      const updateData = { om: data.om, qtdlote: data.qtdlote, serial: data.serial, designador: data.designador, tipodefeito: data.tipodefeito, pn: data.pn, descricao: data.descricao, obs: data.obs };
      await fetchAutenticado(`${API_URL}/${editingId}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const index = registros.findIndex(r => r.id === editingId);
      if (index !== -1) { registros[index] = { ...registros[index], ...updateData }; }
      showToast('Registro atualizado com sucesso!');
      resetForm();
      render();
    } else {
      data.id = uid();
      data.createdat = new Date().toISOString();
      data.status = 'aberto';
      data.operador = user.name || user.username;
      await fetchAutenticado(API_URL, { method: 'POST', body: JSON.stringify(data) });
      showToast('Registro gravado com sucesso!');
      
      // Adiciona o novo registro ao topo do array local e renderiza
      // Isso funciona mesmo se a tabela estiver filtrada por OM,
      // pois o novo registro terá a OM correta.
  if (!Array.isArray(registros)) registros = [];
  // Se for registro DEMO, salva também no localStorage
  if (data.demo) {
    const demoRegs = getDemoRegistros();
    demoRegs.unshift(data);
    setDemoRegistros(demoRegs);
  }
  registros.unshift(data);
  render();
  resetForm();
    }
    } catch (error) {
        showToast(`Erro ao salvar o registro: ${error.message}`, 'error');
    }
  });

  // Listener para o botão LIMPAR (que limpa SÓ os campos de defeito)
  if (btnLimpar) {
    btnLimpar.addEventListener('click', (e) => {
        e.preventDefault(); // Impede o envio do formulário
        resetForm(); // Chama a função que já existe e faz o que você quer
    });
  }

  if (btnExcluir) btnExcluir.addEventListener('click', async () => {
    const idsParaExcluir = selectedIds();
    if (idsParaExcluir.length === 0) return;
    const conf = confirm(`Excluir ${idsParaExcluir.length} registro(s)? Esta ação não pode ser desfeita.`);
    if (!conf) return;
    try {
        await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids: idsParaExcluir }) });
  // Remove dos registros e do localStorage DEMO
  registros = registros.filter(r => !idsParaExcluir.includes(r.id));
  const demoRegs = getDemoRegistros().filter(r => !idsParaExcluir.includes(r.id));
  setDemoRegistros(demoRegs);
  showToast(`${idsParaExcluir.length} registro(s) excluído(s).`);
  render();
    } catch (error) {
        showToast(`Erro ao excluir registros: ${error.message}`, 'error');
    }
  });

  if (btnGerarRequisicao) btnGerarRequisicao.addEventListener('click', async () => {
    const todosIdsSelecionados = selectedIds();
    if (todosIdsSelecionados.length === 0) return;

    const defeitosPermitidos = ['Componente Ausente', 'Componente Danificado', 'Componente Incorreto'];
    const registrosSelecionados = registros.filter(r => todosIdsSelecionados.includes(r.id));
    const registrosValidos = registrosSelecionados.filter(r => defeitosPermitidos.includes(r.tipodefeito));

    if (registrosValidos.length === 0) {
        showToast('Nenhum dos itens selecionados é elegível para requisição (Componente Ausente, Danificado ou Incorreto).', 'info');
        return;
    }

    try {
        setLoading(true);
        const response = await fetchAutenticado(`${API_BASE_URL}/api/requisicoes`, {
            method: 'POST',
            body: JSON.stringify({ registroIds: registrosValidos.map(r => r.id) })
        });
        showToast(`${response.requisicaoIds.length} requisição(ões) gerada(s) com sucesso!`, 'success');
    } catch (error) { showToast(`Erro ao gerar requisição: ${error.message}`, 'error'); } finally { setLoading(false); }
  });

  // if (tbody) tbody.addEventListener('dblclick', (e) => { ... }); // Movido para o IIFE

  if (btnDemo) btnDemo.addEventListener('click', async () => {
    if (!isAdmin) { showToast('Apenas administradores podem lançar dados de demonstração.', 'error'); return; }
    const allDefectTypes = [
        'Curto', 'Solda Fria', 'Excesso de Solda', 'Insuficiência de Solda', 'Tombstone', 'Bilboard', 'Solder Ball',
        'Componente Ausente', 'Componente Danificado', 'Componente Deslocado', 'Componente Incorreto', 'Componente Invertido', 'Polaridade Incorreta'
    ];

    setLoading(true);
    try {
        const demoRecords = [];
        for (let i = 0; i < 15; i++) {
            const demoDate = new Date();
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            demoDate.setDate(demoDate.getDate() - daysAgo);

      demoRecords.push({
        id: uid(),
        om: `DEMO-OM-${Math.floor(Math.random() * 3) + 1}`,
        qtdlote: 150,
        serial: `SN-DEMO-${Date.now() + i}`,
        designador: `C${Math.floor(Math.random() * 500)}`,
        tipodefeito: allDefectTypes[Math.floor(Math.random() * allDefectTypes.length)],
        pn: `200-0${Math.floor(Math.random() * 900) + 100}`,
        descricao: 'Componente de Demonstração',
        createdat: demoDate.toISOString(),
        status: 'aberto',
        operador: user.name || user.username,
        demo: true
      });
        }
        const newRecords = await fetchAutenticado(`${API_URL}/batch`, { method: 'POST', body: JSON.stringify(demoRecords) });
  if (!Array.isArray(registros)) registros = [];
  // Adiciona ao localStorage DEMO
  const demoRegs = getDemoRegistros();
  demoRegs.unshift(...newRecords);
  setDemoRegistros(demoRegs);
  registros.unshift(...newRecords);
  render();
  showToast(`15 novos registros de demonstração foram salvos no banco de dados.`, 'info');
    } catch (error) {
        showToast(`Erro ao criar dados de demonstração: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
  });
  
  if (totalInspec && escopoQualidade) {
    [totalInspec, escopoQualidade].forEach(el => { if(el) el.addEventListener('input', () => updateQuality()); });
  }
  
  // Busca com debounce
  if (busca) {
    busca.addEventListener('input', () => {
      // <<< NOVO: Limpa o filtro de dropdown se o usuário digitar
      if (filtroOM) filtroOM.value = ''; 

      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    });
  }

  // Ordenação por cabeçalho
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.key = key;
        sortState.dir = key === 'createdat' ? 'desc' : 'asc';
      }
      // Atualiza UI dos cabeçalhos
      document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      render();
    });
  });

  // if (tbody) { ... } // Movido para o IIFE
  // if (selAll) { ... } // Movido para o IIFE

  // Removemos as referências aos botões CSV e PDF que não existem no HTML
  // if (btnReqCSV) { ... }
  // if (btnPDF) { ... }
  
  // A chamada final para carregarRegistros() foi movida para dentro do IIFE de autenticação
  // para garantir que 'user' esteja definido e 'restaurarOM' rode depois.
});