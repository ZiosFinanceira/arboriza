// Obras e compensação ambiental (TCA): acompanha as mudas plantadas por construtoras,
// o prazo de manutenção obrigatória e a sobrevivência de cada empreendimento.
(function () {
  const A = Arbo.app, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.empreendimentos';
  const pl = (n, p) => `${n} ${p}${n === 1 ? '' : 's'}`;
  let emps = carregar();

  function carregar() {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { /* sem storage */ }
    return Arbo.seedEmpreendimentos();
  }
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(emps)); } catch (e) { /* ignora */ } }

  function fimGarantia(e) {
    const d = new Date(e.plantio + 'T12:00:00'); d.setMonth(d.getMonth() + e.mesesGarantia); return d;
  }
  function resumo(e) {
    const mudas = A.arvores.filter((a) => a.empreendimento === e.id);
    const cont = { viva: 0, estressada: 0, morta: 0, substituida: 0 };
    mudas.forEach((a) => cont[a.saude || 'viva']++);
    const abandonadas = mudas.filter((a) => Arbo.engine.abandono(a, A.hoje)).length;
    const fim = fimGarantia(e);
    const diasGarantia = Math.round((fim - A.hoje) / 86400000);
    const sobrev = mudas.length ? Math.round(((cont.viva + cont.estressada) / mudas.length) * 100) : 0;
    return { mudas, cont, abandonadas, fim, diasGarantia, sobrev };
  }

  function situacaoGarantia(r) {
    if (r.diasGarantia < 0) return { cls: 'vencida', txt: `Garantia vencida há ${-r.diasGarantia} dias. A muda ficou sem responsável.` };
    if (r.diasGarantia <= 60) return { cls: 'vencendo', txt: `Garantia vence em ${r.diasGarantia} dias. Vistoriar antes do recebimento.` };
    return { cls: 'ok', txt: `Construtora responsável pela manutenção até ${r.fim.toLocaleDateString('pt-BR')}.` };
  }

  function render() {
    const todas = emps.map((e) => ({ e, r: resumo(e) }));
    const total = todas.reduce((s, x) => s + x.r.mudas.length, 0);
    const mortas = todas.reduce((s, x) => s + x.r.cont.morta, 0);
    const vencidas = todas.filter((x) => x.r.diasGarantia < 0).length;
    $('#kpis-obras').innerHTML = `
      <div class="kpi"><b>${emps.length}</b><span>obras</span></div>
      <div class="kpi"><b>${total}</b><span>mudas de obra</span></div>
      <div class="kpi vermelho"><b>${mortas}</b><span>mortas</span></div>
      <div class="kpi ${vencidas ? 'vermelho' : ''}"><b>${vencidas}</b><span>garantia vencida</span></div>`;
    $('#lista-obras').innerHTML = todas.map(({ e, r }) => {
      const g = situacaoGarantia(r), n = r.mudas.length || 1;
      const seg = (v, cor) => (v ? `<div style="width:${(v / n) * 100}%;background:${cor}" title="${v}"></div>` : '');
      return `<li class="obra" data-emp="${e.id}">
        <div class="nome">${esc(e.nome)}</div>
        <div class="sub">${esc(e.responsavel)} · ${esc(e.tca)}</div>
        <div class="sub">Plantio em ${fmtData(e.plantio)} · ${e.situacao === 'obra' ? 'obra em andamento' : 'empreendimento entregue'}</div>
        <div class="barra-saude">${seg(r.cont.viva, '#2e7d32')}${seg(r.cont.estressada, '#f9a825')}${seg(r.cont.morta, '#6d4c41')}${seg(r.cont.substituida, '#90a4ae')}</div>
        <div class="sub"><b>${r.sobrev}% sobrevivência</b> · ${pl(r.cont.viva, 'viva')} · ${pl(r.cont.estressada, 'estressada')} · ${pl(r.cont.morta, 'morta')}${r.abandonadas ? ` · <b style="color:#c62828">${pl(r.abandonadas, 'abandonada')}</b>` : ''}</div>
        <div class="garantia ${g.cls}">${g.txt}</div>
        <div class="acoes">
          <button class="btn" data-obra="ver">Ver no mapa</button>
          <button class="btn" data-obra="notificar" data-perm="notificar_obras">Gerar notificação</button>
        </div>
      </li>`;
    }).join('');
  }

  $('#lista-obras').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-obra]'); if (!b) return;
    const e = emps.find((x) => x.id === b.closest('.obra').dataset.emp), r = resumo(e);
    if (b.dataset.obra === 'ver' && r.mudas.length) {
      const lat = r.mudas.reduce((s, a) => s + a.lat, 0) / r.mudas.length, lng = r.mudas.reduce((s, a) => s + a.lng, 0) / r.mudas.length;
      A.mapa.setView([lat, lng], 18);
    }
    if (b.dataset.obra === 'notificar') abrirNotificacao(e, r);
  });

  function abrirNotificacao(e, r) {
    const mortas = r.mudas.filter((a) => a.saude === 'morta');
    const estress = r.mudas.filter((a) => a.saude === 'estressada');
    const lista = (arr) => arr.map((a) => `  - ${(Arbo.ESPECIES[a.especie] || {}).nome} · ${a.endereco} · (${a.lat.toFixed(5)}, ${a.lng.toFixed(5)})`).join('\n');
    const vencida = r.diasGarantia < 0;
    $('#txt-notificacao').value =
`Assunto: Plantio compensatório – ${e.tca} – ${e.nome}

Prezados(as) ${e.responsavel},

Em vistoria de ${new Date().toLocaleDateString('pt-BR')}, das ${r.mudas.length} mudas do plantio compensatório referente ao ${e.tca}, foram constatadas:
- ${r.cont.morta} muda(s) morta(s)/seca(s):
${lista(mortas) || '  (nenhuma)'}
- ${r.cont.estressada} muda(s) com sinais de estresse:
${lista(estress) || '  (nenhuma)'}

Taxa de sobrevivência atual: ${r.sobrev}%.
${vencida
  ? `O período de manutenção previsto (${e.mesesGarantia} meses) terminou em ${r.fim.toLocaleDateString('pt-BR')}. Solicitamos manifestação sobre a reposição das mudas antes do recebimento definitivo.`
  : `O período de manutenção sob responsabilidade do compromissário vai até ${r.fim.toLocaleDateString('pt-BR')}. Solicitamos a substituição das mudas mortas e a regularização da rega e da adubação em até 30 dias.`}

Atenciosamente,
[Setor responsável – Prefeitura]`;
    $('#dlg-notificacao').showModal();
    $('#txt-notificacao').scrollTop = 0;
    $('#btn-copiar-notif').focus();
  }
  $('#btn-copiar-notif').onclick = async () => {
    try { await navigator.clipboard.writeText($('#txt-notificacao').value); $('#btn-copiar-notif').textContent = 'Texto copiado'; }
    catch (e) { $('#txt-notificacao').select(); }
    setTimeout(() => ($('#btn-copiar-notif').textContent = 'Copiar texto'), 1500);
  };
  $('#btn-fechar-notif').onclick = () => $('#dlg-notificacao').close();

  // cartão extra na ficha da árvore
  A.detalhe.push({
    html(a) {
      if (!a.empreendimento) return '';
      const e = emps.find((x) => x.id === a.empreendimento); if (!e) return '';
      const g = situacaoGarantia(resumo(e));
      return `<div class="cartao"><h4>Compensação ambiental</h4>
        <p style="margin:0;font-size:14px"><b>${esc(e.nome)}</b><br>${esc(e.responsavel)}<br>${esc(e.tca)}</p>
        <div class="garantia ${g.cls}">${g.txt}</div></div>`;
    }
  });

  A.empreendimento = (id) => emps.find((x) => x.id === id);
  A.renderers.push(render);
  A.aoRestaurar.push(() => { emps = Arbo.seedEmpreendimentos(); salvar(); });
  salvar();
  render();
})();
