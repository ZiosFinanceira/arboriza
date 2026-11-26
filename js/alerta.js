// Alerta de chuva forte. A coordenação ativa quando a Defesa Civil avisa; o sistema monta a fila de vistorias
// pós-chuva (uma OS por árvore que merece olhar primeiro) e mostra um aviso para todos, inclusive moradores.
// Critérios de quem entra na fila: REFERÊNCIAS do protótipo, ajustáveis em CRITERIOS.
(function () {
  const A = Arbo.app, R = Arbo.risco, { esc } = A;
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.alerta';
  const NIVEIS = { atencao: 'Atenção', alerta: 'Alerta', maximo: 'Alerta máximo' };
  const CRITERIOS = {
    classes: ['alto', 'critico'],      // risco alto ou crítico pela última vistoria
    grandeMovimentado: true,           // árvore grande em local de muito movimento, qualquer risco
    grandeSemVistoria: true,           // espécie de porte grande que nunca teve vistoria
    chamadoRiscoAberto: true           // chamado de risco de queda ainda aberto
  };
  let alerta = ler();

  function ler() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function gravar() { try { alerta ? localStorage.setItem(KEY, JSON.stringify(alerta)) : localStorage.removeItem(KEY); } catch (e) { /* ignora */ } }

  // Quem entra na fila, com o motivo (função pura sobre os dados do app)
  function fila() {
    const out = [];
    A.arvores.forEach((a) => {
      if (R.contaComoArvore && !R.contaComoArvore(a)) return;
      const r = A.risco(a), esp = Arbo.ESPECIES[a.especie] || {};
      let motivo = null;
      if (CRITERIOS.classes.includes(r.classe)) motivo = `risco ${R.CLASSES[r.classe].nome.toLowerCase()} (${r.pontos})`;
      else if (CRITERIOS.grandeMovimentado && r.tamanho === 'grande' && r.vistoria && r.vistoria.alvo === 'alta') motivo = 'árvore grande em local movimentado';
      else if (CRITERIOS.grandeSemVistoria && !r.vistoria && esp.porte === 'grande') motivo = 'espécie de porte grande sem vistoria';
      else if (CRITERIOS.chamadoRiscoAberto && A.chamados.some((c) => c.arvoreId === a.id && c.tipo === 'risco-queda' && c.status !== 'concluido')) motivo = 'chamado de risco de queda aberto';
      if (a.saude === 'morta' && !motivo) motivo = 'árvore morta em pé';
      if (motivo) out.push({ a, r, motivo });
    });
    return out.sort((x, y) => (y.r.pontos || 0) - (x.r.pontos || 0));
  }

  function ativar(nivel, ref) {
    const ses = Arbo.sessao() || {};
    const itens = fila();
    const criadas = itens.map(({ a, r, motivo }) => A.criarOSChuva(a, { equipe: r.classe === 'critico' || a.saude === 'morta' ? 'eq-02' : 'eq-03', classe: r.classe, pontos: r.pontos || 0, motivo })).filter(Boolean);
    alerta = { inicio: new Date().toISOString(), nivel, ref, por: ses.nome || '', arvores: itens.length, os: criadas.map((o) => o.id) };
    gravar();
    Arbo.auditar('Ativou alerta de chuva', `${NIVEIS[nivel]} · ${criadas.length} OS de vistoria${ref ? ' · ' + ref : ''}`);
    A.toast(`Alerta ativado: ${criadas.length} vistorias pós-chuva na fila das equipes`);
    A.atualizar();
  }
  function encerrar() {
    Arbo.auditar('Encerrou alerta de chuva', alerta ? NIVEIS[alerta.nivel] : '');
    alerta = null; gravar(); A.toast('Alerta encerrado. As vistorias já abertas continuam na fila.'); A.atualizar();
  }

  const hora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  function render() {
    // faixa no mapa, para todos os perfis
    const chip = $('#chip-alerta');
    if (alerta) {
      const pend = (A.listaOS() || []).filter((o) => alerta.os.includes(o.id) && o.status !== 'concluida').length;
      chip.innerHTML = Arbo.sessao() && Arbo.sessao().perfil === 'agente'
        ? `<b>Alerta de chuva forte (nível ${esc(NIVEIS[alerta.nivel].toLowerCase())}).</b> Evite ficar embaixo de árvores e não estacione sob elas. Viu galho pendurado ou árvore inclinando? Avise a prefeitura.`
        : `<b>Alerta de chuva forte · nível ${esc(NIVEIS[alerta.nivel].toLowerCase())}</b> desde ${hora(alerta.inicio)} · ${pend} de ${alerta.os.length} vistorias pós-chuva pendentes`;
      chip.classList.remove('oculto');
    } else chip.classList.add('oculto');
    // cartão na aba Chamados
    const c = $('#alerta-cartao'); if (!c) return;
    if (!Arbo.pode('gerir_alertas') && !alerta) { c.innerHTML = ''; return; }
    if (alerta) {
      const os = (A.listaOS() || []).filter((o) => alerta.os.includes(o.id));
      const feitas = os.filter((o) => o.status === 'concluida').length;
      c.innerHTML = `<div class="alerta-ativo">
        <b>Alerta de chuva forte ativo · nível ${esc(NIVEIS[alerta.nivel].toLowerCase())}</b>
        <span>Desde ${hora(alerta.inicio)}${alerta.por ? ' · por ' + esc(alerta.por) : ''}${alerta.ref ? ' · ' + esc(alerta.ref) : ''}</span>
        <div class="barra-trilho"><div style="width:${os.length ? (feitas / os.length) * 100 : 0}%"></div></div>
        <span>${feitas} de ${os.length} vistorias pós-chuva concluídas. Veja a ordem na aba Serviços.</span>
        <button class="btn" id="btn-alerta-encerrar" data-perm="gerir_alertas">Encerrar alerta</button></div>`;
      const b = $('#btn-alerta-encerrar'); if (b) b.onclick = () => A.confirmar('Encerrar o alerta de chuva? As vistorias já criadas continuam na fila das equipes.', 'Encerrar').then((ok) => ok && encerrar());
    } else {
      const n = fila().length;
      c.innerHTML = `<div class="alerta-off"><span><b>Chuva forte prevista?</b> Ative o alerta para colocar na fila das equipes as ${n} árvores que precisam de vistoria primeiro.</span>
        <button class="btn" id="btn-alerta-ativar" data-perm="gerir_alertas">Ativar alerta de chuva</button></div>`;
      $('#btn-alerta-ativar').onclick = () => { const f = $('#form-alerta'); f.reset(); $('#alerta-previa').textContent = `${n} árvores entram na fila: risco alto ou crítico, árvores grandes em locais movimentados, grandes sem vistoria e chamados de risco abertos.`; $('#dlg-alerta').returnValue = ''; $('#dlg-alerta').showModal(); };
    }
  }
  $('#btn-cancelar-alerta').onclick = () => $('#dlg-alerta').close('cancel');
  $('#dlg-alerta').addEventListener('close', () => {
    if ($('#dlg-alerta').returnValue !== 'ok') return;
    const f = $('#form-alerta'); ativar(f.nivel.value, f.ref.value.trim());
  });
  $('#sel-alerta-nivel').innerHTML = Object.entries(NIVEIS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');

  Arbo.alerta = { CRITERIOS, NIVEIS, fila, ativo: () => alerta };
  A.renderers.push(render);
  A.aoRestaurar.push(() => { alerta = null; gravar(); });
})();
