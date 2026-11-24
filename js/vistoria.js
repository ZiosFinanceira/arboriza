// Vistoria técnica e risco de queda na interface: cartão na ficha da árvore, formulário de vistoria,
// alerta no mapa para risco alto ou crítico e atalho para abrir o chamado. As regras ficam em js/risco.js.
(function () {
  const A = Arbo.app, R = Arbo.risco, { esc, fmtData } = A;
  const $ = (s) => document.querySelector(s);
  const especie = (a) => Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida;
  const marcadores = [];
  let alvo = null; // árvore da vistoria em edição
  const NOME_TAM = { pequena: 'pequena', media: 'média', grande: 'grande' };
  const NOME_ALVO = { baixa: 'baixa', media: 'média', alta: 'alta' };

  // atalhos usados pelo Painel, pelo relatório e pelo CSV
  A.risco = (a) => R.avaliar(a, especie(a), A.hoje);
  A.proximaVistoria = (a) => R.proximaVistoria(a, especie(a), A.hoje);

  const op = (obj) => Object.entries(obj).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('#sel-vist-cavidade').innerHTML = op(R.OPCOES.cavidade);
  $('#sel-vist-raizes').innerHTML = op(R.OPCOES.raizes);
  $('#sel-vist-alvo').innerHTML = op(R.OPCOES.alvo);

  function selo(r) {
    const c = R.CLASSES[r.classe];
    return `<span class="selo-risco ${r.classe}" style="--cor:${c.cor}">${r.pontos == null ? esc(c.nome) : `${r.pontos} · ${esc(c.nome)}`}</span>`;
  }
  A.seloRisco = selo;

  function textoProxima(p) {
    if (!p) return '';
    if (p.pendente) return '<span class="vencida">Pendente: esta árvore nunca teve vistoria técnica.</span>';
    const dias = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
    if (p.vencida) return `<span class="vencida">Vencida desde ${fmtData(p.data)} (${dias(-p.dias)}).</span>`;
    return `${fmtData(p.data)} <span class="ajuda">(${p.dias === 0 ? 'hoje' : 'em ' + dias(p.dias)} · ciclo de ${p.meses} ${p.meses === 1 ? 'mês' : 'meses'})</span>`;
  }

  function temChamadoRisco(a) {
    return A.chamados.some((c) => c.arvoreId === a.id && c.tipo === 'risco-queda' && c.status !== 'concluido');
  }

  // ---------- cartão na ficha da árvore ----------
  A.detalhe.push({
    html(a) {
      if (!R.contaComoArvore(a)) return '';
      const r = A.risco(a), p = A.proximaVistoria(a), v = r.vistoria;
      const grave = r.classe === 'alto' || r.classe === 'critico';
      const hist = (Array.isArray(a.vistorias) ? a.vistorias : []).filter((x) => x && R.dataOk(x.data)).sort((x, y) => y.data.localeCompare(x.data));
      return `<div class="cartao cartao-risco ${grave ? 'grave' : ''}">
        <h4>Risco de queda e vistoria</h4>
        <div class="risco-topo">${selo(r)}${r.pontos != null ? `<div class="medidor"><div class="barra" style="width:${r.pontos}%;background:${R.CLASSES[r.classe].cor}"></div></div>` : ''}</div>
        ${v ? `
          ${r.motivos.length ? `<ul class="motivos">${r.motivos.map((m) => `<li><span>${esc(m.texto)}</span><b>+${m.pontos}</b></li>`).join('')}</ul>
            <p class="ajuda">Soma × ${r.fator.toLocaleString('pt-BR')} (árvore ${NOME_TAM[r.tamanho]}, ocupação embaixo ${NOME_ALVO[v.alvo] || 'média'}).</p>`
            : '<p class="ajuda">Nenhum defeito registrado na última vistoria.</p>'}
          <dl class="dl" style="margin-top:8px">
            <dt>Última vistoria</dt><dd>${fmtData(v.data)} · ${esc(v.por || '—')}</dd>
            <dt>DAP / altura</dt><dd>${v.dap != null && v.dap !== '' ? esc(v.dap) + ' cm' : '—'} / ${v.altura != null && v.altura !== '' ? esc(v.altura) + ' m' : '—'}</dd>
            <dt>Última poda</dt><dd>${fmtData(v.ultimaPoda)}</dd>
            <dt>Próxima vistoria</dt><dd>${textoProxima(p)}</dd>
          </dl>
          ${v.obs ? `<p class="ajuda" style="margin-top:6px">${esc(v.obs)}</p>` : ''}`
        : `<p class="ajuda" style="margin-top:6px">${textoProxima(p)} Registre DAP, altura e defeitos para calcular o risco.</p>`}
        ${grave && temChamadoRisco(a) ? '<p class="ajuda" style="margin-top:6px">Já existe chamado de risco de queda aberto para esta árvore.</p>' : ''}
        <div class="acoes">
          <button class="btn primario" data-vist="nova" data-perm="registrar_vistoria">Registrar vistoria</button>
          ${grave && !temChamadoRisco(a) ? '<button class="btn" data-vist="chamado" data-perm="abrir_chamado">Abrir chamado de risco</button>' : ''}
          ${A.abrirPlaca ? '<button class="btn" data-vist="placa" data-perm="gerar_placa">Placa com QR Code</button>' : ''}
        </div>
        ${hist.length > 1 ? `<details class="regras" style="margin-top:10px"><summary>Vistorias anteriores (${hist.length - 1}${hist.length > 6 ? ', mostrando as 5 últimas' : ''})</summary>
          ${hist.slice(1, 6).map((h) => { const rh = R.avaliar({ ...a, vistorias: [h] }, especie(a), A.hoje); return `<p>${fmtData(h.data)} · ${esc(h.por || '')} · ${rh.pontos} pts (${esc(R.CLASSES[rh.classe].nome)})</p>`; }).join('')}</details>` : ''}
      </div>`;
    },
    bind(a, d) {
      d.querySelectorAll('[data-vist]').forEach((b) => (b.onclick = () => {
        const t = b.dataset.vist;
        if (t === 'nova') abrirForm(a);
        if (t === 'placa') A.abrirPlaca(a);
        if (t === 'chamado') {
          const r = A.risco(a);
          A.abrirFormChamado({ arvoreId: a.id, tipo: 'risco-queda', risco: r.classe === 'critico' ? 'urgente' : 'alto', origem: 'vistoria',
            descricao: `Vistoria de ${fmtData(r.vistoria.data)}: risco ${R.CLASSES[r.classe].nome.toLowerCase()} (${r.pontos} pontos). ${r.motivos.map((m) => m.texto).join('; ')}.` });
        }
      }));
    }
  });

  // ---------- formulário ----------
  function abrirForm(a) {
    alvo = a;
    const f = $('#form-vistoria'), v = R.ultimaVistoria(a);
    f.reset();
    $('#vist-arvore').textContent = `${especie(a).nome} · ${a.endereco || a.id}${v ? ` · os campos vêm da vistoria de ${fmtData(v.data)}` : ''}`;
    // parte da vistoria anterior: o que não mudou não precisa ser digitado de novo
    if (v) ['dap', 'altura', 'inclinacao', 'ultimaPoda'].forEach((k) => { if (v[k] != null && v[k] !== '') f[k].value = v[k]; });
    if (v) ['cavidade', 'raizes', 'alvo'].forEach((k) => { if (Object.prototype.hasOwnProperty.call(R.OPCOES[k], v[k])) f[k].value = v[k]; });
    if (v) ['inclinacaoRecente', 'rachadura', 'galhosSecos', 'praga', 'podaDrastica', 'fiacao'].forEach((k) => (f[k].checked = !!v[k]));
    else f.alvo.value = 'media';
    f.data.value = A.hojeISO();
    f.data.max = A.hojeISO();
    $('#dlg-vistoria').returnValue = ''; $('#dlg-vistoria').showModal(); // Esc não reaproveita o último "ok"
  }
  A.abrirVistoria = abrirForm;
  $('#btn-cancelar-vist').onclick = () => $('#dlg-vistoria').close('cancel');

  $('#dlg-vistoria').addEventListener('close', () => {
    if ($('#dlg-vistoria').returnValue !== 'ok' || !alvo) return;
    const f = $('#form-vistoria'), a = alvo; alvo = null;
    const n = (k, max) => { const x = f[k].value === '' ? null : +f[k].value; return x == null || isNaN(x) ? null : Math.max(0, Math.min(max, x)); };
    const v = {
      data: f.data.value || A.hojeISO(), por: (Arbo.sessao() || {}).nome || 'equipe',
      dap: n('dap', 500), altura: n('altura', 80), inclinacao: n('inclinacao', 90) || 0,
      inclinacaoRecente: f.inclinacaoRecente.checked, cavidade: f.cavidade.value, rachadura: f.rachadura.checked,
      raizes: f.raizes.value, galhosSecos: f.galhosSecos.checked, praga: f.praga.checked, podaDrastica: f.podaDrastica.checked,
      fiacao: f.fiacao.checked, alvo: f.alvo.value, ultimaPoda: f.ultimaPoda.value || null, obs: f.obs.value.trim()
    };
    a.vistorias = [...(Array.isArray(a.vistorias) ? a.vistorias : []), v];
    A.salvar();
    const r = A.risco(a);
    Arbo.auditar('Registrou vistoria técnica', `${a.id}: ${r.pontos} pts (${R.CLASSES[r.classe].nome})`);
    A.toast(r.vistoria === v ? `Vistoria salva · risco ${R.CLASSES[r.classe].nome.toLowerCase()} (${r.pontos} pts)` : 'Vistoria salva no histórico (há uma vistoria mais recente)');
    A.selecionar(a.id, false);
  });

  // ---------- mapa: alerta sobre as árvores de risco alto e crítico ----------
  function desenhar() {
    marcadores.forEach((m) => m.remove()); marcadores.length = 0;
    if (!Arbo.pode('ver_arvores')) return;
    A.filtradas().forEach((a) => {
      const r = A.risco(a);
      if (r.classe !== 'alto' && r.classe !== 'critico') return;
      const icon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [-2, 20],
        html: `<div class="pin-risco ${r.classe}" title="Risco ${R.CLASSES[r.classe].nome.toLowerCase()}">!</div>` });
      const m = L.marker([a.lat, a.lng], { icon, zIndexOffset: 1500, keyboard: false }).addTo(A.mapa);
      m.bindTooltip(`Risco de queda ${R.CLASSES[r.classe].nome.toLowerCase()} · ${r.pontos} pts`);
      m.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        if (A.modoMapear() === 'chamado') return A.abrirFormChamado({ arvoreId: a.id });
        A.selecionar(a.id, false);
      });
      marcadores.push(m);
    });
  }
  $('#legenda').insertAdjacentHTML('beforeend', '<b>Risco de queda (vistoria)</b>' +
    ['alto', 'critico'].map((k) => `<div><i class="tri" style="background:${R.CLASSES[k].cor}"></i>${R.CLASSES[k].nome}</div>`).join(''));

  A.renderers.push(desenhar);
})();
