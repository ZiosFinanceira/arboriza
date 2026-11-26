// Laudo técnico de poda ou supressão (RASCUNHO para o responsável técnico assinar).
// Monta o documento a partir da ficha, da última vistoria técnica e do índice de risco, e usa a impressão
// do navegador (o mesmo caminho do relatório anual). Prazos e compensação são REFERÊNCIAS do protótipo:
// cada município tem a sua lei e o seu manual, e quem assina é engenheiro agrônomo/florestal ou biólogo com ART/TRT.
(function () {
  const A = Arbo.app, R = Arbo.risco, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const KEY_SEQ = Arbo.CONFIG.storageKey + '.laudo-seq';
  const TIPOS = {
    'poda-limpeza':   { nome: 'Poda de limpeza (galhos secos, doentes ou quebrados)', chamado: 'poda' },
    'poda-fiacao':    { nome: 'Poda de adequação à rede elétrica', chamado: 'fiacao' },
    'poda-levant':    { nome: 'Poda de levantamento de copa (passagem de pedestres e veículos)', chamado: 'poda' },
    'poda-equilibrio':{ nome: 'Poda de equilíbrio da copa', chamado: 'poda' },
    'supressao':      { nome: 'Supressão (corte) da árvore', chamado: 'corte' },
    'remocao':        { nome: 'Remoção de árvore morta ou caída', chamado: 'remocao' },
    'transplante':    { nome: 'Transplante', chamado: 'outro' },
    'manter':         { nome: 'Manter, com monitoramento (sem intervenção agora)', chamado: null }
  };
  const PRAZO = { critico: 'Imediato (até 24 horas), com isolamento da área', alto: 'Até 7 dias', moderado: 'Até 30 dias', baixo: 'Até 90 dias', 'sem-vistoria': 'Após vistoria técnica' };
  const RISCO_CHAMADO = { critico: 'urgente', alto: 'alto', moderado: 'medio', baixo: 'baixo' };
  const SEGURANCA = {
    poda: ['Sinalizar e isolar a área de trabalho', 'EPI completo (capacete, óculos, luvas, proteção auditiva e cinto para trabalho em altura)', 'Cortes rentes ao colar do galho, sem deixar tocos e sem poda drástica (no máximo 25% da copa por intervenção)', 'Recolher e destinar os resíduos no mesmo dia'],
    fiacao: ['Solicitar à distribuidora de energia o desligamento ou o acompanhamento da rede antes do serviço', 'Executar apenas com equipe habilitada para trabalho próximo à rede (NR-10 e NR-35)'],
    supressao: ['Isolar a área no raio da altura da árvore', 'Derrubada por partes (desmonte) quando houver alvos próximos', 'Remover ou rebaixar o toco e recompor a calçada', 'Destinar a madeira e os resíduos conforme a regra municipal']
  };
  // Mudas de compensação sugeridas pelo porte da árvore suprimida: SÓ REFERÊNCIA, a lei municipal decide
  const COMPENSACAO = { pequena: 1, media: 2, grande: 3 };
  const NOME_TAM = { pequena: 'pequeno', media: 'médio', grande: 'grande' };
  let alvo = null;

  function sugerirTipo(a, r) {
    if (a.saude === 'morta') return 'remocao';
    const v = r.vistoria || {};
    if (r.classe === 'critico' && (v.rachadura || v.cavidade === 'grande' || v.inclinacaoRecente)) return 'supressao';
    if (v.fiacao) return 'poda-fiacao';
    if (v.galhosSecos) return 'poda-limpeza';
    if (r.classe === 'alto') return 'poda-equilibrio';
    return 'manter';
  }
  function justificativa(a, r) {
    if (!r.vistoria) return '';
    const m = r.motivos.map((x) => x.texto.toLowerCase());
    return `Na vistoria de ${fmtData(r.vistoria.data)} foram observados: ${m.length ? m.join('; ') : 'nenhum defeito relevante'}. Índice de risco de queda ${r.pontos} de 100 (${R.CLASSES[r.classe].nome.toLowerCase()}), considerando porte ${NOME_TAM[r.tamanho] || ''} e ocupação ${r.vistoria.alvo === 'alta' ? 'alta' : r.vistoria.alvo === 'baixa' ? 'baixa' : 'média'} embaixo da árvore.`;
  }

  // ---------- botão na ficha ----------
  A.detalhe.push({
    html(a) {
      if (a.origem === 'planejada') return '';
      return `<div class="cartao"><h4>Laudo técnico</h4>
        <p class="ajuda" style="margin-bottom:8px">Rascunho de laudo de poda ou supressão com os dados da vistoria, para o responsável técnico revisar e assinar.</p>
        ${(a.laudos || []).length ? `<p class="ajuda">Último laudo: ${esc(a.laudos[a.laudos.length - 1].numero)} em ${fmtData(a.laudos[a.laudos.length - 1].data)} · ${esc(TIPOS[a.laudos[a.laudos.length - 1].tipo].nome)}</p>` : ''}
        <button class="btn" data-laudo="${esc(a.id)}" data-perm="emitir_laudo">Gerar laudo</button></div>`;
    }
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-laudo]'); if (b && Arbo.pode('emitir_laudo')) abrir(b.dataset.laudo); });

  function abrir(id) {
    const a = A.arvores.find((x) => x.id === id); if (!a) return;
    alvo = a;
    const r = A.risco(a), f = $('#form-laudo');
    f.reset();
    $('#laudo-sem-vistoria').classList.toggle('oculto', !!r.vistoria);
    $('#laudo-campos').classList.toggle('oculto', !r.vistoria);
    $('#btn-laudo-gerar').disabled = !r.vistoria;
    if (r.vistoria) {
      f.tipo.innerHTML = Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${esc(t.nome)}</option>`).join('');
      f.tipo.value = sugerirTipo(a, r);
      f.justificativa.value = justificativa(a, r);
      f.prazo.value = PRAZO[r.classe] || PRAZO.baixo;
      const ses = Arbo.sessao() || {};
      f.rt.value = ''; f.registro.value = ''; f.chamado.checked = !!TIPOS[f.tipo.value].chamado && ['alto', 'critico'].includes(r.classe);
      $('#laudo-resumo').innerHTML = `${esc((Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida).nome)} · ${esc(a.endereco || a.id)} · risco ${A.seloRisco(r)}`;
      atualizarComp();
      $('#laudo-por').textContent = ses.nome ? `Emitido por: ${ses.nome}` : '';
    }
    $('#dlg-laudo').returnValue = ''; $('#dlg-laudo').showModal();
  }
  function atualizarComp() {
    const f = $('#form-laudo'), sup = f.tipo.value === 'supressao';
    $('#laudo-comp').classList.toggle('oculto', !sup);
    if (sup && alvo) { const r = A.risco(alvo); f.mudas.value = COMPENSACAO[r.tamanho] || 1; }
  }
  $('#form-laudo').tipo.addEventListener('change', () => { atualizarComp(); const f = $('#form-laudo'); f.chamado.checked = !!TIPOS[f.tipo.value].chamado && f.chamado.checked; });
  $('#btn-laudo-vistoria').onclick = () => { $('#dlg-laudo').close('cancel'); if (A.abrirVistoria && alvo) A.abrirVistoria(alvo); };
  $('#btn-cancelar-laudo').onclick = () => $('#dlg-laudo').close('cancel');
  $('#dlg-laudo').addEventListener('close', () => {
    if ($('#dlg-laudo').returnValue !== 'ok' || !alvo) return;
    const f = $('#form-laudo'), a = alvo, r = A.risco(a);
    const ano = new Date().getFullYear();
    let seq = 0; try { seq = JSON.parse(localStorage.getItem(KEY_SEQ)) || {}; } catch (e) { seq = {}; }
    if (typeof seq !== 'object') seq = {};
    seq[ano] = (seq[ano] || 0) + 1;
    try { localStorage.setItem(KEY_SEQ, JSON.stringify(seq)); } catch (e) { /* ignora */ }
    const laudo = {
      numero: `LAU-${ano}-${String(seq[ano]).padStart(4, '0')}`, data: A.hojeISO(), tipo: f.tipo.value,
      justificativa: f.justificativa.value.trim(), prazo: f.prazo.value.trim(), mudas: f.tipo.value === 'supressao' ? Math.max(0, +f.mudas.value || 0) : 0,
      rt: f.rt.value.trim(), registro: f.registro.value.trim(), por: (Arbo.sessao() || {}).nome || '', pontos: r.pontos, classe: r.classe
    };
    a.laudos = [...(a.laudos || []), laudo];
    A.salvar();
    Arbo.auditar('Emitiu laudo', `${laudo.numero} · ${a.id} · ${TIPOS[laudo.tipo].nome}`);
    const t = TIPOS[laudo.tipo];
    if (f.chamado.checked && t.chamado) {
      A.criarChamado({ arvoreId: a.id, tipo: t.chamado, risco: RISCO_CHAMADO[r.classe] || 'medio', origem: 'vistoria', descricao: `Conforme laudo ${laudo.numero}: ${t.nome}. Prazo: ${laudo.prazo}.` });
    }
    imprimir(a, laudo);
  });

  // ---------- documento ----------
  function montar(a, l) {
    const e = Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida, r = A.risco(a), v = r.vistoria || {};
    const t = TIPOS[l.tipo], grupo = l.tipo === 'supressao' || l.tipo === 'remocao' ? 'supressao' : 'poda';
    const medidas = [...SEGURANCA[grupo], ...(l.tipo === 'poda-fiacao' || v.fiacao ? SEGURANCA.fiacao : [])];
    const linha = (k, val) => `<tr><th>${esc(k)}</th><td>${val}</td></tr>`;
    const orgao = (Arbo.CONFIG.contato && Arbo.CONFIG.contato.orgao) || Arbo.CONFIG.cidade;
    const ce = Arbo.especieCerta && a.larguraCalcada ? A.recomendarEspecies(a.larguraCalcada, a.fiacaoAerea) : null;
    return `
    <div class="rel-barra no-print"><button class="btn" data-fechar-rel>Voltar ao sistema</button><button class="btn primario" data-imprimir-rel>Imprimir ou salvar em PDF</button></div>
    <div class="laudo-rascunho">RASCUNHO · válido somente após revisão e assinatura do responsável técnico</div>
    <header class="rel-capa">
      <div class="rel-marca">${esc(orgao)} · Arboriza</div>
      <h1>Laudo técnico de ${grupo === 'supressao' ? 'supressão' : 'poda'} de árvore</h1>
      <p class="rel-nota">Laudo nº ${esc(l.numero)} · emitido em ${fmtData(l.data)}${l.por ? ' · preparado por ' + esc(l.por) : ''}</p>
    </header>
    <h2>1. Identificação da árvore</h2>
    <table class="laudo-tab">
      ${linha('Número da árvore', esc(a.id))}
      ${linha('Espécie', `${esc(e.nome)} (<i>${esc(e.cientifico)}</i>)${e.origem ? ` · ${e.origem === 'nativa' ? 'nativa do Brasil' : 'exótica'}` : ''}`)}
      ${linha('Endereço', esc(a.endereco || 'não informado'))}
      ${linha('Coordenadas', `${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}`)}
      ${linha('Origem do plantio', esc((Arbo.ORIGENS[a.origem] || {}).nome || '—'))}
      ${linha('Plantio', a.plantio ? fmtData(a.plantio) : 'não informado')}
      ${linha('DAP e altura', `${v.dap ? v.dap + ' cm' : '—'} · ${v.altura ? v.altura + ' m' : '—'} · porte ${esc(NOME_TAM[r.tamanho] || '—')}`)}
      ${a.larguraCalcada ? linha('Local', `calçada de ${Number(a.larguraCalcada).toLocaleString('pt-BR')} m · ${a.fiacaoAerea === true ? 'com fiação aérea' : a.fiacaoAerea === false ? 'sem fiação aérea' : 'fiação não informada'}`) : ''}
      ${linha('Estado geral', esc((Arbo.SAUDE[a.saude || 'viva'] || {}).nome || ''))}
    </table>
    <h2>2. Vistoria técnica</h2>
    <p>Vistoria realizada em ${fmtData(v.data)}${v.por ? ' por ' + esc(v.por) : ''}.</p>
    ${r.motivos.length ? `<table class="laudo-tab"><tr><th>Achado</th><th class="num">Pontos</th></tr>${r.motivos.map((m) => `<tr><td>${esc(m.texto)}</td><td class="num">${m.pontos}</td></tr>`).join('')}</table>` : '<p>Nenhum defeito relevante registrado.</p>'}
    <p>Ocupação embaixo da árvore: ${v.alvo === 'alta' ? 'alta (circulação intensa, ponto de ônibus, escola ou similar)' : v.alvo === 'baixa' ? 'baixa' : 'média'}.${v.obs ? ' Observações da vistoria: ' + esc(v.obs) : ''}</p>
    <h2>3. Avaliação de risco</h2>
    <p>Índice de risco de queda: <b>${r.pontos} de 100 (${esc(R.CLASSES[r.classe].nome)})</b>. Soma dos achados multiplicada pelo porte e pela ocupação (fator ${String(r.fator).replace('.', ',')}).</p>
    <h2>4. Recomendação</h2>
    <table class="laudo-tab">
      ${linha('Intervenção', `<b>${esc(t.nome)}</b>`)}
      ${linha('Prazo', esc(l.prazo))}
    </table>
    <p><b>Justificativa.</b> ${esc(l.justificativa)}</p>
    ${l.tipo !== 'manter' ? `<p><b>Medidas de execução e segurança:</b></p><ul>${medidas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p>Manter a árvore e repetir a vistoria no prazo do calendário de vistoria.</p>'}
    ${l.tipo === 'supressao' ? `<h2>5. Compensação</h2>
      <p>Sugestão do sistema: plantio de <b>${l.mudas} muda(s)</b> de reposição, preferencialmente no mesmo local ou na mesma quadra. A quantidade final segue a legislação municipal de compensação ambiental.</p>
      ${ce && ce.servem.length ? `<p>Espécies indicadas para o local: ${ce.servem.slice(0, 5).map((x) => esc(x.nome) + (x.nativa ? ' (nativa)' : '')).join(', ')}.</p>` : ''}` : ''}
    <h2>${l.tipo === 'supressao' ? '6' : '5'}. Responsável técnico</h2>
    <div class="laudo-assina">
      <p>Declaro que vistoriei a árvore descrita e que as informações deste laudo conferem com o observado em campo.</p>
      <div class="laudo-linha"></div>
      <p>${esc(l.rt || 'Nome do responsável técnico')}<br>${esc(l.registro || 'Registro profissional (CREA ou CRBio) e nº da ART/TRT')}<br>Local e data: ______________________</p>
    </div>
    <p class="rel-nota">Documento gerado pelo Arboriza a partir dos dados cadastrados. Os pesos do índice de risco, os prazos e a compensação sugerida são referências do sistema e não substituem a legislação municipal nem o julgamento do responsável técnico. Fotos da árvore devem ser anexadas ao processo.</p>`;
  }

  function imprimir(a, l) {
    const el = $('#relatorio');
    el.innerHTML = montar(a, l);
    const titulo = document.title;
    document.title = `Laudo ${l.numero} · ${a.id}`;
    document.body.classList.add('imprimindo-relatorio');
    el.removeAttribute('aria-hidden');
    const fim = () => { document.body.classList.remove('imprimindo-relatorio'); el.setAttribute('aria-hidden', 'true'); document.title = titulo; window.removeEventListener('afterprint', fim); setTimeout(() => { A.mapa.invalidateSize(); A.selecionar(a.id, false); }, 0); };
    window.addEventListener('afterprint', fim);
    el.querySelector('[data-fechar-rel]').onclick = fim;
    el.querySelector('[data-imprimir-rel]').onclick = () => window.print();
    setTimeout(() => { try { window.print(); } catch (e) { /* impressão bloqueada: o botão continua disponível */ } }, 50);
  }
  A.montarLaudo = montar; // usado nos testes
})();
