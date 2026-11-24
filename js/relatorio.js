// Relatório anual da arborização: uma página pronta para imprimir ou "Salvar como PDF" no navegador.
// Não depende de biblioteca nenhuma: monta o HTML e usa a impressão do próprio navegador (CSS @media print).
(function () {
  const A = Arbo.app, R = Arbo.risco, CH = Arbo.chamados, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const int = (n) => Number(n).toLocaleString('pt-BR');
  const pctTxt = (x) => `${(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const especie = (a) => Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida;

  const el = document.createElement('article');
  el.id = 'relatorio';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  const tabela = (cab, linhas, num = []) => `<table><thead><tr>${cab.map((c, i) => `<th class="${num.includes(i) ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.length ? linhas.map((l) => `<tr>${l.map((v, i) => `<td class="${num.includes(i) ? 'num' : ''}">${v}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cab.length}">Sem registros.</td></tr>`}</tbody></table>`;
  const numero = (v, rotulo) => `<div class="rel-num"><b>${v}</b><span>${esc(rotulo)}</span></div>`;

  function montar(ano) {
    const I = A.indicadores(ano), D = I.diversidade, ses = Arbo.sessao() || {};
    const total = I.total || 0, pct = (n) => (total ? Math.round((n / total) * 100) + '%' : '—');
    const G = Arbo.pode('ver_gastos') && A.resumoGastos ? A.resumoGastos() : null;
    const obras = A.resumoObras ? A.resumoObras() : [];
    const tipos = Object.entries(I.chamados.porTipo).sort((a, b) => b[1] - a[1]);
    const podeCh = Arbo.pode('ver_chamados');

    return `
    <div class="rel-barra no-print"><button class="btn" data-fechar-rel>Voltar ao sistema</button><button class="btn primario" data-imprimir-rel>Imprimir ou salvar em PDF</button></div>
    <header class="rel-capa">
      <div class="rel-marca">Arboriza · ${esc(Arbo.CONFIG.cidade)}</div>
      <h1>Relatório anual da arborização urbana ${ano}</h1>
      <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${esc(ses.nome || '—')}${ses.papel && Arbo.PAPEIS[ses.papel].nome !== ses.nome ? ` (${esc(Arbo.PAPEIS[ses.papel].nome)})` : ''}.</p>
      <p class="rel-nota">Dados registrados no sistema até esta data. Na versão de demonstração os dados são exemplos.</p>
    </header>

    <section>
      <h2>1. Resumo em números</h2>
      <div class="rel-nums">
        ${numero(int(total), 'árvores no inventário')}
        ${numero(int(D.especies.length), 'espécies identificadas')}
        ${numero(pct(I.risco.vistoriadas), 'com vistoria técnica')}
        ${numero(int(I.risco.graves), 'com risco de queda alto ou crítico')}
        ${numero(I.mudas.sobrevivencia == null ? '—' : I.mudas.sobrevivencia + '%', 'de sobrevivência das mudas (até 2 anos)')}
        ${numero(int(I.ano_.vistorias), `vistorias técnicas em ${ano}`)}
        ${numero(int(I.ano_.cuidados), `regas e adubações registradas em ${ano}`)}
        ${podeCh ? numero(I.chamados.mediaAtend == null ? '—' : I.chamados.mediaAtend.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' dias', 'tempo médio de atendimento de chamados') : numero(int(I.inadequadas), 'de espécies inadequadas para calçada')}
      </div>
    </section>

    <section>
      <h2>2. Inventário</h2>
      <p>O inventário tem ${int(total)} árvores (${int(I.vivas)} vivas e ${int(I.mortas)} mortas aguardando substituição). ${int(I.naoCadastradas)} foram encontradas em campo sem registro e estão em regularização; ${int(I.inadequadas)} são de espécies inadequadas para calçada.</p>
      ${tabela(['Origem', 'Árvores', '%'], Object.entries(I.porOrigem).sort((a, b) => b[1] - a[1]).map(([k, n]) => [esc((Arbo.ORIGENS[k] || {}).nome || k), int(n), pct(n)]), [1, 2])}
      <h3>Diversidade de espécies</h3>
      <p>${int(D.total)} árvores vivas identificadas, de ${int(D.especies.length)} espécies e ${int(D.generos.length)} gêneros${D.naoIdentificadas ? `; ${int(D.naoIdentificadas)} ainda sem espécie identificada` : ''}. Referência: no máximo ${pctTxt(D.maxEspecie)} de uma espécie e ${pctTxt(D.maxGenero)} de um gênero.
      ${D.poucas ? `Com menos de ${R.PARAMS.minArvoresDiversidade} árvores identificadas, a porcentagem ainda não é conclusiva.` : ''}</p>
      ${tabela(['Espécie', 'Árvores', '%', 'Situação'], D.especies.slice(0, 12).map((e) => [esc(e.nome), int(e.n), pctTxt(e.pct), e.alerta ? '<b class="rel-alerta">Acima do limite</b>' : 'Dentro do limite']), [1, 2])}
      ${D.generos.filter((g) => g.alerta).map((g) => `<p class="rel-alerta">O gênero <i>${esc(g.nome)}</i> representa ${pctTxt(g.pct)} das árvores, acima de ${pctTxt(D.maxGenero)}.</p>`).join('')}
    </section>

    <section>
      <h2>3. Risco de queda e vistorias</h2>
      <p>${int(I.risco.vistoriadas)} árvores (${pct(I.risco.vistoriadas)}) têm vistoria técnica. Delas, ${int(I.risco.graves)} estão com risco alto ou crítico. ${int(I.cal.vencidas.length)} vistorias estão vencidas e ${int(I.cal.pendentes)} árvores nunca foram vistoriadas; ${int(I.cal.em90)} vistorias vencem nos próximos 90 dias.</p>
      ${tabela(['Classe de risco', 'Árvores', '%'], ['critico', 'alto', 'moderado', 'baixo', 'sem-vistoria'].map((k) => [esc(R.CLASSES[k].nome), int(I.risco.porClasse[k]), pct(I.risco.porClasse[k])]), [1, 2])}
      <h3>Árvores prioritárias</h3>
      ${tabela(['Árvore', 'Endereço', 'Pontos', 'Classe', 'Última vistoria'], I.risco.fila.slice(0, 10).map((x) => [esc(especie(x.a).nome) + `<small>${esc(x.a.id)}</small>`, esc(x.a.endereco || '—'), int(x.r.pontos), esc(R.CLASSES[x.r.classe].nome), fmtData(x.r.vistoria.data)]), [2])}
    </section>

    <section>
      <h2>4. Mudas e manutenção</h2>
      <p>Há ${int(I.mudas.jovens)} mudas com até 2 anos de plantio; ${I.mudas.sobrevivencia == null ? 'ainda sem base para calcular a sobrevivência' : `${I.mudas.sobrevivencia}% delas estão vivas`}. ${int(I.mudas.abandonadas)} estão sem nenhum cuidado registrado há mais de 21 dias. Em ${ano} foram registrados ${int(I.ano_.plantadas)} plantios e ${int(I.ano_.cuidados)} regas e adubações.</p>
      ${obras.length ? `<h3>Plantio compensatório de obras</h3>
      ${tabela(['Empreendimento', 'Responsável', 'Mudas', 'Sobrevivência', 'Mortas', 'Garantia até'], obras.map(({ e, r }) => [esc(e.nome), esc(e.responsavel), int(r.mudas.length), r.sobrev + '%', int(r.cont.morta), `${r.fim.toLocaleDateString('pt-BR')}${r.diasGarantia < 0 ? ' <b class="rel-alerta">(vencida)</b>' : ''}`]), [2, 3, 4])}` : ''}
    </section>

    ${podeCh ? `<section>
      <h2>5. Chamados</h2>
      <p>${int(I.ano_.chamados)} chamados abertos em ${ano} e ${int(I.ano_.concluidos)} concluídos. Hoje há ${int(I.chamados.ativos)} em aberto, ${int(I.chamados.dezDias)} deles há 10 dias ou mais.</p>
      ${tabela(['Tipo (chamados em aberto)', 'Quantidade'], tipos.map(([t, n]) => [esc(CH.TIPOS[t] || t), int(n)]), [1])}
    </section>` : ''}

    ${G ? `<section>
      <h2>${podeCh ? 6 : 5}. Gastos</h2>
      <p>Orçamento de ${G.ano}: ${brl(G.total)}. Executado no ano: ${brl(G.exec)} (${G.total ? Math.round((G.exec / G.total) * 100) : 0}%), ou ${brl(G.porArvoreViva)} por árvore viva. Estimativa do valor perdido em mudas mortas: ${brl(G.perdidoMudas)} (${brl(G.custoMuda)} por reposição).</p>
      ${tabela(['Categoria', 'Orçado', 'Executado', '%'], G.porCat.map((c) => [esc(c.nome), brl(c.orcado), brl(c.executado), c.orcado ? Math.round((c.executado / c.orcado) * 100) + '%' : '—']), [1, 2, 3])}
    </section>` : ''}

    <section>
      <h2>${5 + (podeCh ? 1 : 0) + (G ? 1 : 0)}. Tree Cities of the World (Arbor Day Foundation e FAO/ONU)</h2>
      <p>O programa reconhece cidades que cumprem 5 padrões. Situação em relação ao que o sistema registra:</p>
      ${tabela(['Padrão', 'Situação'], [
        ['1. Responsabilidade pelas árvores definida', 'A comprovar pela prefeitura (ato que define o órgão responsável).'],
        ['2. Regras para o manejo (lei, manual ou plano)', 'A comprovar pela prefeitura.'],
        ['3. Inventário ou avaliação atualizada', total ? `<b>Atendido pelo sistema:</b> inventário com ${int(total)} árvores, ${int(D.especies.length)} espécies e vistoria técnica em ${pct(I.risco.vistoriadas)}.` : 'Inventário ainda vazio.'],
        ['4. Orçamento dedicado', G ? `<b>Registrado no sistema:</b> ${brl(G.total)} em ${G.ano}.` : 'A comprovar pela prefeitura.'],
        ['5. Celebração anual com a comunidade', 'A comprovar pela prefeitura (ex.: mutirões do Agente do Futuro).']
      ])}
    </section>

    <section class="rel-notas">
      <h2>Notas de método</h2>
      <p>Risco de queda: nota de 0 a 100 calculada a partir da última vistoria técnica (defeitos observados × tamanho da árvore × ocupação embaixo dela). Classes: baixo (até 24), moderado (25 a 49), alto (50 a 74) e crítico (75 ou mais). Os pesos são referências e devem ser validados por engenheiro agrônomo ou florestal.</p>
      <p>Calendário de vistoria: 24 meses para risco baixo, 12 para moderado, 3 para alto e 1 para crítico; no máximo 12 meses para árvores grandes (DAP a partir de 50 cm ou altura a partir de 12 m) ou em locais de muito movimento.</p>
      <p>Diversidade: regra de referência da silvicultura urbana (no máximo 10% de uma espécie e 20% de um gênero), contando só árvores vivas e identificadas.</p>
    </section>`;
  }

  function gerar() {
    if (!Arbo.pode('ver_painel')) return;
    const ano = new Date().getFullYear();
    el.innerHTML = montar(ano);
    const titulo = document.title;
    document.title = `Relatório arborização ${ano} · ${Arbo.CONFIG.cidade}`;
    document.body.classList.add('imprimindo-relatorio');
    Arbo.auditar('Gerou relatório anual', String(ano));
    // alguns navegadores de celular não avisam o fim da impressão: o botão "Voltar ao sistema" resolve
    el.removeAttribute('aria-hidden');
    const fim = () => { document.body.classList.remove('imprimindo-relatorio'); el.setAttribute('aria-hidden', 'true'); document.title = titulo; window.removeEventListener('afterprint', fim); setTimeout(() => A.mapa.invalidateSize(), 0); };
    window.addEventListener('afterprint', fim);
    el.querySelector('[data-fechar-rel]').onclick = fim;
    el.querySelector('[data-imprimir-rel]').onclick = () => window.print();
    setTimeout(() => { window.print(); }, 50);
  }
  A.gerarRelatorio = gerar;
  A.montarRelatorio = montar; // usado nos testes

  document.addEventListener('click', (e) => { if (e.target.closest('[data-relatorio]')) gerar(); });
})();
