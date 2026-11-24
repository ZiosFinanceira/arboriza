// Gastos: orçamento anual por categoria, despesas lançadas e distribuição por região.
// Valores FICTÍCIOS, só para o protótipo. Quem lança despesa: Financeiro e Administração.
// Quem altera o orçamento: só Administração. Os demais perfis com acesso só leem.
(function () {
  const A = Arbo.app, { esc } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.gastos';
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const CAT = {
    rega: 'Rega (caminhão-pipa e combustível)', mudas: 'Mudas e plantio', insumos: 'Adubo e insumos',
    manejo: 'Poda e remoção', tecnologia: 'Sensores e tecnologia', pessoal: 'Equipes de campo (terceirizadas)'
  };
  const REGIOES = ['Recife Antigo', 'Santo Antônio', 'São José', 'Boa Vista', 'Santo Amaro'];
  const CUSTO_MUDA = 350; // reposição de uma muda (muda + plantio + tutor), estimativa para o indicador

  function semente() {
    const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return t.toISOString().slice(0, 10); };
    const desp = [
      [3, 'rega', 'Abastecimento caminhão-pipa (semana)', 'Recife Antigo', 4800, 'Contrato 012/2026'],
      [5, 'manejo', 'Remoção de árvore caída — R. do Brum', 'Recife Antigo', 6200, 'OS de emergência'],
      [9, 'mudas', 'Lote de 120 mudas nativas', 'Santo Antônio', 18600, 'Viveiro (exemplo)'],
      [12, 'pessoal', 'Medição mensal equipes de campo', 'Recife Antigo', 41500, 'Contrato 004/2026'],
      [15, 'insumos', 'Composto orgânico (4 t)', 'Boa Vista', 7400, 'Ata de registro de preços'],
      [20, 'tecnologia', 'Sensores de umidade (lote piloto)', 'Recife Antigo', 12900, 'Projeto piloto'],
      [26, 'manejo', 'Podas programadas — mês', 'São José', 23800, 'Contrato 009/2026'],
      [33, 'rega', 'Abastecimento caminhão-pipa (mês)', 'Santo Antônio', 15200, 'Contrato 012/2026'],
      [41, 'pessoal', 'Medição mensal equipes de campo', 'Santo Antônio', 41500, 'Contrato 004/2026'],
      [55, 'mudas', 'Replantio de mudas mortas (obras)', 'Recife Antigo', 9800, 'Ressarcimento em cobrança'],
      [70, 'manejo', 'Podas programadas — mês', 'Boa Vista', 21900, 'Contrato 009/2026'],
      [85, 'rega', 'Abastecimento caminhão-pipa (mês)', 'São José', 14700, 'Contrato 012/2026'],
      [100, 'insumos', 'Tutores e protetores de muda', 'Santo Amaro', 8300, 'Ata de registro de preços'],
      [120, 'pessoal', 'Medição mensal equipes de campo', 'Boa Vista', 41500, 'Contrato 004/2026']
    ].map(([dias, cat, desc, reg, valor, ref], i) => ({ id: 'dp-' + (i + 1), data: d(dias), cat, desc, regiao: reg, valor, ref, por: 'Financeiro (exemplo)' }));
    return { ano: new Date().getFullYear(), orcamento: { rega: 280000, mudas: 220000, insumos: 60000, manejo: 340000, tecnologia: 90000, pessoal: 510000 }, despesas: desp };
  }
  let g = carregar();
  function carregar() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { /* vazio */ } return semente(); }
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { /* ignora */ } }

  function render() {
    const total = Object.values(g.orcamento).reduce((s, v) => s + v, 0);
    const exec = g.despesas.reduce((s, d) => s + d.valor, 0);
    const porCat = {}; Object.keys(CAT).forEach((k) => (porCat[k] = 0)); g.despesas.forEach((d) => (porCat[d.cat] += d.valor));
    const porReg = {}; REGIOES.forEach((r) => (porReg[r] = 0)); g.despesas.forEach((d) => (porReg[d.regiao] = (porReg[d.regiao] || 0) + d.valor));
    const vivas = A.arvores.filter((a) => a.saude !== 'morta' && a.origem !== 'planejada').length;
    const mortas = A.arvores.filter((a) => a.saude === 'morta').length;
    const maxReg = Math.max(...Object.values(porReg), 1);
    $('#kpis-gastos').innerHTML = `
      <div class="kpi"><b>${brl(total / 1000).replace(/\s/g, '')}k</b><span>orçamento ${g.ano}</span></div>
      <div class="kpi"><b>${Math.round((exec / total) * 100)}%</b><span>executado (${brl(exec / 1000).replace(/\s/g, '')}k)</span></div>
      <div class="kpi"><b>${brl(exec / Math.max(vivas, 1)).replace(/\s/g, '')}</b><span>por árvore viva</span></div>
      <div class="kpi vermelho"><b>${brl((mortas * CUSTO_MUDA) / 1000).replace(/\s/g, '')}k</b><span>perdido em mudas mortas</span></div>`;
    $('#gastos-categorias').innerHTML = Object.entries(CAT).map(([k, nome]) => {
      const plan = g.orcamento[k], e = porCat[k], pct = plan ? Math.min(100, (e / plan) * 100) : 0;
      return `<li class="barra-cat">
        <div class="barra-topo"><span>${esc(nome)}</span><b>${Math.round(pct)}%</b></div>
        <div class="barra-trilho"><div style="width:${pct}%" class="${pct > 90 ? 'alerta' : ''}"></div></div>
        <div class="barra-pe"><span>${brl(e)} de</span>
          <input type="number" min="0" step="1000" value="${plan}" data-orc="${k}" data-perm="editar_orcamento" aria-label="Orçamento de ${esc(nome)}"></div>
      </li>`;
    }).join('');
    $('#gastos-regioes').innerHTML = Object.entries(porReg).sort((a, b) => b[1] - a[1]).map(([r, v]) => `
      <li class="barra-reg"><span>${esc(r)}</span><div class="barra-trilho"><div style="width:${(v / maxReg) * 100}%"></div></div><b>${brl(v)}</b></li>`).join('');
    $('#gastos-lancamentos').innerHTML = g.despesas.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12).map((d) => `
      <tr><td>${A.fmtData(d.data)}</td><td>${esc(d.desc)}<small>${esc(CAT[d.cat])} · ${esc(d.regiao)}${d.ref ? ' · ' + esc(d.ref) : ''}</small></td><td class="num">${brl(d.valor)}</td></tr>`).join('');
    document.querySelectorAll('[data-orc]').forEach((inp) => (inp.onchange = () => {
      const k = inp.dataset.orc, antes = g.orcamento[k]; g.orcamento[k] = Math.max(0, +inp.value || 0); salvar();
      Arbo.auditar('Alterou orçamento', `${CAT[k]}: ${brl(antes)} → ${brl(g.orcamento[k])}`); render();
    }));
  }

  $('#btn-despesa').onclick = () => {
    const f = $('#form-despesa'); f.reset(); f.data.value = A.hojeISO();
    $('#sel-desp-cat').innerHTML = Object.entries(CAT).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
    $('#sel-desp-reg').innerHTML = REGIOES.map((r) => `<option>${esc(r)}</option>`).join('');
    $('#dlg-despesa').returnValue = ''; $('#dlg-despesa').showModal(); // Esc não reaproveita o último "ok"
  };
  $('#btn-cancelar-desp').onclick = () => $('#dlg-despesa').close('cancel');
  $('#dlg-despesa').addEventListener('close', () => {
    if ($('#dlg-despesa').returnValue !== 'ok') return;
    const f = $('#form-despesa'), ses = Arbo.sessao();
    const d = { id: 'dp-' + Date.now().toString(36), data: f.data.value, cat: f.cat.value, desc: f.desc.value.trim(), regiao: f.regiao.value, valor: Math.round(+f.valor.value * 100) / 100, ref: f.ref.value.trim(), por: ses.nome };
    g.despesas.push(d); salvar();
    Arbo.auditar('Lançou despesa', `${d.desc} · ${brl(d.valor)}`);
    A.toast('Despesa lançada'); render();
  });

  // resumo usado pelo relatório anual (js/relatorio.js)
  A.resumoGastos = () => {
    const total = Object.values(g.orcamento).reduce((s, v) => s + v, 0);
    const doAno = g.despesas.filter((d) => String(d.data).slice(0, 4) === String(g.ano));
    const exec = doAno.reduce((s, d) => s + d.valor, 0);
    const porCat = Object.entries(CAT).map(([k, nome]) => ({ nome, orcado: g.orcamento[k] || 0, executado: doAno.filter((d) => d.cat === k).reduce((s, d) => s + d.valor, 0) }));
    const vivas = A.arvores.filter((a) => a.saude !== 'morta' && a.origem !== 'planejada').length;
    const mortas = A.arvores.filter((a) => a.saude === 'morta').length;
    return { ano: g.ano, total, exec, porCat, porArvoreViva: exec / Math.max(vivas, 1), perdidoMudas: mortas * CUSTO_MUDA, custoMuda: CUSTO_MUDA };
  };
  A.renderers.push(() => { if (A.abaAtiva() === 'gastos') render(); });
  A.aoRestaurar.push(() => { g = semente(); salvar(); });
})();
