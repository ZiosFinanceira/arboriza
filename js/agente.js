// Agente do Futuro: o lado do cidadão. Mostra onde a pessoa pode ajudar (regar, adotar uma muda,
// participar de horta ou mutirão), registra o cuidado no histórico da árvore e dá pontos.
(function () {
  const A = Arbo.app, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.agente';
  const NIVEIS = [[0, 'Semente'], [50, 'Broto'], [150, 'Muda'], [400, 'Árvore'], [1000, 'Floresta']];
  const PONTOS = { rega: 10, composto: 15, adocao: 50, evento: 20, chamado: 5 };
  let perfil = carregar();
  let pontos = Arbo.seedPontosAgente();
  const marcadores = [];

  function carregar() {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { /* sem storage */ }
    return { nome: '', pontos: 0, eventos: [] };
  }
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(perfil)); } catch (e) { /* ignora */ } }
  const nome = () => perfil.nome.trim() || 'Agente anônimo';
  const nivel = () => NIVEIS.filter(([p]) => perfil.pontos >= p).pop();
  const proximo = () => NIVEIS.find(([p]) => p > perfil.pontos);

  function ganhar(qtd, msg) {
    perfil.pontos += qtd; salvar();
    A.toast(`+${qtd} pontos · ${msg}`);
  }

  function tarefas() {
    return A.arvores.map((a) => ({ a, ...A.analisar(a), aband: Arbo.engine.abandono(a, A.hoje) }))
      .filter((x) => x.a.saude !== 'morta' && x.a.saude !== 'substituida' && (x.irr.acao === 'irrigar' || x.aband || x.adu.acao === 'adubar'))
      .sort((x, y) => (y.aband ? 1 : 0) - (x.aband ? 1 : 0) || y.irr.prioridade - x.irr.prioridade)
      .slice(0, 8);
  }

  function render() {
    if (A.abaAtiva() !== 'agente') { marcadores.forEach((m) => m.remove()); marcadores.length = 0; return; }
    const nv = nivel(), px = proximo();
    $('#agente-perfil').innerHTML = `
      <div class="perfil-linha">
        <input id="inp-agente" placeholder="Seu nome ou apelido" value="${esc(perfil.nome)}">
        <div class="nivel"><b>${perfil.pontos}</b> pts · ${nv[1]}</div>
      </div>
      <div class="progresso"><div style="width:${px ? ((perfil.pontos - nv[0]) / (px[0] - nv[0])) * 100 : 100}%"></div></div>
      <div class="ajuda">${px ? `Faltam ${px[0] - perfil.pontos} pontos para virar <b>${px[1]}</b>.` : 'Nível máximo. Obrigado!'}</div>`;
    $('#inp-agente').onchange = (e) => { perfil.nome = e.target.value; salvar(); };

    $('#agente-tarefas').innerHTML = tarefas().map(({ a, esp, irr, adu, aband }) => {
      const baldes = Math.max(1, Math.round(irr.litros / 10));
      const oque = irr.acao === 'irrigar' ? `Regar ${irr.litros} L (≈ ${baldes} balde${baldes > 1 ? 's' : ''}), de manhã cedo ou fim de tarde`
        : aband ? 'Verificar se a terra está seca e regar' : 'Espalhar composto orgânico ao redor (kit)';
      return `<li class="tarefa" data-arv="${a.id}">
        <div class="nome" data-ag="ver" title="Ver no mapa">${esc(esp.nome)} ${aband ? '<span class="tag irrigar">abandonada</span>' : ''} ${a.adotadaPor ? '<span class="tag ok">adotada</span>' : ''}</div>
        <div class="sub">${esc(a.endereco || '')}</div>
        <div class="oque">${oque}</div>
        <div class="acoes">
          ${irr.acao === 'irrigar' || aband ? '<button class="btn primario" data-ag="rega" data-perm="cuidar_como_agente">Eu reguei</button>' : ''}
          ${adu.acao === 'adubar' ? '<button class="btn" data-ag="composto" data-perm="cuidar_como_agente">Coloquei composto</button>' : ''}
          ${!a.adotadaPor ? '<button class="btn" data-ag="adotar" data-perm="cuidar_como_agente">Adotar</button>' : ''}
        </div>
      </li>`;
    }).join('') || '<p class="ajuda">Nenhuma muda precisando de ajuda agora.</p>';

    $('#agente-pontos').innerHTML = pontos.map((p) => {
      const vou = perfil.eventos.includes(p.id);
      return `<li class="tarefa" data-pt="${p.id}">
        <div class="nome">${esc(p.nome)}</div>
        <div class="sub">${esc(p.endereco)} · ${p.data ? fmtData(p.data) + ', ' : ''}${esc(p.quando)}</div>
        <div class="oque">${esc(p.oque)}</div>
        <div class="acoes">
          <button class="btn ${vou ? '' : 'primario'}" data-ag="evento" data-perm="cuidar_como_agente">${vou ? 'Presença confirmada' : 'Vou participar'}</button>
          <button class="btn" data-ag="ver-pt">Ver no mapa</button>
        </div>
      </li>`;
    }).join('');

    const bairros = [['Bela Vista', 1240], ['Jardim Paulista', 980], ['Consolação', 760], ['Cerqueira César', 530]];
    $('#agente-ranking').innerHTML = bairros.map(([b, p], i) => `<li><span>${i + 1}. ${b}</span><b>${p} pts</b></li>`).join('') +
      `<li class="voce"><span>Você (${esc(nome())})</span><b>${perfil.pontos} pts</b></li>`;

    marcadores.forEach((m) => m.remove()); marcadores.length = 0;
    pontos.forEach((p) => {
      const icon = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
        html: `<div class="pin-agente ${p.tipo}">${p.tipo === 'horta' ? 'H' : 'M'}</div>` });
      const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 }).addTo(A.mapa);
      m.bindTooltip(p.nome);
      marcadores.push(m);
    });
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ag]'); if (!b || !b.closest('#aba-agente')) return;
    const li = b.closest('[data-arv],[data-pt]');
    const a = li && li.dataset.arv && A.arvores.find((x) => x.id === li.dataset.arv);
    const p = li && li.dataset.pt && pontos.find((x) => x.id === li.dataset.pt);
    const t = b.dataset.ag;
    if (t === 'rega') { A.registrar(a, 'rega', nome()); A.salvar(); ganhar(PONTOS.rega, 'muda regada'); }
    if (t === 'composto') { A.registrar(a, 'adubação', nome()); A.salvar(); ganhar(PONTOS.composto, 'composto aplicado'); }
    if (t === 'adotar') { a.adotadaPor = nome(); A.salvar(); ganhar(PONTOS.adocao, 'muda adotada'); }
    if (t === 'ver') { A.selecionar(a.id, true); return; }
    if (t === 'ver-pt') { A.mapa.setView([p.lat, p.lng], 18); return; }
    if (t === 'evento') {
      const i = perfil.eventos.indexOf(p.id);
      if (i < 0) { perfil.eventos.push(p.id); ganhar(PONTOS.evento, 'presença confirmada'); }
      else { perfil.eventos.splice(i, 1); perfil.pontos = Math.max(0, perfil.pontos - PONTOS.evento); salvar(); }
    }
    A.atualizar();
  });

  $('#btn-agente-problema').onclick = () => {
    A.presetChamado = { origem: 'municipe' };
    A.setModoMapear('chamado');
  };

  A.nomeAgente = (n) => { perfil.nome = n; salvar(); };
  A.renderers.push(render);
  A.aoRestaurar.push(() => { perfil = { nome: '', pontos: 0, eventos: [] }; salvar(); });
})();
