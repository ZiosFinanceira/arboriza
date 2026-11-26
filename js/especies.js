// Espécie certa para cada calçada.
// Regras puras (sem DOM): recebem a largura da calçada e se há fiação aérea e dizem que porte cabe
// e quais espécies do catálogo servem, com o motivo. A interface fica no fim do arquivo.
// Os LIMITES abaixo são REFERÊNCIAS inspiradas em manuais municipais de arborização: cada cidade tem o seu,
// então ajuste PARAMS ao manual do município antes de usar em decisão real.
window.Arbo = window.Arbo || {};

(function () {
  const PARAMS = {
    // largura mínima da calçada (m) para cada porte; abaixo do menor valor, não plantar no passeio
    larguraMin: { pequeno: 1.5, medio: 2.0, grande: 2.5 },
    // com fiação aérea em cima, só porte pequeno (a copa adulta não pode alcançar a rede)
    portesComFiacao: ['pequeno'],
    // faixa livre que precisa sobrar para o pedestre ao lado do canteiro (m), só para o texto de orientação
    faixaLivre: 1.2
  };
  const ORDEM = ['pequeno', 'medio', 'grande'];
  const NOME_PORTE = { pequeno: 'pequeno', medio: 'médio', grande: 'grande' };

  const num = (v) => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return isFinite(n) && n > 0 ? n : null; };

  // fiacao: true | false | null (não sabe)
  function portesPermitidos(largura, fiacao) {
    const L = num(largura);
    if (L == null) return { ok: null, portes: [], motivo: 'Informe a largura da calçada para saber o que cabe.' };
    let portes = ORDEM.filter((p) => L >= PARAMS.larguraMin[p]);
    if (!portes.length) {
      return { ok: false, portes: [], motivo: `Calçada de ${L.toLocaleString('pt-BR')} m é estreita demais para árvore no passeio (mínimo ${PARAMS.larguraMin.pequeno.toLocaleString('pt-BR')} m). Prefira canteiro central, praça ou jardim do lote.` };
    }
    const partes = [`Calçada de ${L.toLocaleString('pt-BR')} m comporta até porte ${NOME_PORTE[portes[portes.length - 1]]}`];
    if (fiacao === true) {
      portes = portes.filter((p) => PARAMS.portesComFiacao.includes(p));
      partes.push('com fiação aérea, só porte pequeno');
    } else if (fiacao == null) {
      partes.push('confirme se há fiação: se houver, só porte pequeno');
    }
    return { ok: true, portes, motivo: partes.join('; ') + '.' };
  }

  // Lista todas as espécies do catálogo com a avaliação para o local, as que servem primeiro (nativas antes)
  function recomendar(especies, largura, fiacao) {
    const lim = portesPermitidos(largura, fiacao);
    const lista = Object.entries(especies).filter(([k]) => k !== 'desconhecida').map(([k, e]) => {
      const motivos = [];
      if (!e.calcada) motivos.push('inadequada para calçada' + (e.obs ? `: ${e.obs}` : ''));
      if (lim.ok === false) motivos.push('calçada estreita demais');
      else if (lim.ok && !lim.portes.includes(e.porte)) motivos.push(fiacao === true && e.porte !== 'pequeno' ? `porte ${NOME_PORTE[e.porte]} sob fiação` : `porte ${NOME_PORTE[e.porte]} não cabe nesta largura`);
      const serve = lim.ok === true && motivos.length === 0;
      return { id: k, nome: e.nome, cientifico: e.cientifico, porte: e.porte, nativa: e.origem === 'nativa', serve, motivos };
    });
    lista.sort((a, b) => (b.serve - a.serve) || (b.nativa - a.nativa) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return { ...lim, lista, servem: lista.filter((x) => x.serve) };
  }

  // Confere uma árvore já cadastrada contra o local dela (se a ficha tiver largura e fiação)
  function conferir(arv, especies) {
    if (num(arv.larguraCalcada) == null && arv.fiacaoAerea == null) return null;
    const e = especies[arv.especie]; if (!e || arv.especie === 'desconhecida') return null;
    const r = recomendar(especies, arv.larguraCalcada, arv.fiacaoAerea);
    const item = r.lista.find((x) => x.id === arv.especie);
    return { serve: item ? item.serve : null, motivos: item ? item.motivos : [], limite: r };
  }

  Arbo.especieCerta = { PARAMS, NOME_PORTE, portesPermitidos, recomendar, conferir };

  // ================= interface (só no navegador) =================
  if (typeof document === 'undefined' || !document.querySelector('#form-arvore')) return;
  const A = Arbo.app, { esc } = A;
  const $ = (s) => document.querySelector(s);
  // exemplos: completa largura e fiação nas árvores de demonstração que ainda não têm (sem mexer no resto)
  const exemplo = () => {
    let mudou = false;
    A.arvores.forEach((a) => { const l = (Arbo.LOCAL_EXEMPLO || {})[a.id]; if (l && a.larguraCalcada === undefined) { a.larguraCalcada = l[0]; a.fiacaoAerea = l[1]; mudou = true; } });
    if (mudou) A.salvar();
  };
  exemplo();
  A.aoRestaurar.push(exemplo);
  const fiacaoDe = (v) => (v === 'sim' ? true : v === 'nao' ? false : null);

  // Caixa de recomendação reutilizável: devolve HTML com as espécies que servem
  function caixa(largura, fiacao, limite) {
    const r = recomendar(Arbo.ESPECIES, largura, fiacao);
    if (r.ok == null) return `<p class="ajuda">${esc(r.motivo)}</p>`;
    if (!r.ok) return `<p class="alerta-esp">${esc(r.motivo)}</p>`;
    const top = r.servem.slice(0, limite || 6);
    return `<p class="ajuda">${esc(r.motivo)}</p>
      ${top.length ? `<ul class="esp-lista">${top.map((x) => `<li><b>${esc(x.nome)}</b> <i>${esc(x.cientifico)}</i><span class="esp-tag ${x.nativa ? 'nativa' : ''}">${x.nativa ? 'nativa' : 'exótica'} · ${esc(NOME_PORTE[x.porte])}</span></li>`).join('')}</ul>`
        : '<p class="alerta-esp">Nenhuma espécie do catálogo serve para este local.</p>'}`;
  }
  A.caixaEspecies = caixa;
  A.recomendarEspecies = (l, f) => recomendar(Arbo.ESPECIES, l, f);

  // 1) Formulário de mapear árvore: largura + fiação, lista recomendada e aviso se a espécie escolhida não serve
  const f = $('#form-arvore');
  function atualizarForm() {
    const fi = fiacaoDe(f.fiacao.value), r = recomendar(Arbo.ESPECIES, f.largura.value, fi);
    $('#rec-especies').innerHTML = caixa(f.largura.value, fi, 5);
    const atual = f.especie.value;
    // reordena o seletor: as que servem primeiro, marcando as que não servem
    f.especie.innerHTML = r.lista.map((x) => `<option value="${x.id}">${esc(x.nome)}${r.ok && !x.serve ? ' (não recomendada aqui)' : ''}</option>`).join('') + '<option value="desconhecida">Não identificada</option>';
    f.especie.value = atual && [...f.especie.options].some((o) => o.value === atual) ? atual : (r.servem[0] ? r.servem[0].id : 'desconhecida');
    const sel = r.lista.find((x) => x.id === f.especie.value);
    $('#aviso-especie').textContent = r.ok && sel && !sel.serve ? `Atenção: ${sel.nome} não é recomendada aqui (${sel.motivos.join('; ')}). Se a árvore já existe, pode salvar assim mesmo.` : '';
  }
  ['largura', 'fiacao'].forEach((n) => f[n].addEventListener('input', atualizarForm));
  f.especie.addEventListener('change', () => { const r = recomendar(Arbo.ESPECIES, f.largura.value, fiacaoDe(f.fiacao.value)); const sel = r.lista.find((x) => x.id === f.especie.value); $('#aviso-especie').textContent = r.ok && sel && !sel.serve ? `Atenção: ${sel.nome} não é recomendada aqui (${sel.motivos.join('; ')}). Se a árvore já existe, pode salvar assim mesmo.` : ''; });
  A.aoAbrirFormArvore = () => { $('#rec-especies').innerHTML = caixa('', null); $('#aviso-especie').textContent = ''; };
  A.dadosLocalForm = () => ({ larguraCalcada: f.largura.value ? Number(String(f.largura.value).replace(',', '.')) : null, fiacaoAerea: fiacaoDe(f.fiacao.value) });

  // 2) Ficha da árvore: confere a espécie com o local
  A.detalhe.push({
    html(a) {
      const c = conferir(a, Arbo.ESPECIES);
      if (!c) return '';
      const local = `${a.larguraCalcada ? `calçada de ${Number(a.larguraCalcada).toLocaleString('pt-BR')} m` : 'largura não informada'} · ${a.fiacaoAerea === true ? 'com fiação' : a.fiacaoAerea === false ? 'sem fiação' : 'fiação não informada'}`;
      return `<div class="cartao"><h4>Espécie e local</h4><p class="ajuda" style="margin-bottom:6px">${esc(local)}</p>
        ${c.serve ? '<p class="garantia ok">A espécie é adequada para este local.</p>'
          : `<p class="garantia vencendo">Espécie não recomendada para este local: ${esc(c.motivos.join('; '))}. Acompanhe com poda de condução e, na substituição, prefira uma das indicadas abaixo.</p>${caixa(a.larguraCalcada, a.fiacaoAerea, 4)}`}</div>`;
    }
  });

  // 3) Agente do Futuro: "Qual árvore cabe na minha calçada?"
  const blocoAg = $('#agente-especie');
  if (blocoAg) {
    blocoAg.innerHTML = `<div class="campos-2"><label class="campo">Largura da calçada (m)<input id="ag-larg" inputmode="decimal" placeholder="Ex.: 2,2"></label>
      <label class="campo">Tem fiação em cima?<select id="ag-fia"><option value="">Não sei</option><option value="sim">Sim</option><option value="nao">Não</option></select></label></div>
      <div id="ag-rec"><p class="ajuda">Meça da parede ou do muro até o meio-fio.</p></div>
      <p class="ajuda">Plantar na calçada pública depende de autorização da prefeitura. Use a sugestão de local para pedir.</p>`;
    const up = () => ($('#ag-rec').innerHTML = caixa($('#ag-larg').value, fiacaoDe($('#ag-fia').value), 6));
    $('#ag-larg').addEventListener('input', up); $('#ag-fia').addEventListener('change', up);
  }
})();
