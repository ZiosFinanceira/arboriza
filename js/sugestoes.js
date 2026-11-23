// Sugestões de moradores (Agentes do Futuro): local para plantio, árvore que falta no mapa, muda precisando de cuidado.
// Fluxo: agente cadastrado envia → vira OS de vistoria → equipe de campo vai ao local → aprova ou recusa com motivo.
// Contra trote: só envia quem tem cadastro, limite de 5 sugestões por dia, pedidos repetidos no mesmo ponto
// viram "apoio" ao pedido que já existe, e quem avalia vê o histórico de quem sugeriu.
(function () {
  const A = Arbo.app, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.sugestoes';
  const TIPOS = {
    plantio: 'Local para plantar uma árvore',
    arvore_nao_mapeada: 'Árvore que não está no mapa',
    muda_cuidado: 'Muda precisando de cuidado',
    outro: 'Outra sugestão'
  };
  const STATUS = { analise: 'Em análise', aprovada: 'Aprovada', recusada: 'Recusada' };
  const MOTIVOS = ['Calçada estreita para árvore', 'Fiação ou tubulação no local', 'Já existe árvore ou pedido igual', 'Local é área privada', 'Informação insuficiente ou foto ilegível', 'Não confere com o local (possível trote)'];
  const LIMITE_DIA = 5, RAIO_DUPLICADA = 0.02; // km
  let lista = carregar();
  let selecionada = null, novoPonto = null;
  const marcadores = [];

  function carregar() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { /* vazio */ } return Arbo.seedSugestoes(); }
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { /* ignora */ } }
  const dist = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const historico = (email) => { const m = lista.filter((s) => s.autor.email === email); return { total: m.length, aprov: m.filter((s) => s.status === 'aprovada').length, recus: m.filter((s) => s.status === 'recusada').length }; };

  A.sugestao = (id) => lista.find((s) => s.id === id);
  A.sugestoesPendentes = () => lista.filter((s) => s.status === 'analise');

  // ---------- decisão (equipe de campo / coordenação) ----------
  function decidir(s, aprovar, motivo) {
    const ses = Arbo.sessao();
    s.status = aprovar ? 'aprovada' : 'recusada';
    s.motivo = aprovar ? '' : motivo;
    s.avaliador = ses ? ses.nome : '';
    s.decididaEm = new Date().toISOString();
    if (aprovar) {
      if (s.tipo === 'arvore_nao_mapeada' || s.tipo === 'plantio') {
        const planejada = s.tipo === 'plantio';
        A.arvores.push({ id: 'arv-' + Date.now().toString(36), lat: s.lat, lng: s.lng, especie: 'desconhecida', origem: planejada ? 'planejada' : 'nao-cadastrada',
          endereco: s.endereco || '', plantio: null, ultimaIrrigacao: null, ultimaAdubacao: null, sensor: false, saude: 'viva', historico: [],
          obs: `${planejada ? 'Local aprovado para plantio' : 'Árvore incluída'} a partir da sugestão ${s.id} de ${s.autor.nome}.` });
        A.salvar();
      }
      if (s.tipo === 'muda_cuidado') {
        A.criarChamado({ tipo: 'recuperacao', risco: 'baixo', origem: 'municipe', coords: [s.lat, s.lng], endereco: s.endereco, descricao: `Sugestão ${s.id}: ${s.descricao}` });
      }
    }
    salvar();
    Arbo.auditar(aprovar ? 'Aprovou sugestão' : 'Recusou sugestão', `${s.id}${motivo ? ' · ' + motivo : ''}`);
  }

  // Cartão usado na OS de vistoria e na aba Sugestões
  A.cartaoSugestao = (id, podeDecidir) => {
    const s = A.sugestao(id); if (!s) return '';
    const h = historico(s.autor.email);
    return `<div class="cartao sug-cartao" data-sug="${s.id}">
      <h4>${esc(TIPOS[s.tipo])}</h4>
      <p style="margin:0 0 8px;font-size:14px">${esc(s.descricao)}</p>
      <dl class="dl">
        <dt>Enviada por</dt><dd>${esc(s.autor.nome)} · ${esc(s.autor.bairro || '')}</dd>
        <dt>Histórico</dt><dd>${h.aprov} aprovada(s), ${h.recus} recusada(s)</dd>
        <dt>Apoios</dt><dd>${s.apoios || 0} outro(s) morador(es)</dd>
        <dt>Enviada em</dt><dd>${new Date(s.criada).toLocaleDateString('pt-BR')}</dd>
        ${s.foto ? `<dt>Foto</dt><dd>${esc(s.foto)}</dd>` : ''}
      </dl>
      ${s.status === 'analise' ? (podeDecidir ? `
        <div class="acoes"><button class="btn primario" data-decidir="aprovar">Aprovar</button></div>
        <label class="campo" style="margin-top:8px">Ou recuse com um motivo
          <select data-motivo><option value="">Escolha o motivo</option>${MOTIVOS.map((m) => `<option>${esc(m)}</option>`).join('')}</select></label>
        <button class="btn perigo" data-decidir="recusar" style="margin-top:6px">Recusar</button>` : '<p class="ajuda" style="margin-top:8px">Aguardando vistoria da equipe de campo.</p>')
      : `<p class="garantia ${s.status === 'aprovada' ? 'ok' : 'vencida'}">${STATUS[s.status]} por ${esc(s.avaliador || '')}${s.motivo ? ': ' + esc(s.motivo) : ''}</p>`}
    </div>`;
  };
  A.ligarCartaoSugestao = (raiz, depois) => {
    raiz.querySelectorAll('.sug-cartao').forEach((c) => {
      const s = A.sugestao(c.dataset.sug);
      c.querySelectorAll('[data-decidir]').forEach((b) => (b.onclick = () => {
        if (b.dataset.decidir === 'aprovar') decidir(s, true);
        else { const m = c.querySelector('[data-motivo]').value; if (!m) { c.querySelector('[data-motivo]').focus(); A.toast('Escolha o motivo da recusa'); return; } decidir(s, false, m); }
        depois();
      }));
    });
  };

  // ---------- aba Sugestões (avaliação) ----------
  function renderAba() {
    const pend = lista.filter((s) => s.status === 'analise'), feitas = lista.filter((s) => s.status !== 'analise');
    $('#kpis-sug').innerHTML = `
      <div class="kpi ${pend.length ? 'alerta' : ''}"><b>${pend.length}</b><span>em análise</span></div>
      <div class="kpi"><b>${lista.filter((s) => s.status === 'aprovada').length}</b><span>aprovadas</span></div>
      <div class="kpi"><b>${lista.filter((s) => s.status === 'recusada').length}</b><span>recusadas</span></div>
      <div class="kpi"><b>${new Set(lista.map((s) => s.autor.email)).size}</b><span>moradores</span></div>`;
    const item = (s) => `<li class="item ${s.id === selecionada ? 'sel' : ''}" data-sg="${s.id}">
      <span class="bola" style="background:#8e44ad"></span>
      <div class="info"><div class="nome">${esc(TIPOS[s.tipo])}</div><div class="sub">${esc(s.endereco || '')} · ${esc(s.autor.nome)}${s.apoios ? ` · +${s.apoios} apoio(s)` : ''}</div></div>
      <span class="st st-${s.status === 'analise' ? 'pendente' : s.status === 'aprovada' ? 'concluida' : 'recusada'}">${STATUS[s.status]}</span></li>`;
    $('#lista-sug').innerHTML = (pend.map(item).join('') || '<p class="ajuda">Nenhuma sugestão aguardando avaliação.</p>') +
      (feitas.length ? `<h3 class="secao">Já avaliadas</h3>${feitas.slice().reverse().map(item).join('')}` : '');
    $('#lista-sug').querySelectorAll('[data-sg]').forEach((li) => (li.onclick = () => abrir(li.dataset.sg)));
  }
  function abrir(id) {
    const s = A.sugestao(id); selecionada = id;
    A.mapa.setView([s.lat, s.lng], Math.max(A.mapa.getZoom(), 18));
    const d = $('#detalhe'); d.classList.remove('oculto');
    d.innerHTML = `<button class="fechar" id="sg-fechar">×</button><h2>Sugestão</h2><div class="cient">${esc(s.id)} · ${esc(s.endereco || '')}</div>${A.cartaoSugestao(id, Arbo.pode('avaliar_sugestoes'))}`;
    $('#sg-fechar').onclick = () => { selecionada = null; d.classList.add('oculto'); A.atualizar(); };
    A.ligarCartaoSugestao(d, () => { A.atualizar(); abrir(id); });
    A.atualizar();
  }

  // ---------- agente: enviar e acompanhar ----------
  function renderAgente() {
    const ses = Arbo.sessao(); const el = $('#agente-sugestoes'); if (!el || !ses) return;
    const minhas = lista.filter((s) => s.autor.email === ses.email);
    el.innerHTML = `<button class="btn primario" id="btn-sugerir">Sugerir um local no mapa</button>
      <p class="ajuda">Local para plantar, árvore que falta no mapa ou muda precisando de cuidado. A equipe de campo vai até lá avaliar.</p>
      ${minhas.length ? `<ul class="lista">${minhas.slice().reverse().map((s) => `<li class="tarefa"><div class="nome">${esc(TIPOS[s.tipo])} <span class="st st-${s.status === 'analise' ? 'pendente' : s.status === 'aprovada' ? 'concluida' : 'recusada'}">${STATUS[s.status]}</span></div>
        <div class="sub">${esc(s.endereco || '')} · ${fmtData(s.criada.slice(0, 10))}</div>${s.motivo ? `<div class="oque">Motivo: ${esc(s.motivo)}</div>` : ''}</li>`).join('')}</ul>` : ''}`;
    $('#btn-sugerir').onclick = () => {
      const hoje = minhas.filter((s) => new Date(s.criada).toDateString() === new Date().toDateString()).length;
      if (hoje >= LIMITE_DIA) { A.toast(`Limite de ${LIMITE_DIA} sugestões por dia atingido`); return; }
      A.modoClique('Clique no mapa onde fica o local', (latlng) => { novoPonto = latlng; abrirForm(); });
    };
  }
  function abrirForm() {
    const f = $('#form-sugestao'); f.reset();
    $('#sug-aviso').textContent = '';
    const perto = lista.find((s) => s.status === 'analise' && dist(s, novoPonto) < RAIO_DUPLICADA);
    if (perto) $('#sug-aviso').textContent = `Já existe um pedido em análise a poucos metros daqui (${TIPOS[perto.tipo].toLowerCase()}). Se for o mesmo, seu envio vira um apoio a ele.`;
    $('#dlg-sugestao').showModal();
  }
  $('#btn-cancelar-sug').onclick = () => $('#dlg-sugestao').close('cancel');
  $('#dlg-sugestao').addEventListener('close', () => {
    if ($('#dlg-sugestao').returnValue !== 'ok' || !novoPonto) return;
    const f = $('#form-sugestao'), ses = Arbo.sessao();
    const perto = lista.find((s) => s.status === 'analise' && s.tipo === f.tipo.value && dist(s, novoPonto) < RAIO_DUPLICADA);
    if (perto) {
      perto.apoios = (perto.apoios || 0) + 1; salvar();
      Arbo.auditar('Apoiou sugestão existente', perto.id);
      A.toast('Já havia um pedido igual aqui. Seu envio foi somado como apoio.');
    } else {
      const s = { id: 'sg-' + Date.now().toString(36), tipo: f.tipo.value, lat: novoPonto.lat, lng: novoPonto.lng, endereco: f.endereco.value.trim(),
        descricao: f.descricao.value.trim(), foto: f.foto.files[0] ? f.foto.files[0].name : '', autor: { nome: ses.nome, email: ses.email, bairro: ses.bairro || '' },
        criada: new Date().toISOString(), status: 'analise', apoios: 0 };
      lista.push(s);
      const os = A.criarVistoria && A.criarVistoria(s); if (os) s.osId = os.id;
      salvar();
      Arbo.auditar('Enviou sugestão', `${s.id} · ${TIPOS[s.tipo]}`);
      A.toast('Sugestão enviada. A equipe de campo vai avaliar.');
    }
    novoPonto = null; A.atualizar();
  });

  // ---------- mapa ----------
  function desenhar() {
    marcadores.forEach((m) => m.remove()); marcadores.length = 0;
    const aba = A.abaAtiva(), ses = Arbo.sessao();
    let vis = [];
    if (aba === 'sugestoes') vis = lista;
    else if (aba === 'os') vis = lista.filter((s) => s.status === 'analise');
    else if (aba === 'agente' && ses) vis = lista.filter((s) => s.autor.email === ses.email);
    vis.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { zIndexOffset: 1500, icon: L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], html: `<div class="pin-sug ${s.status}">S</div>` }) }).addTo(A.mapa);
      m.bindTooltip(`${TIPOS[s.tipo]} · ${STATUS[s.status]}`);
      if (aba === 'sugestoes') m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); abrir(s.id); });
      marcadores.push(m);
    });
  }

  $('#sel-sug-tipo').innerHTML = Object.entries(TIPOS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  A.renderers.push(() => { if (A.abaAtiva() === 'sugestoes') renderAba(); if (A.abaAtiva() === 'agente') renderAgente(); desenhar(); });
  A.aoRestaurar.push(() => { lista = Arbo.seedSugestoes(); salvar(); });
})();
