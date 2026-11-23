// Ordens de serviço (OS) e equipes de campo.
// Cada chamado vira uma OS para a equipe certa; a rega do dia vira uma OS com paradas; cada sugestão de morador
// vira uma OS de vistoria. A equipe só conclui a OS depois de cumprir o checklist obrigatório.
(function () {
  const A = Arbo.app, CH = Arbo.chamados, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.os';

  Arbo.EQUIPES = [
    { id: 'eq-01', nome: 'Equipe Verde 01', funcao: 'Rega, plantio e cuidado de mudas', veiculo: 'Caminhão-pipa 8.000 L', tablet: 'TAB-014', cor: '#2f8a45',
      membros: [{ nome: 'Carlos Lima', mat: '10231' }, { nome: 'Joana Alves', mat: '10457' }] },
    { id: 'eq-02', nome: 'Equipe Manejo 02', funcao: 'Poda, corte e remoção', veiculo: 'Caminhão com cesto aéreo', tablet: 'TAB-021', cor: '#7b2d8b',
      membros: [{ nome: 'Rafael Souza', mat: '10388' }, { nome: 'Bruno Melo', mat: '10512' }, { nome: 'Marta Dias', mat: '10620' }] },
    { id: 'eq-03', nome: 'Equipe Vistoria 03', funcao: 'Vistoria e avaliação de sugestões', veiculo: 'Moto', tablet: 'TAB-030', cor: '#1f6fd1',
      membros: [{ nome: 'Paula Nunes', mat: '10744' }] }
  ];
  const equipe = (id) => Arbo.EQUIPES.find((e) => e.id === id);

  const MANEJO = ['risco-queda', 'poda', 'corte', 'remocao', 'raiz-calcada', 'fiacao'];
  const equipePara = (tipo) => (MANEJO.includes(tipo) ? 'eq-02' : tipo === 'outro' ? 'eq-03' : 'eq-01');

  // Obrigações de cada tipo de serviço (o "procedimento padrão" que a equipe precisa cumprir)
  const CHECK = {
    rega: ['Conferir se a terra está seca antes de regar', 'Regar o volume indicado em cada parada', 'Registrar foto de pelo menos uma muda'],
    manejo: ['Sinalizar e isolar a área', 'Usar EPI completo (capacete, luvas, óculos)', 'Confirmar com a distribuidora se houver rede elétrica', 'Executar o serviço', 'Recolher os resíduos', 'Registrar foto de antes e depois'],
    cuidado: ['Avaliar o estado da muda', 'Tratar, replantar ou substituir', 'Conferir tutor e protetor', 'Regar após o serviço', 'Registrar foto'],
    vistoria: ['Ir até o local indicado', 'Conferir largura da calçada, fiação e tubulação', 'Verificar se já existe árvore ou pedido igual', 'Registrar foto do local']
  };
  const MIN_SERVICO = { rega: 8, manejo: 60, cuidado: 30, vistoria: 15 }; // minutos por parada
  const STATUS = { pendente: 'Pendente', deslocamento: 'Em deslocamento', execucao: 'Em execução', concluida: 'Concluída' };
  const grupo = (os) => (os.tipo === 'rega' ? 'rega' : os.tipo === 'vistoria' ? 'vistoria' : MANEJO.includes((chamado(os) || {}).tipo) ? 'manejo' : 'cuidado');

  let lista = carregar();
  let seq = (lista || []).reduce((m, o) => Math.max(m, +o.id.slice(3)), 0);
  let selecionada = null, filtroEquipe = '', mostrarRota = true;
  const camada = [];

  function carregar() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { /* vazio */ } return null; }
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { /* ignora */ } }
  const chamado = (os) => os.tipo === 'chamado' ? A.chamados.find((c) => c.id === os.ref) : null;

  function nova(dados) {
    const os = { id: 'OS-' + String(++seq).padStart(4, '0'), status: 'pendente', criada: new Date().toISOString(), inicio: null, chegada: null, fim: null, check: [], obs: '', foto: '', ...dados };
    os.check = CHECK[grupo(os)].map(() => false);
    lista.push(os); salvar();
    return os;
  }
  function prioridade(os) {
    if (os.tipo === 'chamado') { const c = chamado(os); return c ? (c.risco === 'urgente' ? 1000 : 0) + CH.prioridade(c, new Date()) : 0; }
    return os.tipo === 'rega' ? 35 : 15;
  }
  function local(os) {
    if (os.tipo === 'chamado') { const c = chamado(os); const l = c && A.localChamado(c); return l ? [l.lat, l.lng, l.texto] : null; }
    if (os.tipo === 'vistoria') { const s = A.sugestao && A.sugestao(os.ref); return s ? [s.lat, s.lng, s.endereco || 'Local sugerido'] : null; }
    const a = A.arvores.find((x) => x.id === (os.paradas || [])[0]); return a ? [a.lat, a.lng, `${os.paradas.length} paradas`] : null;
  }
  function titulo(os) {
    if (os.tipo === 'chamado') { const c = chamado(os); return c ? CH.TIPOS[c.tipo] : 'Chamado'; }
    return os.tipo === 'rega' ? 'Rota de rega' : 'Vistoria de sugestão';
  }

  // Primeira carga: gera OS para chamados abertos, rega do dia e sugestões em análise
  function semear() {
    lista = []; seq = 0;
    A.chamados.filter((c) => c.status !== 'concluido').forEach((c) => {
      const os = nova({ tipo: 'chamado', ref: c.id, equipe: equipePara(c.tipo) });
      if (c.status === 'atendimento') { os.status = 'execucao'; os.inicio = os.chegada = c.abertura; }
    });
    gerarRega();
    (A.sugestoesPendentes ? A.sugestoesPendentes() : []).forEach((s) => { const os = nova({ tipo: 'vistoria', ref: s.id, equipe: 'eq-03' }); s.osId = os.id; });
    salvar();
  }
  function gerarRega() {
    const ja = lista.find((o) => o.tipo === 'rega' && o.status !== 'concluida');
    const paradas = A.arvores.filter((a) => A.analisar(a).irr.acao === 'irrigar').map((a) => a.id);
    if (ja) { ja.paradas = paradas; ja.regadas = (ja.regadas || []).filter((id) => paradas.includes(id)); }
    else if (paradas.length) nova({ tipo: 'rega', paradas, regadas: [], equipe: 'eq-01' });
  }

  // Mantém OS e chamados coerentes (ex.: chamado concluído pela coordenação fecha a OS)
  function sincronizar() {
    lista.forEach((os) => {
      const c = chamado(os);
      if (c && c.status === 'concluido' && os.status !== 'concluida') { os.status = 'concluida'; os.fim = c.conclusao; }
      if (os.tipo === 'vistoria') { const s = A.sugestao && A.sugestao(os.ref); if (s && ['aprovada', 'recusada'].includes(s.status) && os.status === 'pendente') { os.status = 'concluida'; os.fim = s.decididaEm || new Date().toISOString(); } }
    });
    salvar();
  }

  // ---------- rota inteligente ----------
  const dist = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  // Urgentes primeiro; depois vizinho mais próximo, ponderado pela prioridade de cada parada
  function rotaDaEquipe(eqId) {
    const paradas = [];
    lista.filter((o) => o.equipe === eqId && o.status !== 'concluida').forEach((os) => {
      if (os.tipo === 'rega') (os.paradas || []).filter((id) => !(os.regadas || []).includes(id)).forEach((id) => {
        const a = A.arvores.find((x) => x.id === id); if (a) paradas.push({ os, pos: [a.lat, a.lng], nome: (Arbo.ESPECIES[a.especie] || {}).nome, arv: a.id, prio: 35, min: MIN_SERVICO.rega });
      });
      else { const l = local(os); if (l) paradas.push({ os, pos: [l[0], l[1]], nome: titulo(os), prio: prioridade(os), min: MIN_SERVICO[grupo(os)] }); }
    });
    const base = Arbo.CONFIG.baseEquipes;
    const urg = paradas.filter((p) => p.prio >= 1000).sort((a, b) => b.prio - a.prio);
    let resto = paradas.filter((p) => p.prio < 1000), atual = urg.length ? urg[urg.length - 1].pos : base;
    const ordem = [...urg];
    while (resto.length) {
      let mi = 0, mv = Infinity;
      resto.forEach((p, i) => { const v = dist(atual, p.pos) / (1 + p.prio / 60); if (v < mv) { mv = v; mi = i; } });
      const p = resto.splice(mi, 1)[0]; ordem.push(p); atual = p.pos;
    }
    let km = 0, prev = base; ordem.forEach((p) => { km += dist(prev, p.pos); prev = p.pos; });
    const minutos = Math.round((km / 18) * 60 + ordem.reduce((s, p) => s + p.min, 0));
    return { ordem, km, minutos };
  }

  function desenharRota() {
    camada.forEach((l) => l.remove()); camada.length = 0;
    const aba = A.abaAtiva();
    if (aba !== 'os' || !mostrarRota) return;
    const ses = Arbo.sessao();
    const ids = ses && ses.equipe ? [ses.equipe] : Arbo.EQUIPES.filter((e) => !filtroEquipe || e.id === filtroEquipe).map((e) => e.id);
    ids.forEach((id) => {
      const eq = equipe(id), r = rotaDaEquipe(id);
      if (!r.ordem.length) return;
      const pts = [Arbo.CONFIG.baseEquipes, ...r.ordem.map((p) => p.pos)];
      camada.push(L.polyline(pts, { color: eq.cor, weight: 4, opacity: 0.8, dashArray: '8 6' }).addTo(A.mapa));
      r.ordem.forEach((p, i) => camada.push(L.marker(p.pos, { zIndexOffset: 3000, icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: `<div class="pin-rota" style="background:${eq.cor}">${i + 1}</div>` }) }).addTo(A.mapa)));
    });
    camada.push(L.marker(Arbo.CONFIG.baseEquipes, { zIndexOffset: 3000, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: '<div class="pin-base" title="Base das equipes">B</div>' }) }).addTo(A.mapa));
  }

  // ---------- painel ----------
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`);
  const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
  const hoje = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();

  function itemOS(os, n) {
    const l = local(os), eq = equipe(os.equipe), urg = prioridade(os) >= 1000;
    return `<li class="item os ${os.id === selecionada ? 'sel' : ''}" data-os="${os.id}">
      ${n ? `<span class="ordem" style="background:${eq.cor}">${n}</span>` : ''}
      <div class="info">
        <div class="nome">${esc(titulo(os))} ${urg ? '<span class="risco urgente">Urgente</span>' : ''}</div>
        <div class="sub">${esc(os.id)} · ${esc(l ? l[2] : 'sem local')}${n ? '' : ' · ' + esc(eq.nome)}</div>
      </div>
      <span class="st st-${os.status}">${STATUS[os.status]}</span>
    </li>`;
  }

  function render() {
    sincronizar();
    const ses = Arbo.sessao();
    const minha = Arbo.pode('minhas_os') && ses && ses.equipe;
    const cab = $('#os-cabecalho'), corpo = $('#os-corpo');
    if (minha) {
      const eq = equipe(ses.equipe), r = rotaDaEquipe(eq.id);
      const minhas = lista.filter((o) => o.equipe === eq.id);
      const abertas = minhas.filter((o) => o.status !== 'concluida');
      const concl = minhas.filter((o) => o.status === 'concluida' && hoje(o.fim)).length;
      cab.innerHTML = `
        <header class="sec-head"><h2>Minhas ordens de serviço</h2><p>${esc(eq.nome)} · ${esc(eq.funcao)}</p></header>
        <div class="cartao-equipe" style="--cor:${eq.cor}">
          <div><b>${esc(ses.nome)}</b> · matrícula ${esc(ses.matricula || '')}</div>
          <div class="ajuda">Tablet ${esc(eq.tablet)} · ${esc(eq.veiculo)} · equipe: ${eq.membros.map((m) => esc(m.nome.split(' ')[0])).join(', ')}</div>
          <div class="jornada">${ses.jornada ? `Jornada iniciada às ${hora(ses.jornada)}` : 'Jornada não iniciada'}
            <button class="btn ${ses.jornada ? '' : 'primario'}" id="btn-jornada">${ses.jornada ? 'Encerrar jornada' : 'Iniciar jornada'}</button></div>
        </div>
        <div class="kpis">
          <div class="kpi ${abertas.some((o) => prioridade(o) >= 1000) ? 'vermelho' : ''}"><b>${abertas.length}</b><span>abertas</span></div>
          <div class="kpi"><b>${concl}</b><span>concluídas hoje</span></div>
          <div class="kpi"><b>${r.km.toFixed(1)}</b><span>km de rota</span></div>
          <div class="kpi"><b>${fmtMin(r.minutos)}</b><span>tempo estimado</span></div>
        </div>
        <label class="check-linha"><input type="checkbox" id="chk-rota" ${mostrarRota ? 'checked' : ''}> Mostrar rota do dia no mapa</label>`;
      const ordemOS = []; r.ordem.forEach((p) => { if (!ordemOS.includes(p.os)) ordemOS.push(p.os); });
      corpo.innerHTML = `<h3 class="secao">Ordem de atendimento</h3>
        <ul class="lista">${ordemOS.map((o, i) => itemOS(o, i + 1)).join('') || '<p class="ajuda">Nenhuma OS aberta para a sua equipe.</p>'}</ul>
        ${minhas.some((o) => o.status === 'concluida') ? `<details class="regras"><summary>Concluídas (${minhas.filter((o) => o.status === 'concluida').length})</summary><ul class="lista" style="margin-top:8px">${minhas.filter((o) => o.status === 'concluida').slice(-8).reverse().map((o) => itemOS(o)).join('')}</ul></details>` : ''}`;
      $('#btn-jornada').onclick = () => {
        ses.jornada = ses.jornada ? null : new Date().toISOString();
        Arbo.auditar(ses.jornada ? 'Iniciou jornada' : 'Encerrou jornada', eq.nome);
        A.salvarSessao && A.salvarSessao(ses); render();
      };
    } else {
      const abertas = lista.filter((o) => o.status !== 'concluida');
      cab.innerHTML = `
        <header class="sec-head"><h2>Equipes e ordens de serviço</h2><p>Chamados, rega e vistorias distribuídos entre as equipes de campo. Cada equipe vê só as próprias OS no tablet.</p></header>
        <div class="kpis">
          <div class="kpi"><b>${abertas.length}</b><span>OS abertas</span></div>
          <div class="kpi"><b>${abertas.filter((o) => o.status === 'execucao' || o.status === 'deslocamento').length}</b><span>em andamento</span></div>
          <div class="kpi"><b>${lista.filter((o) => o.status === 'concluida' && hoje(o.fim)).length}</b><span>concluídas hoje</span></div>
          <div class="kpi vermelho"><b>${abertas.filter((o) => prioridade(o) >= 1000).length}</b><span>urgentes</span></div>
        </div>
        <div class="equipes">${Arbo.EQUIPES.map((e) => { const r = rotaDaEquipe(e.id), ab = abertas.filter((o) => o.equipe === e.id).length;
          return `<button class="equipe-card ${filtroEquipe === e.id ? 'sel' : ''}" data-eq="${e.id}" style="--cor:${e.cor}">
            <b>${esc(e.nome)}</b><span>${esc(e.funcao)}</span>
            <span>${ab} OS abertas · ${r.km.toFixed(1)} km · ${fmtMin(r.minutos)}</span>
            <span class="ajuda">${e.membros.length} pessoas · ${esc(e.tablet)}</span></button>`; }).join('')}</div>
        <p class="ajuda">Nomes e matrículas são exemplos. Clique numa equipe para ver só a rota dela.</p>`;
      corpo.innerHTML = `<h3 class="secao">${filtroEquipe ? esc(equipe(filtroEquipe).nome) : 'Todas as OS abertas'}</h3>
        <ul class="lista">${abertas.filter((o) => !filtroEquipe || o.equipe === filtroEquipe).sort((a, b) => prioridade(b) - prioridade(a)).map((o) => itemOS(o)).join('') || '<p class="ajuda">Nenhuma OS aberta.</p>'}</ul>`;
      cab.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => { filtroEquipe = filtroEquipe === b.dataset.eq ? '' : b.dataset.eq; render(); }));
    }
    const chk = $('#chk-rota'); if (chk) chk.onchange = () => { mostrarRota = chk.checked; desenharRota(); };
    corpo.querySelectorAll('[data-os]').forEach((li) => (li.onclick = () => abrir(li.dataset.os)));
    desenharRota();
  }

  // ---------- detalhe da OS ----------
  function abrir(id) {
    const os = lista.find((o) => o.id === id); if (!os) return;
    selecionada = id;
    const eq = equipe(os.equipe), l = local(os), g = grupo(os), c = chamado(os);
    const minha = Arbo.pode('minhas_os') && Arbo.sessao().equipe === os.equipe;
    const podeMarcar = minha && os.status === 'execucao';
    const pendRega = os.tipo === 'rega' ? (os.paradas || []).filter((x) => !(os.regadas || []).includes(x)) : [];
    const checkOk = os.check.every(Boolean) && pendRega.length === 0 && (g !== 'vistoria' || ['aprovada', 'recusada'].includes((A.sugestao(os.ref) || {}).status));
    if (l) A.mapa.setView([l[0], l[1]], Math.max(A.mapa.getZoom(), 17));
    const d = $('#detalhe');
    d.classList.remove('oculto');
    d.innerHTML = `
      <button class="fechar" id="os-fechar" title="Fechar">×</button>
      <h2>${esc(titulo(os))}</h2>
      <div class="cient">${esc(os.id)} · ${esc(eq.nome)}</div>
      <div class="cartao">
        <div><span class="st st-${os.status}">${STATUS[os.status]}</span> ${prioridade(os) >= 1000 ? '<span class="risco urgente">Urgente</span>' : ''}</div>
        <dl class="dl" style="margin-top:10px">
          <dt>Local</dt><dd>${esc(l ? l[2] : '—')}</dd>
          <dt>Criada</dt><dd>${new Date(os.criada).toLocaleString('pt-BR')}</dd>
          <dt>Saída</dt><dd>${hora(os.inicio)}</dd><dt>Chegada</dt><dd>${hora(os.chegada)}</dd><dt>Conclusão</dt><dd>${hora(os.fim)}</dd>
        </dl>
        ${c ? `<p class="ajuda" style="margin-top:8px">${esc(c.descricao)}</p>` : ''}
      </div>
      ${os.tipo === 'rega' ? `<div class="cartao"><h4>Paradas (${(os.regadas || []).length}/${(os.paradas || []).length} regadas)</h4>
        <ul class="paradas">${(os.paradas || []).map((pid) => { const a = A.arvores.find((x) => x.id === pid); if (!a) return ''; const ok = (os.regadas || []).includes(pid); const irr = A.analisar(a).irr;
          return `<li class="${ok ? 'ok' : ''}"><span>${esc((Arbo.ESPECIES[a.especie] || {}).nome)} · ${esc(a.endereco || '')} <small>${irr.litros ? irr.litros + ' L' : ''}</small></span>
          ${ok ? '<b>Regada</b>' : `<button class="btn" data-regar="${pid}" ${podeMarcar ? '' : 'disabled'}>Regada</button>`}</li>`; }).join('')}</ul></div>` : ''}
      ${os.tipo === 'vistoria' && A.cartaoSugestao ? A.cartaoSugestao(os.ref, minha && os.status === 'execucao') : ''}
      <div class="cartao"><h4>Checklist obrigatório</h4>
        ${os.check.map((v, i) => `<label class="check-linha"><input type="checkbox" data-ck="${i}" ${v ? 'checked' : ''} ${podeMarcar ? '' : 'disabled'}> ${esc(CHECK[g][i])}</label>`).join('')}
        <label class="campo" style="margin-top:8px">Foto do serviço <input type="file" accept="image/*" capture="environment" id="os-foto" ${podeMarcar ? '' : 'disabled'}></label>
        ${os.foto ? `<p class="ajuda">Foto anexada: ${esc(os.foto)}</p>` : ''}
        <label class="campo">Observações <textarea id="os-obs" rows="2" ${minha ? '' : 'disabled'}>${esc(os.obs)}</textarea></label>
      </div>
      ${Arbo.pode('gerir_os') && os.status !== 'concluida' ? `<label class="campo">Equipe responsável <select id="os-equipe">${Arbo.EQUIPES.map((e) => `<option value="${e.id}" ${e.id === os.equipe ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></label>` : ''}
      <div class="acoes">
        ${minha && os.status === 'pendente' ? '<button class="btn primario" data-os-acao="deslocamento">Iniciar deslocamento</button>' : ''}
        ${minha && os.status === 'deslocamento' ? '<button class="btn primario" data-os-acao="execucao">Cheguei, iniciar serviço</button>' : ''}
        ${minha && os.status === 'execucao' ? `<button class="btn primario" data-os-acao="concluida" ${checkOk ? '' : 'disabled title="Cumpra todo o checklist para concluir"'}>Concluir OS</button>` : ''}
      </div>
      ${minha && os.status === 'execucao' && !checkOk ? '<p class="ajuda">Para concluir, marque todos os itens do checklist' + (pendRega.length ? ', registre todas as paradas' : '') + (g === 'vistoria' ? ' e aprove ou recuse a sugestão' : '') + '.</p>' : ''}
      ${!minha && Arbo.pode('minhas_os') ? '<p class="ajuda">Esta OS é de outra equipe.</p>' : ''}`;
    $('#os-fechar').onclick = () => { selecionada = null; d.classList.add('oculto'); render(); };
    d.querySelectorAll('[data-ck]').forEach((cb) => (cb.onchange = () => { os.check[+cb.dataset.ck] = cb.checked; salvar(); abrir(id); }));
    d.querySelectorAll('[data-regar]').forEach((b) => (b.onclick = () => {
      const a = A.arvores.find((x) => x.id === b.dataset.regar);
      os.regadas = [...(os.regadas || []), a.id]; A.registrar(a, 'rega', eq.nome); A.salvar(); salvar();
      Arbo.auditar('Registrou rega', `${a.id} (${os.id})`); A.atualizar(); abrir(id);
    }));
    const foto = $('#os-foto'); if (foto) foto.onchange = () => { if (foto.files[0]) { os.foto = foto.files[0].name; salvar(); abrir(id); } };
    const obs = $('#os-obs'); if (obs) obs.onchange = () => { os.obs = obs.value; salvar(); };
    const sel = $('#os-equipe'); if (sel) sel.onchange = () => { Arbo.auditar('Redistribuiu OS', `${os.id}: ${equipe(os.equipe).nome} → ${equipe(sel.value).nome}`); os.equipe = sel.value; salvar(); render(); abrir(id); };
    d.querySelectorAll('[data-os-acao]').forEach((b) => (b.onclick = () => {
      const st = b.dataset.osAcao, agora = new Date().toISOString();
      os.status = st;
      if (st === 'deslocamento') os.inicio = agora;
      if (st === 'execucao') { os.chegada = agora; if (c && c.status === 'aberto') { c.status = 'atendimento'; A.salvarCh(); } }
      if (st === 'concluida') { os.fim = agora; if (c) { c.status = 'concluido'; c.conclusao = agora; A.salvarCh(); } }
      Arbo.auditar(`OS ${STATUS[st].toLowerCase()}`, `${os.id} · ${titulo(os)}`);
      salvar(); A.atualizar(); abrir(id);
    }));
    if (A.ligarCartaoSugestao) A.ligarCartaoSugestao(d, () => { sincronizar(); A.atualizar(); abrir(id); });
  }

  // Novos chamados e sugestões geram OS automaticamente
  A.aoCriarChamado.push((c) => { const os = nova({ tipo: 'chamado', ref: c.id, equipe: equipePara(c.tipo) }); Arbo.auditar('OS criada', `${os.id} para ${equipe(os.equipe).nome}`); });
  A.criarVistoria = (s) => { const os = nova({ tipo: 'vistoria', ref: s.id, equipe: 'eq-03' }); return os; };
  A.EQUIPES = Arbo.EQUIPES;
  A.renderers.push(() => { if (A.abaAtiva() === 'os') render(); else desenharRota(); });
  A.aoRestaurar.push(() => { semear(); });
  A.aoIniciar.push(() => { if (!lista) semear(); else gerarRega(); });
})();
