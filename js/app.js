// Interface do protótipo: mapa, lista, rota do dia, cadastro e importação.
(function () {
  const { CONFIG, ESPECIES, ORIGENS, engine } = Arbo;
  const HOJE = new Date();
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtData = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
  // data de hoje no fuso do aparelho (toISOString usava UTC: depois das 21h no Brasil já marcava o dia seguinte)
  const hojeISO = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

  const CH = Arbo.chamados;
  let arvores = carregar();
  let chamados = carregarCh();
  let clima = null;
  let selecionada = null;
  let modoMapear = null; // null | 'arvore' | 'chamado'
  let pontoNovo = null;
  const marcadores = new Map();
  const marcadoresCh = new Map();
  let camadaRota = null;

  // ---------- persistência (protótipo: localStorage) ----------
  function carregar() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* sem storage disponível */ }
    return Arbo.seed();
  }
  function carregarCh() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey + '.chamados');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* sem storage */ }
    return CH.seed();
  }
  function salvarCh() {
    try { localStorage.setItem(CONFIG.storageKey + '.chamados', JSON.stringify(chamados)); } catch (e) { /* ignora */ }
  }
  function salvar() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(arvores)); } catch (e) { /* ignora */ }
  }

  // ---------- análise ----------
  function analisar(a) {
    const esp = ESPECIES[a.especie] || ESPECIES.desconhecida;
    return { esp, irr: engine.recomendacaoIrrigacao(a, HOJE, clima), adu: engine.recomendacaoAdubacao(a, HOJE) };
  }

  // ---------- mapa ----------
  const mapa = L.map('mapa', { zoomControl: true }).setView(CONFIG.centro, CONFIG.zoom);
  if (CONFIG.basemap === 'vetor' && window.__RUAS) Arbo.basemapVetor(mapa, window.__RUAS);
  else L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; colaboradores do OpenStreetMap'
  }).addTo(mapa);

  mapa.on('click', (e) => {
    if (!modoMapear) return;
    if (typeof modoMapear === 'function') { const fn = modoMapear; setModoMapear(null); return fn(e.latlng); }
    pontoNovo = e.latlng;
    if (modoMapear === 'chamado') abrirFormChamado({ coords: [e.latlng.lat, e.latlng.lng] });
    else abrirFormulario();
  });

  function desenharMarcadores() {
    marcadores.forEach((m) => m.remove());
    marcadores.clear();
    filtradas().forEach((a) => {
      const { irr, esp } = analisar(a);
      const cor = ORIGENS[a.origem]?.cor || '#555';
      const alerta = irr.acao === 'irrigar';
      const m = L.circleMarker([a.lat, a.lng], {
        radius: a.id === selecionada ? 11 : 8,
        color: alerta ? '#c62828' : !esp.calcada ? '#ef6c00' : '#fff',
        weight: alerta || !esp.calcada ? 3 : 2,
        fillColor: a.saude === 'morta' ? '#6d4c41' : cor, fillOpacity: a.saude === 'morta' ? 0.55 : 0.9,
        dashArray: a.saude === 'morta' ? '3 3' : null
      }).addTo(mapa);
      m.bindTooltip(`${esp.nome} · ${irr.umidade}% umidade`);
      m.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        if (modoMapear === 'chamado') return abrirFormChamado({ arvoreId: a.id });
        selecionar(a.id, false);
      });
      marcadores.set(a.id, m);
    });
  }

  function legenda() {
    $('#legenda').innerHTML =
      '<b>Árvores</b>' +
      Object.values(ORIGENS).map((o) => `<div><i style="background:${o.cor}"></i>${o.nome}</div>`).join('') +
      '<div><i class="anel"></i>Precisa irrigar</div>' +
      '<div><i style="background:#6d4c41;opacity:.6"></i>Muda morta</div>' +
      '<b>Chamados (tempo aberto)</b>' +
      CH.FAIXAS.map((f) => `<div><i class="sq" style="background:${f.cor}"></i>${f.nome}: ${f.desc}${f === CH.FAIXAS[3] ? ' ou Urgente' : ''}</div>`).join('');
  }

  // ---------- painel ----------
  function filtradas() {
    const fo = $('#filtro-origem').value, fa = $('#filtro-acao').value;
    return arvores.filter((a) => {
      if (fo && a.origem !== fo) return false;
      if (!fa) return true;
      const { irr, adu, esp } = analisar(a);
      if (fa === 'irrigar' || fa === 'adiar') return irr.acao === fa;
      if (fa === 'adubar') return adu.acao === 'adubar';
      if (fa === 'inadequada') return !esp.calcada;
      if (fa === 'risco') return ['alto', 'critico'].includes(Arbo.risco.avaliar(a, esp, HOJE).classe);
      if (fa === 'vistoria') { const p = Arbo.risco.proximaVistoria(a, esp, HOJE); return !!(p && p.vencida); }
      return true;
    });
  }

  function kpis() {
    const an = arvores.map(analisar);
    const irrigar = an.filter((x) => x.irr.acao === 'irrigar').length;
    const adubar = an.filter((x) => x.adu.acao === 'adubar').length;
    const naoCad = arvores.filter((a) => a.origem === 'nao-cadastrada').length;
    $('#kpis').innerHTML = `
      <div class="kpi"><b>${arvores.length}</b><span>árvores</span></div>
      <div class="kpi ${irrigar ? 'alerta' : ''}"><b>${irrigar}</b><span>irrigar hoje</span></div>
      <div class="kpi"><b>${adubar}</b><span>adubar</span></div>
      <div class="kpi"><b>${naoCad}</b><span>não cadastr.</span></div>`;
  }

  function lista() {
    const itens = filtradas()
      .map((a) => ({ a, ...analisar(a) }))
      .sort((x, y) => y.irr.prioridade - x.irr.prioridade || (y.adu.acao === 'adubar') - (x.adu.acao === 'adubar'));
    $('#lista').innerHTML = itens.length ? itens.map(({ a, esp, irr, adu }) => `
      <li class="item ${a.id === selecionada ? 'sel' : ''}" data-id="${a.id}">
        <span class="bola" style="background:${ORIGENS[a.origem]?.cor}"></span>
        <div class="info">
          <div class="nome">${esc(esp.nome)}</div>
          <div class="sub">${esc(a.endereco || 'Sem endereço')} · ${irr.umidade}% umidade</div>
        </div>
        ${tagAcao(irr, adu)}
      </li>`).join('') : '<p class="ajuda">Nenhuma árvore com esses filtros.</p>';
  }

  function tagAcao(irr, adu) {
    if (irr.acao === 'irrigar') return `<span class="tag irrigar">${irr.litros} L</span>`;
    if (irr.acao === 'adiar') return '<span class="tag adiar">chuva</span>';
    if (adu.acao === 'adubar') return '<span class="tag adubar">adubar</span>';
    return '<span class="tag ok">ok</span>';
  }

  $('#lista').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li) selecionar(li.dataset.id, true);
  });

  // ---------- rota do dia ----------
  function distKm(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function rota() {
    const pend = arvores.map((a) => ({ a, ...analisar(a) })).filter((x) => x.irr.acao === 'irrigar');
    if (camadaRota) { camadaRota.remove(); camadaRota = null; }
    if (!pend.length) {
      $('#rota-resumo').textContent = 'Nenhuma árvore precisa de água hoje.';
      $('#rota-lista').innerHTML = '';
      return;
    }
    // vizinho mais próximo, começando pela de maior prioridade
    pend.sort((x, y) => y.irr.prioridade - x.irr.prioridade);
    const ordem = [pend.shift()];
    while (pend.length) {
      const ult = ordem[ordem.length - 1].a;
      let melhor = 0;
      pend.forEach((p, i) => { if (distKm(ult, p.a) < distKm(ult, pend[melhor].a)) melhor = i; });
      ordem.push(pend.splice(melhor, 1)[0]);
    }
    let km = 0;
    for (let i = 1; i < ordem.length; i++) km += distKm(ordem[i - 1].a, ordem[i].a);
    const litros = ordem.reduce((s, x) => s + x.irr.litros, 0);
    $('#rota-resumo').innerHTML = `<b>${ordem.length}</b> árvores · <b>${litros} L</b> de água · ~<b>${km.toFixed(2)} km</b> de percurso`;
    $('#rota-lista').innerHTML = ordem.map(({ a, esp, irr }) =>
      `<li class="item" data-id="${a.id}"><div class="info"><div class="nome">${esc(esp.nome)} — ${irr.litros} L</div><div class="sub">${esc(a.endereco || '')} · ${irr.umidade}%</div></div></li>`).join('');
    camadaRota = L.polyline(ordem.map((x) => [x.a.lat, x.a.lng]), { color: '#1565c0', weight: 3, dashArray: '6 6' }).addTo(mapa);
  }
  $('#rota-lista').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li) selecionar(li.dataset.id, true);
  });

  // ---------- detalhe ----------
  function selecionar(id, centralizar) {
    selecionada = id; chSelecionado = null;
    const a = arvores.find((x) => x.id === id);
    if (!a) return fecharDetalhe();
    if (centralizar) mapa.setView([a.lat, a.lng], Math.max(mapa.getZoom(), 17));
    const { esp, irr, adu } = analisar(a);
    const idade = engine.idadeMeses(a, HOJE);
    const corBarra = irr.acao === 'irrigar' ? '#c62828' : irr.acao === 'adiar' ? '#1565c0' : '#2e7d32';
    const d = $('#detalhe');
    d.classList.remove('oculto');
    d.innerHTML = `
      <button class="fechar" id="btn-fechar" title="Fechar">×</button>
      <h2>${esc(esp.nome)}</h2>
      <div class="cient">${esc(esp.cientifico)} · ${esc(a.id)}</div>
      ${!esp.calcada ? `<div class="alerta-esp">Espécie inadequada para calçada. ${esc(esp.obs || '')}</div>` : ''}

      <div class="cartao">
        <h4>Irrigação</h4>
        <div><span class="tag ${irr.acao}">${{ irrigar: 'Irrigar hoje', adiar: 'Adiar — chuva prevista', ok: 'Sem necessidade' }[irr.acao]}</span>
          ${irr.litros ? ` <b>${irr.litros} litros</b>` : ''}</div>
        <div class="medidor"><div class="barra" style="width:${(irr.umidade / 55) * 100}%;background:${corBarra}"></div>
          <div class="limiar" style="left:${(irr.limiar / 55) * 100}%" title="mínimo"></div></div>
        <div class="ajuda">Umidade do solo: <b>${irr.umidade}%</b> ${a.sensor ? '(sensor — simulado)' : '(estimada pelo modelo)'} · mínimo ${irr.limiar}%</div>
        <p class="ajuda">${esc(irr.motivo)}</p>
      </div>

      <div class="cartao">
        <h4>Adubação</h4>
        <div><span class="tag ${adu.acao === 'adubar' ? 'adubar' : 'ok'}">${adu.acao === 'adubar' ? 'Adubar' : 'Em dia'}</span></div>
        <p class="ajuda">${esc(adu.motivo)}</p>
      </div>

      <div class="cartao">
        <h4>Cadastro</h4>
        <dl class="dl">
          <dt>Origem</dt><dd>${esc(ORIGENS[a.origem]?.nome)}</dd>
          <dt>Endereço</dt><dd>${esc(a.endereco || '—')}</dd>
          <dt>Plantio</dt><dd>${fmtData(a.plantio)}${idade !== null ? ` (${idade} meses)` : ''}</dd>
          <dt>Fase</dt><dd>${esc(engine.nomeFase(irr.fase))}</dd>
          <dt>Porte adulto</dt><dd>${esc(esp.porte)}</dd>
          <dt>Últ. irrigação</dt><dd>${fmtData(a.ultimaIrrigacao)}</dd>
          <dt>Últ. adubação</dt><dd>${fmtData(a.ultimaAdubacao)}</dd>
          <dt>Sensor</dt><dd>${a.sensor ? 'Sim' : 'Não'}</dd>
          <dt>Coordenadas</dt><dd>${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}</dd>
        </dl>
        ${a.obs ? `<p class="ajuda">${esc(a.obs)}</p>` : ''}
        ${a.origem === 'nao-cadastrada' ? '<p class="ajuda">Árvore plantada sem registro. Próximo passo: vistoria e regularização (incluir no inventário oficial ou planejar substituição).</p>' : ''}
      </div>

      <div class="cartao">
        <h4>Saúde (vistoria)</h4>
        <select id="sel-saude" data-perm="editar_saude">${Object.entries(Arbo.SAUDE).map(([k, v]) => `<option value="${k}" ${k === (a.saude || 'viva') ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select>
        ${(() => { const ab = engine.abandono(a, HOJE); return ab ? `<p class="alerta-esp" style="margin-top:8px">Muda abandonada: nenhum cuidado registrado há ${ab} dias.</p>` : ''; })()}
        ${a.adotadaPor ? `<p class="ajuda" style="margin-top:6px">Adotada por <b>${esc(a.adotadaPor)}</b> (Agente do Futuro)</p>` : ''}
        ${(a.historico || []).length ? `<p class="ajuda" style="margin-top:6px">Últimos cuidados: ${a.historico.slice(-3).reverse().map((h) => `${fmtData(h.data)} · ${esc(h.tipo)} · ${esc(h.por)}`).join('<br>')}</p>` : ''}
      </div>

      ${Arbo.app.detalhe.map((x) => x.html(a)).join('')}

      ${(() => {
        const abertos = chamados.filter((c) => c.arvoreId === a.id && c.status !== 'concluido');
        return abertos.length ? `<div class="cartao"><h4>Chamados abertos</h4><ul class="lista">${abertos.map(itemChamado).join('')}</ul></div>` : '';
      })()}

      <div class="acoes">
        <button class="btn primario" data-acao="irrigou" data-perm="registrar_cuidado">Registrar rega</button>
        <button class="btn" data-acao="chamado" data-perm="abrir_chamado">Abrir chamado</button>
        <button class="btn" data-acao="adubou" data-perm="registrar_cuidado">Registrar adubação</button>
        ${a.origem === 'nao-cadastrada' || a.origem === 'osm' ? '<button class="btn" data-acao="regularizar" data-perm="regularizar_arvore">Incluir no cadastro oficial</button>' : ''}
        <button class="btn perigo" data-acao="remover" data-perm="excluir_arvore">Remover</button>
      </div>`;
    $('#btn-fechar').onclick = fecharDetalhe;
    d.querySelectorAll('[data-acao]').forEach((b) => (b.onclick = () => acao(a, b.dataset.acao)));
    d.querySelectorAll('.item.ch').forEach((li) => (li.onclick = () => selecionarChamado(li.dataset.ch, true)));
    $('#sel-saude').onchange = (e) => mudarSaude(a, e.target.value);
    Arbo.app.detalhe.forEach((x) => x.bind && x.bind(a, d));
    atualizar(false);
    setTimeout(() => mapa.invalidateSize(), 0);
  }

  function fecharDetalhe() {
    selecionada = null;
    $('#detalhe').classList.add('oculto');
    atualizar(false);
    setTimeout(() => mapa.invalidateSize(), 0);
  }

  function registrar(a, tipo, por) {
    Arbo.auditar(tipo === 'rega' ? 'Registrou rega' : 'Registrou adubação', `${a.id} por ${por}`);
    a.historico = a.historico || [];
    a.historico.push({ data: hojeISO(), tipo, por });
    if (tipo === 'rega') a.ultimaIrrigacao = hojeISO();
    if (tipo === 'adubação') a.ultimaAdubacao = hojeISO();
  }

  function mudarSaude(a, saude) {
    Arbo.auditar('Registrou saúde da muda', `${a.id}: ${Arbo.SAUDE[saude].nome}`);
    a.saude = saude;
    salvar();
    const jaTem = chamados.some((c) => c.arvoreId === a.id && c.tipo === 'substituicao' && c.status !== 'concluido');
    if (saude === 'morta' && !jaTem) {
      const emp = a.empreendimento && Arbo.app.empreendimento ? Arbo.app.empreendimento(a.empreendimento) : null;
      return abrirFormChamado({ arvoreId: a.id, tipo: 'substituicao', risco: 'medio', origem: 'vistoria',
        descricao: 'Muda morta/seca constatada em vistoria. Substituir.' + (emp ? ` Plantio compensatório de ${emp.nome} — verificar responsabilidade de ${emp.responsavel}.` : '') });
    }
    selecionar(a.id, false);
  }

  function acao(a, tipo) {
    const quem = (Arbo.sessao() || {}).nome || 'equipe';
    if (tipo === 'irrigou') registrar(a, 'rega', quem);
    if (tipo === 'adubou') registrar(a, 'adubação', quem);
    if (tipo === 'regularizar') Arbo.auditar('Regularizou árvore', a.id);
    if (tipo === 'regularizar') a.origem = 'autorizada';
    if (tipo === 'chamado') return abrirFormChamado({ arvoreId: a.id });
    if (tipo === 'remover') {
      confirmar('Remover esta árvore do mapa? A ação fica registrada na auditoria.', 'Remover').then((ok) => {
        if (!ok) return;
        arvores = arvores.filter((x) => x.id !== a.id);
        Arbo.auditar('Excluiu árvore', a.id);
        salvar(); fecharDetalhe();
      });
      return;
    }
    salvar();
    selecionar(a.id, false);
  }

  // ---------- cadastro ----------
  function preencherSelects() {
    const opEsp = Object.entries(ESPECIES).map(([k, v]) => `<option value="${k}">${esc(v.nome)}${v.calcada ? '' : ' ⚠️'}</option>`).join('');
    const opOri = Object.entries(ORIGENS).filter(([k]) => k !== 'osm').map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('');
    $('#sel-especie').innerHTML = opEsp;
    $('#sel-origem').innerHTML = opOri;
    $('#filtro-origem').innerHTML = '<option value="">Todas as origens</option>' +
      Object.entries(ORIGENS).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('');
  }

  function setModoMapear(modo) {
    modoMapear = modo || null;
    $('#aviso-mapear').classList.toggle('oculto', !modoMapear);
    $('#aviso-mapear').firstChild.textContent = typeof modoMapear === 'function' ? (modoMapear.msg || 'Clique no mapa') + ' · ' : modoMapear === 'chamado'
      ? 'Clique no local do problema (ou em uma árvore) · ' : 'Clique no mapa onde está a árvore · ';
    mapa.getContainer().style.cursor = modoMapear ? 'crosshair' : '';
  }
  $('#btn-mapear').onclick = () => setModoMapear('arvore');
  $('#btn-chamado').onclick = () => setModoMapear('chamado');
  $('#btn-cancelar-mapear').onclick = () => setModoMapear(null);

  function abrirFormulario() {
    const f = $('#form-arvore');
    f.reset();
    f.plantio.value = hojeISO();
    if (Arbo.app.aoAbrirFormArvore) Arbo.app.aoAbrirFormArvore();
    $('#dlg-arvore').returnValue = ''; $('#dlg-arvore').showModal(); // Esc não reaproveita o último "ok"
  }

  $('#btn-cancelar-form').onclick = () => $('#dlg-arvore').close('cancel');

  $('#dlg-arvore').addEventListener('close', () => {
    setModoMapear(null);
    if ($('#dlg-arvore').returnValue !== 'ok' || !pontoNovo) return;
    const f = $('#form-arvore');
    const nova = {
      id: 'arv-' + Date.now().toString(36),
      lat: pontoNovo.lat, lng: pontoNovo.lng,
      especie: f.especie.value, origem: f.origem.value,
      endereco: f.endereco.value.trim(), plantio: f.plantio.value,
      ultimaIrrigacao: f.plantio.value, ultimaAdubacao: null,
      sensor: f.sensor.checked, obs: f.obs.value.trim(),
      ...(Arbo.app.dadosLocalForm ? Arbo.app.dadosLocalForm() : {})
    };
    arvores.push(nova);
    Arbo.auditar('Mapeou árvore', `${nova.id} · ${(ESPECIES[nova.especie] || ESPECIES.desconhecida).nome}`);
    pontoNovo = null;
    salvar();
    selecionar(nova.id, false);
  });

  // ---------- controle urbano (chamados) ----------
  function localChamado(c) {
    if (c.arvoreId) {
      const a = arvores.find((x) => x.id === c.arvoreId);
      if (a) return { lat: a.lat, lng: a.lng, texto: `${(ESPECIES[a.especie] || ESPECIES.desconhecida).nome} · ${a.endereco || a.id}` };
    }
    if (c.coords) return { lat: c.coords[0], lng: c.coords[1], texto: c.endereco || `${c.coords[0].toFixed(5)}, ${c.coords[1].toFixed(5)}` };
    return null;
  }

  function chamadosFiltrados() {
    const fr = $('#filtro-risco').value, fs = $('#filtro-status').value;
    const agora = new Date();
    return chamados
      .filter((c) => (!fr || c.risco === fr) && (fs === 'ativos' ? c.status !== 'concluido' : c.status === fs))
      .sort((x, y) => {
        // 1º urgentes (segurança), 2º vermelhos (+10 dias), depois risco × tempo
        const g = (c) => (c.risco === 'urgente' ? 2 : 0) + (CH.faixa(c, agora) === CH.FAIXAS[3] ? 1 : 0);
        return g(y) - g(x) || CH.prioridade(y, agora) - CH.prioridade(x, agora);
      });
  }

  function itemChamado(c) {
    const agora = new Date(), f = CH.faixa(c, agora), loc = localChamado(c);
    const critico = c.status !== 'concluido' && f === CH.FAIXAS[3];
    return `<li class="item ch ${critico ? 'critico' : ''} ${c.id === chSelecionado ? 'sel' : ''}" data-ch="${c.id}" style="border-left-color:${f.cor}">
      <div class="info">
        <div class="nome">${esc(CH.TIPOS[c.tipo])} <span class="risco ${c.risco}">${esc(CH.RISCOS[c.risco].nome)}</span></div>
        <div class="sub">${esc(loc ? loc.texto : 'sem local')} · ${esc(CH.STATUS[c.status])}</div>
      </div>
      <span class="tempo" style="color:${f.cor === '#fbc02d' ? '#b28704' : f.cor}">${CH.tempoTexto(c, agora)}</span>
    </li>`;
  }

  let chSelecionado = null;

  function controle() {
    const agora = new Date();
    const ativos = chamados.filter((c) => c.status !== 'concluido');
    const vermelhos = ativos.filter((c) => CH.faixa(c, agora) === CH.FAIXAS[3]).length;
    const urgentes = ativos.filter((c) => c.risco === 'urgente').length;
    const media = ativos.length ? ativos.reduce((s, c) => s + CH.diasAberto(c, agora), 0) / ativos.length : 0;
    $('#kpis-ch').innerHTML = `
      <div class="kpi"><b>${ativos.length}</b><span>abertos</span></div>
      <div class="kpi vermelho"><b>${vermelhos}</b><span>vermelhos</span></div>
      <div class="kpi vermelho"><b>${urgentes}</b><span>urgentes</span></div>
      <div class="kpi"><b>${media.toFixed(1)}d</b><span>tempo médio</span></div>`;
    const badge = $('#badge-vermelhos');
    badge.textContent = vermelhos; badge.classList.toggle('oculto', !vermelhos);

    const lst = chamadosFiltrados();
    $('#lista-ch').innerHTML = lst.length ? lst.map(itemChamado).join('') : '<p class="ajuda">Nenhum chamado com esses filtros.</p>';

    // mapa: todos os ativos aparecem sempre (independe da aba), concluídos só se filtrados
    marcadoresCh.forEach((m) => m.remove());
    marcadoresCh.clear();
    const noMapa = $('#filtro-status').value === 'concluido' ? lst : ativos.filter((c) => !$('#filtro-risco').value || c.risco === $('#filtro-risco').value);
    noMapa.forEach((c) => {
      const loc = localChamado(c);
      if (!loc) return;
      const f = CH.faixa(c, agora);
      const critico = c.status !== 'concluido' && f === CH.FAIXAS[3];
      const tam = c.risco === 'urgente' ? 32 : 26;
      const icon = L.divIcon({
        className: '', iconSize: [tam, tam], iconAnchor: [0, tam],
        html: `<div class="pin-ch ${c.risco} ${critico ? 'critico' : ''}" style="background:${f.cor}"><span>${CH.RISCOS[c.risco].sigla}</span></div>`
      });
      const m = L.marker([loc.lat, loc.lng], { icon, zIndexOffset: critico ? 2000 : CH.RISCOS[c.risco].peso * 100 }).addTo(mapa);
      m.bindTooltip(`${CH.TIPOS[c.tipo]} · ${CH.RISCOS[c.risco].nome} · aberto há ${CH.tempoTexto(c, agora)}`);
      m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); selecionarChamado(c.id, false); });
      marcadoresCh.set(c.id, m);
    });
  }

  $('#lista-ch').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li) selecionarChamado(li.dataset.ch, true);
  });

  function selecionarChamado(id, centralizar) {
    const c = chamados.find((x) => x.id === id);
    if (!c) return;
    chSelecionado = id; selecionada = null;
    const loc = localChamado(c), agora = new Date(), f = CH.faixa(c, agora);
    if (centralizar && loc) mapa.setView([loc.lat, loc.lng], Math.max(mapa.getZoom(), 17));
    const d = $('#detalhe');
    d.classList.remove('oculto');
    d.innerHTML = `
      <button class="fechar" id="btn-fechar" title="Fechar">×</button>
      <h2>${esc(CH.TIPOS[c.tipo])}</h2>
      <div class="cient">${esc(c.id)} · ${esc(CH.ORIGENS_CHAMADO[c.origem] || c.origem)}</div>
      <div class="cartao" style="border-color:${f.cor};border-width:2px">
        <h4>${c.status === 'concluido' ? 'Tempo até concluir' : 'Aberto há'}</h4>
        <div class="cronometro" style="color:${f.cor === '#fbc02d' ? '#b28704' : f.cor}" id="cronometro">${CH.tempoTexto(c, agora)}</div>
        <div><span class="risco ${c.risco}">${esc(CH.RISCOS[c.risco].nome)}</span> · faixa <b>${f.nome}</b> · ${esc(CH.STATUS[c.status])}</div>
      </div>
      <div class="cartao">
        <h4>Descrição</h4>
        <p style="margin:0;font-size:14px">${esc(c.descricao)}</p>
      </div>
      <div class="cartao">
        <h4>Local</h4>
        <p style="margin:0;font-size:14px">${esc(loc ? loc.texto : 'sem local')}</p>
        ${c.arvoreId ? `<button class="btn" id="btn-ver-arvore" style="margin-top:8px">Ver ficha da árvore</button>` : ''}
        <dl class="dl" style="margin-top:8px">
          <dt>Aberto em</dt><dd>${new Date(c.abertura).toLocaleString('pt-BR')}</dd>
          ${c.conclusao ? `<dt>Concluído em</dt><dd>${new Date(c.conclusao).toLocaleString('pt-BR')}</dd>` : ''}
        </dl>
      </div>
      <label class="ajuda">Alterar risco
        <select id="ch-risco" data-perm="alterar_risco">${Object.entries(CH.RISCOS).map(([k, v]) => `<option value="${k}" ${k === c.risco ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
      </label>
      <div class="acoes">
        ${c.status === 'aberto' ? '<button class="btn primario" data-ch-acao="atendimento" data-perm="atender_chamado">Iniciar atendimento</button>' : ''}
        ${c.status !== 'concluido' ? '<button class="btn primario" data-ch-acao="concluir" data-perm="atender_chamado">Concluir</button>' : '<button class="btn" data-ch-acao="reabrir" data-perm="atender_chamado">Reabrir</button>'}
      </div>`;
    $('#btn-fechar').onclick = () => { chSelecionado = null; fecharDetalhe(); };
    if (c.arvoreId) $('#btn-ver-arvore').onclick = () => { chSelecionado = null; selecionar(c.arvoreId, true); };
    $('#ch-risco').onchange = (e) => { Arbo.auditar('Alterou risco', `${c.id}: ${CH.RISCOS[c.risco].nome} → ${CH.RISCOS[e.target.value].nome}`); c.risco = e.target.value; salvarCh(); selecionarChamado(c.id, false); };
    d.querySelectorAll('[data-ch-acao]').forEach((b) => (b.onclick = () => {
      const t = b.dataset.chAcao;
      if (t === 'atendimento') c.status = 'atendimento';
      if (t === 'concluir') { c.status = 'concluido'; c.conclusao = new Date().toISOString(); }
      if (t === 'reabrir') { c.status = 'aberto'; c.conclusao = null; }
      Arbo.auditar({ atendimento: 'Iniciou atendimento', concluir: 'Concluiu chamado', reabrir: 'Reabriu chamado' }[t], c.id);
      salvarCh(); selecionarChamado(c.id, false);
    }));
    atualizar();
    setTimeout(() => mapa.invalidateSize(), 0);
  }

  let novoChamado = null;
  function abrirFormChamado(alvo) {
    alvo = { ...(Arbo.app.presetChamado || {}), ...alvo };
    Arbo.app.presetChamado = null;
    novoChamado = alvo;
    const f = $('#form-chamado');
    f.reset();
    let txt = 'Local selecionado no mapa.';
    if (alvo.arvoreId) {
      const a = arvores.find((x) => x.id === alvo.arvoreId);
      txt = `Árvore: ${(ESPECIES[a.especie] || ESPECIES.desconhecida).nome} · ${a.endereco || a.id}`;
    }
    $('#ch-local').textContent = txt;
    ['tipo', 'risco', 'origem', 'descricao'].forEach((k) => { if (alvo[k]) f[k].value = alvo[k]; });
    $('#dlg-chamado').returnValue = ''; $('#dlg-chamado').showModal(); // Esc não reaproveita o último "ok"
  }
  $('#btn-cancelar-ch').onclick = () => $('#dlg-chamado').close('cancel');
  $('#dlg-chamado').addEventListener('close', () => {
    setModoMapear(null);
    if ($('#dlg-chamado').returnValue !== 'ok' || !novoChamado) return;
    const f = $('#form-chamado');
    const c = criarChamado({ arvoreId: novoChamado.arvoreId || null, coords: novoChamado.coords || null,
      tipo: f.tipo.value, risco: f.risco.value, origem: f.origem.value, descricao: f.descricao.value.trim() });
    novoChamado = null;
    if (Arbo.pode('ver_chamados')) selecionarChamado(c.id, false);
    else { toast('Chamado enviado. A prefeitura vai avaliar.'); atualizar(); }
  });

  function criarChamado(dados) {
    const c = { id: 'ch-' + Date.now().toString(36), arvoreId: null, coords: null, endereco: '', ...dados,
      abertura: new Date().toISOString(), status: 'aberto', conclusao: null };
    chamados.push(c);
    salvarCh();
    Arbo.auditar('Abriu chamado', `${c.id} · ${CH.TIPOS[c.tipo]} · ${CH.RISCOS[c.risco].nome}`);
    Arbo.app.aoCriarChamado.forEach((fn) => fn(c));
    return c;
  }

  function preencherSelectsCh() {
    const op = (obj) => Object.entries(obj).map(([k, v]) => `<option value="${k}">${esc(v.nome || v)}</option>`).join('');
    $('#sel-tipo').innerHTML = op(CH.TIPOS);
    $('#sel-risco').innerHTML = op(CH.RISCOS);
    $('#sel-origem-ch').innerHTML = op(CH.ORIGENS_CHAMADO);
    $('#filtro-risco').innerHTML = '<option value="">Todos os riscos</option>' + op(CH.RISCOS);
  }

  // cronômetro: a cada 30 s recalcula cores e tempos (sem limite de fim)
  setInterval(() => {
    controle();
    if (chSelecionado) {
      const c = chamados.find((x) => x.id === chSelecionado);
      const el = $('#cronometro');
      if (c && el) el.textContent = CH.tempoTexto(c, new Date());
    }
  }, 30000);

  $('#btn-csv-ch').onclick = () => {
    const agora = new Date();
    const linhas = [['id', 'tipo', 'risco', 'status', 'origem', 'abertura', 'conclusao', 'dias_aberto', 'faixa', 'lat', 'lng', 'arvore', 'descricao']];
    chamados.forEach((c) => {
      const loc = localChamado(c) || {};
      linhas.push([c.id, CH.TIPOS[c.tipo], CH.RISCOS[c.risco].nome, CH.STATUS[c.status], CH.ORIGENS_CHAMADO[c.origem] || c.origem,
        c.abertura, c.conclusao || '', CH.diasAberto(c, agora).toFixed(1), CH.faixa(c, agora).nome, loc.lat ?? '', loc.lng ?? '', c.arvoreId || '', c.descricao]);
    });
    const cel = Arbo.csvCelula || ((v) => `"${String(v).replace(/"/g, '""')}"`); // js/csv.js neutraliza fórmulas
    const csv = linhas.map((l) => l.map(cel).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `chamados-${hojeISO()}.csv` });
    link.click(); URL.revokeObjectURL(url);
  };

  // ---------- dados: OSM, exportar, importar ----------
  $('#btn-osm').onclick = async () => {
    if (mapa.getZoom() < 16) return toast('Aproxime mais o mapa (zoom 16 ou mais) para importar.');
    const b = mapa.getBounds();
    const q = `[out:json][timeout:25];node["natural"="tree"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});out 300;`;
    const btn = $('#btn-osm');
    btn.disabled = true; btn.textContent = 'Buscando…';
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      const j = await r.json();
      const existentes = new Set(arvores.map((a) => a.osmId).filter(Boolean));
      let n = 0;
      j.elements.forEach((el) => {
        if (existentes.has(el.id)) return;
        const t = el.tags || {};
        arvores.push({
          id: 'osm-' + el.id, osmId: el.id, lat: el.lat, lng: el.lon,
          especie: 'desconhecida', origem: 'osm',
          endereco: t['addr:street'] || '', plantio: null,
          ultimaIrrigacao: null, ultimaAdubacao: null, sensor: false,
          obs: [t.species, t['species:pt'], t.genus].filter(Boolean).join(' · ')
        });
        n++;
      });
      salvar(); atualizar(true);
      toast(n ? `${n} árvores importadas do OpenStreetMap.` : 'Nenhuma árvore nova encontrada nesta área do OSM.');
    } catch (e) {
      toast('Não foi possível consultar o OpenStreetMap agora. Tente de novo em instantes.');
    } finally {
      btn.disabled = false; btn.textContent = 'Importar árvores do OpenStreetMap (área visível)';
    }
  };

  $('#btn-exportar').onclick = () => {
    const geo = {
      type: 'FeatureCollection',
      features: arvores.map(({ lat, lng, ...props }) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props }))
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `arvores-${hojeISO()}.geojson` });
    link.click(); URL.revokeObjectURL(url);
  };

  $('#inp-importar').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const geo = JSON.parse(await file.text());
      const novas = geo.features.filter((f) => f.geometry?.type === 'Point').map((f, i) => ({
        id: f.properties?.id || 'imp-' + Date.now().toString(36) + i,
        especie: 'desconhecida', origem: 'nao-cadastrada', plantio: null, ultimaIrrigacao: null, ultimaAdubacao: null, sensor: false,
        ...f.properties,
        lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0]
      }));
      const ids = new Set(novas.map((n) => n.id));
      arvores = arvores.filter((a) => !ids.has(a.id)).concat(novas);
      salvar(); atualizar(true);
      toast(`${novas.length} árvores importadas.`);
    } catch (err) {
      toast('Arquivo GeoJSON inválido.');
    }
    e.target.value = '';
  };

  $('#btn-reset').onclick = () => confirmar('Apagar os dados deste navegador e voltar aos exemplos?', 'Restaurar').then((ok) => {
    if (!ok) return;
    arvores = Arbo.seed(); chamados = CH.seed(); salvar(); salvarCh();
    Arbo.app.aoRestaurar.forEach((f) => f());
    Arbo.auditar('Restaurou dados de exemplo');
    fecharDetalhe(); mapa.setView(CONFIG.centro, CONFIG.zoom);
  });

  // Confirmação dentro da página (alert/confirm do navegador são bloqueados em alguns ambientes)
  function confirmar(msg, rotulo) {
    return new Promise((ok) => {
      const d = $('#dlg-confirmar');
      $('#confirmar-texto').textContent = msg;
      $('#btn-confirmar-sim').textContent = rotulo || 'Confirmar';
      d.onclose = () => ok(d.returnValue === 'sim');
      d.returnValue = ''; d.showModal();
    });
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // ---------- clima (Open-Meteo, gratuito e sem chave) ----------
  async function carregarClima() {
    const [lat, lng] = CONFIG.centro;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max&past_days=3&forecast_days=3&timezone=America%2FSao_Paulo`;
    try {
      const j = await (await fetch(url)).json();
      const p = j.daily.precipitation_sum, t = j.daily.temperature_2m_max;
      // índices: 0..2 = 3 dias passados, 3 = hoje, 4..5 = próximos
      clima = {
        chuvaPassada3d: p.slice(0, 3).reduce((s, v) => s + (v || 0), 0),
        chuvaPrevista48h: p.slice(3, 5).reduce((s, v) => s + (v || 0), 0),
        tmax: t[3]
      };
      $('#clima').innerHTML = `Hoje: máx. ${clima.tmax.toFixed(0)}°C · chuva últimos 3 dias: ${clima.chuvaPassada3d.toFixed(0)} mm · prevista 48h: ${clima.chuvaPrevista48h.toFixed(0)} mm`;
    } catch (e) {
      clima = null;
      $('#clima').textContent = 'Clima indisponível — usando valores padrão';
    }
    atualizar(true);
  }

  // ---------- abas ----------
  document.querySelectorAll('.aba').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
    document.querySelectorAll('.aba').forEach((x) => $('#aba-' + x.dataset.aba).classList.toggle('oculto', x !== b));
    if (b.dataset.aba !== 'rota' && camadaRota) { camadaRota.remove(); camadaRota = null; }
    if (b.dataset.aba === 'rota') rota();
    atualizar();
  }));
  $('#filtro-origem').onchange = $('#filtro-acao').onchange = () => atualizar(true);
  $('#filtro-risco').onchange = $('#filtro-status').onchange = () => atualizar(true);

  function atualizar() {
    kpis(); lista(); desenharMarcadores();
    controle();
    if (!$('#aba-rota').classList.contains('oculto')) rota();
    Arbo.app.renderers.forEach((f) => f());
  }

  // API interna usada pelos módulos (obras, agente, sugestões, OS, gastos, acessos, acesso)
  Arbo.app = {
    get arvores() { return arvores; }, get chamados() { return chamados; }, get hoje() { return HOJE; },
    mapa, analisar, salvar, salvarCh, selecionar, selecionarChamado, atualizar, registrar, abrirFormChamado, setModoMapear,
    esc, fmtData, hojeISO, abaAtiva: () => document.querySelector('.aba.ativa').dataset.aba,
    renderers: [], detalhe: [], aoRestaurar: [], aoCriarChamado: [], aoIniciar: [],
    criarChamado, localChamado, fecharDetalhe, toast, confirmar, filtradas, modoMapear: () => modoMapear,
    modoClique: (msg, fn) => { fn.msg = msg; setModoMapear(fn); }
  };

  // ---------- início ----------
  $('#cidade').textContent = CONFIG.cidade;
  preencherSelects();
  preencherSelectsCh();
  legenda();
  atualizar();
  carregarClima();
})();
