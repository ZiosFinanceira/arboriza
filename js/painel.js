// Painel: os indicadores da arborização num lugar só (risco, vistorias, diversidade, mudas e chamados).
// A função indicadores() também alimenta o relatório anual (js/relatorio.js).
(function () {
  const A = Arbo.app, R = Arbo.risco, CH = Arbo.chamados, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const pctTxt = (x) => `${(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const especie = (a) => Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida;
  const DIA = 86400000;

  function indicadores(ano) {
    const hoje = A.hoje;
    const todas = A.arvores.filter(R.contaComoArvore);
    const av = todas.map((a) => ({ a, r: A.risco(a), p: A.proximaVistoria(a) }));

    // risco
    const porClasse = Object.fromEntries(Object.keys(R.CLASSES).map((k) => [k, 0]));
    av.forEach((x) => porClasse[x.r.classe]++);
    const fila = av.filter((x) => x.r.pontos != null && x.r.classe !== 'baixo').sort((x, y) => y.r.pontos - x.r.pontos);
    const vistoriadas = av.filter((x) => x.r.vistoria).length;

    // calendário
    const vencidas = av.filter((x) => x.p && x.p.vencida && !x.p.pendente).sort((x, y) => x.p.dias - y.p.dias);
    const pendentes = av.filter((x) => x.p && x.p.pendente);
    const proximas = av.filter((x) => x.p && !x.p.vencida).sort((x, y) => x.p.dias - y.p.dias);
    const em = (d) => proximas.filter((x) => x.p.dias <= d).length;

    // mudas jovens (fase de estabelecimento: 0–2 anos)
    const jovens = todas.filter((a) => a.plantio && Arbo.engine.fase(a, hoje) === 'estabelecimento');
    const jovensMortas = jovens.filter((a) => a.saude === 'morta').length;
    const abandonadas = todas.filter((a) => Arbo.engine.abandono(a, hoje)).length;
    const mortas = todas.filter((a) => a.saude === 'morta').length;

    // chamados
    const ch = A.chamados;
    const ativos = ch.filter((c) => c.status !== 'concluido');
    const concl = ch.filter((c) => c.status === 'concluido' && c.conclusao);
    const mediaAtend = concl.length ? concl.reduce((s, c) => s + CH.diasAberto(c, hoje), 0) / concl.length : null;
    const porTipo = {};
    ativos.forEach((c) => (porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1));

    // atividade no ano (para o relatório)
    const noAno = (d) => d && String(d).slice(0, 4) === String(ano);
    const lista = (x) => (Array.isArray(x) ? x.filter((i) => i && typeof i === 'object') : []); // dados importados podem vir malformados
    const vistoriasAno = todas.reduce((s, a) => s + lista(a.vistorias).filter((v) => R.dataOk(v.data) && noAno(v.data)).length, 0);
    const cuidadosAno = todas.reduce((s, a) => s + lista(a.historico).filter((h) => noAno(h.data)).length, 0);
    const plantadasAno = todas.filter((a) => noAno(a.plantio)).length;
    const chamadosAno = ch.filter((c) => noAno(c.abertura)).length;
    const concluidosAno = concl.filter((c) => noAno(c.conclusao)).length;

    const porOrigem = {};
    todas.forEach((a) => (porOrigem[a.origem] = (porOrigem[a.origem] || 0) + 1));

    return {
      ano, total: todas.length, vivas: todas.length - mortas, mortas, porOrigem,
      naoCadastradas: todas.filter((a) => a.origem === 'nao-cadastrada').length,
      inadequadas: todas.filter((a) => !especie(a).calcada).length,
      risco: { porClasse, fila, vistoriadas, graves: porClasse.alto + porClasse.critico },
      cal: { vencidas, pendentes: pendentes.length, em30: em(30), em90: em(90), proximas },
      diversidade: R.diversidade(A.arvores, Arbo.ESPECIES),
      mudas: { jovens: jovens.length, jovensMortas, sobrevivencia: jovens.length ? pct(jovens.length - jovensMortas, jovens.length) : null, abandonadas },
      chamados: { ativos: ativos.length, dezDias: ativos.filter((c) => CH.diasAberto(c, hoje) >= 10).length, concluidos: concl.length, mediaAtend, porTipo },
      ano_: { vistorias: vistoriasAno, cuidados: cuidadosAno, plantadas: plantadasAno, chamados: chamadosAno, concluidos: concluidosAno }
    };
  }
  A.indicadores = indicadores;

  function itemArvore(x, direita) {
    return `<li class="item" data-painel-arv="${esc(x.a.id)}">
      <span class="bola" style="background:${R.CLASSES[x.r.classe].cor}"></span>
      <div class="info"><div class="nome">${esc(especie(x.a).nome)}</div><div class="sub">${esc(x.a.endereco || x.a.id)}</div></div>
      ${direita}</li>`;
  }

  function render() {
    if (A.abaAtiva() !== 'painel') return;
    const I = indicadores(new Date().getFullYear());
    const vencTot = I.cal.vencidas.length + I.cal.pendentes;
    $('#kpis-painel').innerHTML = `
      <div class="kpi"><b>${I.total}</b><span>árvores no inventário</span></div>
      <div class="kpi"><b>${pct(I.risco.vistoriadas, I.total)}%</b><span>com vistoria técnica</span></div>
      <div class="kpi ${I.risco.graves ? 'vermelho' : ''}"><b>${I.risco.graves}</b><span>risco alto ou crítico</span></div>
      <div class="kpi ${vencTot ? 'alerta' : ''}"><b>${vencTot}</b><span>vistorias vencidas ou pendentes</span></div>`;

    // risco: barra empilhada + fila
    const ordem = ['critico', 'alto', 'moderado', 'baixo', 'sem-vistoria'];
    $('#painel-risco').innerHTML = `
      <div class="pilha">${ordem.map((k) => I.risco.porClasse[k] ? `<div style="flex:${I.risco.porClasse[k]};background:${R.CLASSES[k].cor}" title="${esc(R.CLASSES[k].nome)}: ${I.risco.porClasse[k]}"></div>` : '').join('')}</div>
      <ul class="pilha-leg">${ordem.map((k) => `<li><i style="background:${R.CLASSES[k].cor}"></i>${esc(R.CLASSES[k].nome)} <b>${I.risco.porClasse[k]}</b></li>`).join('')}</ul>
      <h4 class="sub-secao">Fila de prioridade</h4>
      <ul class="lista">${I.risco.fila.slice(0, 6).map((x) => itemArvore(x, A.seloRisco(x.r))).join('') || '<p class="ajuda">Nenhuma árvore vistoriada com risco moderado ou maior.</p>'}</ul>`;

    // calendário
    const prox = [...I.cal.vencidas, ...I.cal.proximas].slice(0, 6);
    $('#painel-calendario').innerHTML = `
      <div class="mini-kpis">
        <div class="${I.cal.vencidas.length ? 'vermelho' : ''}"><b>${I.cal.vencidas.length}</b><span>vencidas</span></div>
        <div class="${I.cal.pendentes ? 'alerta' : ''}"><b>${I.cal.pendentes}</b><span>nunca vistoriadas</span></div>
        <div><b>${I.cal.em30}</b><span>nos próximos 30 dias</span></div>
        <div><b>${I.cal.em90}</b><span>nos próximos 90 dias</span></div>
      </div>
      <ul class="lista">${prox.map((x) => itemArvore(x, `<span class="data-vist ${x.p.vencida ? 'vencida' : ''}">${x.p.vencida ? `venceu há ${-x.p.dias} ${-x.p.dias === 1 ? 'dia' : 'dias'}` : fmtData(x.p.data)}</span>`)).join('')}</ul>
      ${I.cal.pendentes ? `<p class="ajuda">${I.cal.pendentes === 1 ? '1 árvore ainda não tem' : I.cal.pendentes + ' árvores ainda não têm'} vistoria técnica. Use o filtro "Vistoria vencida ou pendente" na aba Árvores para montar a rota de vistoria.</p>` : ''}`;

    // diversidade
    const D = I.diversidade, maxPct = Math.max(D.maxEspecie * 1.5, ...D.especies.map((e) => e.pct), 0.01);
    const alertasE = D.especies.filter((e) => e.alerta), alertasG = D.generos.filter((g) => g.alerta);
    $('#painel-diversidade').innerHTML = `
      ${D.poucas ? `<p class="ajuda">Com ${D.total} árvores identificadas a porcentagem ainda não é confiável. Os alertas começam a partir de ${R.PARAMS.minArvoresDiversidade}.</p>` : ''}
      ${alertasE.length || alertasG.length ? `<div class="alerta-esp">${[
        ...alertasE.map((e) => `<b>${esc(e.nome)}</b> é ${pctTxt(e.pct)} das árvores (limite recomendado: ${pctTxt(D.maxEspecie)}).`),
        ...alertasG.map((g) => `O gênero <i>${esc(g.nome)}</i> é ${pctTxt(g.pct)} (limite: ${pctTxt(D.maxGenero)}).`)].join('<br>')}
        Uma praga ou um evento climático pode atingir muitas árvores de uma vez; diversificar nos próximos plantios.</div>`
        : D.total && !D.poucas ? `<p class="ajuda ok-txt">Nenhuma espécie passa de ${pctTxt(D.maxEspecie)} e nenhum gênero passa de ${pctTxt(D.maxGenero)}.</p>` : ''}
      <ul class="barras-div">${D.especies.slice(0, 8).map((e) => `<li class="${e.alerta ? 'alerta' : ''}">
        <span>${esc(e.nome)}</span>
        <div class="trilho-div"><div style="width:${(e.pct / maxPct) * 100}%"></div><i style="left:${(D.maxEspecie / maxPct) * 100}%" title="limite de ${pctTxt(D.maxEspecie)}"></i></div>
        <b>${pctTxt(e.pct)}</b></li>`).join('')}</ul>
      <p class="ajuda">${D.total} árvores vivas identificadas, ${D.especies.length} espécies, ${D.generos.length} gêneros${D.naoIdentificadas ? ` · ${D.naoIdentificadas} sem espécie identificada (fora da conta)` : ''}. A linha marca o limite de ${pctTxt(D.maxEspecie)} por espécie.</p>`;

    // mudas e chamados
    $('#painel-mudas').innerHTML = `
      <div class="mini-kpis">
        <div><b>${I.mudas.jovens}</b><span>mudas com até 2 anos</span></div>
        <div class="${I.mudas.sobrevivencia != null && I.mudas.sobrevivencia < 85 ? 'alerta' : ''}"><b>${I.mudas.sobrevivencia == null ? '—' : I.mudas.sobrevivencia + '%'}</b><span>sobrevivência das mudas</span></div>
        <div class="${I.mudas.abandonadas ? 'vermelho' : ''}"><b>${I.mudas.abandonadas}</b><span>abandonadas (+21 dias sem cuidado)</span></div>
        <div class="${I.mortas ? 'vermelho' : ''}"><b>${I.mortas}</b><span>mortas a substituir</span></div>
      </div>`;
    const podeCh = Arbo.pode('ver_chamados');
    $('#painel-chamados-titulo').classList.toggle('oculto', !podeCh);
    $('#painel-chamados').classList.toggle('oculto', !podeCh);
    const tipos = Object.entries(I.chamados.porTipo).sort((a, b) => b[1] - a[1]);
    if (podeCh) $('#painel-chamados').innerHTML = `
      <div class="mini-kpis">
        <div><b>${I.chamados.ativos}</b><span>abertos</span></div>
        <div class="${I.chamados.dezDias ? 'vermelho' : ''}"><b>${I.chamados.dezDias}</b><span>abertos há 10 dias ou mais</span></div>
        <div><b>${I.chamados.concluidos}</b><span>concluídos</span></div>
        <div><b>${I.chamados.mediaAtend == null ? '—' : I.chamados.mediaAtend.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' d'}</b><span>tempo médio de atendimento</span></div>
      </div>
      ${tipos.length ? `<ul class="tipos-ch">${tipos.map(([t, n]) => `<li><span>${esc(CH.TIPOS[t] || t)}</span><b>${n}</b></li>`).join('')}</ul>` : ''}`;
  }

  $('#aba-painel').addEventListener('click', (e) => {
    const li = e.target.closest('[data-painel-arv]');
    if (li) A.selecionar(li.dataset.painelArv, true);
  });

  A.renderers.push(render);
})();
