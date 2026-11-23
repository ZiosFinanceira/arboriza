// Tela de acesso.
// - Equipe de campo: equipe + integrante + matrícula (cada login responde pelas próprias OS).
// - Agente do Futuro: cadastro com nome, e-mail, celular e bairro (sem cadastro não há sugestão: menos trote).
// - Área restrita: funções da prefeitura, cada uma com suas permissões (js/permissoes.js).
// Protótipo: senhas não são conferidas nem guardadas. Na versão real o login vem do backend (ex.: Supabase Auth).
(function () {
  const A = Arbo.app;
  const $ = (s) => document.querySelector(s);
  const K = Arbo.CONFIG.storageKey;
  const ler = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) || p; } catch (e) { return p; } };
  const gravar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignora */ } };
  const BAIRROS = ['Recife (bairro do Recife Antigo)', 'Santo Antônio', 'São José', 'Boa Vista', 'Santo Amaro', 'Soledade', 'Ilha do Leite', 'Coelhos', 'Cabanga', 'Outro bairro'];
  const f = $('#form-acesso');
  let modoAgente = 'criar';

  // ---------- arte: ruas reais do Recife Antigo com as árvores como pontos de luz ----------
  function desenharArte() {
    const svg = $('#arte-mapa'), R = window.__RUAS;
    if (!R) return;
    const pts = R.filter((w) => 'PSTRD'.includes(w.k)).flatMap((w) => w.p);
    const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
    const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const kx = Math.cos((la0 * Math.PI) / 180);
    const W = 1000, H = (1000 * (la1 - la0)) / ((lo1 - lo0) * kx);
    const xy = ([la, lo]) => [((lo - lo0) / (lo1 - lo0)) * W, ((la1 - la) / (la1 - la0)) * H];
    const d = (w) => 'M' + w.p.map((p) => xy(p).map((v) => v.toFixed(1)).join(',')).join('L');
    svg.setAttribute('viewBox', `0 0 ${W} ${H.toFixed(0)}`);
    const larg = { P: 5, S: 3.4, T: 2.6, R: 1.8, D: 1.6 };
    let html = '';
    R.filter((w) => w.k === 'W').forEach((w) => (html += `<path d="${d(w)}Z" fill="#0b2f2a"/>`));
    R.filter((w) => w.k === 'C').forEach((w) => (html += `<path d="${d(w)}" stroke="#0b2f2a" stroke-width="22" fill="none" stroke-linejoin="round"/>`));
    R.filter((w) => w.k === 'G').forEach((w) => (html += `<path d="${d(w)}Z" fill="#1d5c50"/>`));
    R.filter((w) => larg[w.k]).forEach((w) => (html += `<path d="${d(w)}" stroke="${w.k === 'S' || w.k === 'P' ? '#3f8577' : '#2a6359'}" stroke-width="${larg[w.k]}" fill="none" stroke-linecap="round"/>`));
    Arbo.seed().forEach((a) => {
      const [x, y] = xy([a.lat, a.lng]);
      const cor = a.saude === 'morta' ? '#e3412b' : '#9be3b0';
      html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" fill="${cor}" opacity=".16"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${cor}"/>`;
    });
    const [mx, my] = xy(Arbo.CONFIG.centro);
    html += `<circle cx="${mx}" cy="${my}" r="9" fill="none" stroke="#f2b632" stroke-width="2.5"/><circle cx="${mx}" cy="${my}" r="3" fill="#f2b632"/>
      <text x="${mx - 16}" y="${my + 6}" text-anchor="end" fill="#f2d68a" font-size="17" font-family="Figtree, sans-serif" font-weight="600">Marco Zero</text>`;
    svg.innerHTML = html;
  }

  // ---------- formulário ----------
  function preencher() {
    $('#ac-sel-equipe').innerHTML = Arbo.EQUIPES.map((e) => `<option value="${e.id}">${A.esc(e.nome)} · ${A.esc(e.funcao)}</option>`).join('');
    const membros = () => { const e = Arbo.EQUIPES.find((x) => x.id === $('#ac-sel-equipe').value); $('#ac-sel-membro').innerHTML = e.membros.map((m) => `<option value="${m.mat}">${A.esc(m.nome)}</option>`).join(''); };
    $('#ac-sel-equipe').onchange = membros; membros();
    $('#ac-sel-bairro').innerHTML = '<option value="">Escolha</option>' + BAIRROS.map((b) => `<option>${A.esc(b)}</option>`).join('');
    const gest = Object.entries(Arbo.PAPEIS).filter(([, p]) => p.perfil === 'gestao');
    $('#ac-sel-papel').innerHTML = gest.map(([k, p]) => `<option value="${k}">${A.esc(p.nome)}</option>`).join('');
    const desc = () => ($('#ac-papel-desc').textContent = Arbo.PAPEIS[$('#ac-sel-papel').value].desc);
    $('#ac-sel-papel').onchange = desc; desc();
  }
  function trocarPerfil() {
    const ag = f.perfil.value === 'agente';
    $('#ac-equipe').classList.toggle('oculto', ag);
    $('#ac-agente').classList.toggle('oculto', !ag);
    $('#ac-entrar').textContent = ag ? (modoAgente === 'criar' ? 'Criar cadastro e entrar' : 'Entrar') : 'Entrar';
    $('#ac-erro').textContent = '';
  }
  f.querySelectorAll('input[name=perfil]').forEach((r) => (r.onchange = trocarPerfil));
  f.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => {
    modoAgente = b.dataset.modo;
    f.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('ativo', x === b));
    $('#ac-ag-criar').classList.toggle('oculto', modoAgente !== 'criar');
    $('#ac-termos').classList.toggle('oculto', modoAgente !== 'criar');
    trocarPerfil();
  }));
  $('#btn-area-restrita').onclick = () => { $('#ac-publico').classList.add('oculto'); $('#ac-restrito').classList.remove('oculto'); $('#btn-area-restrita').classList.add('oculto'); f.papel.focus(); };
  $('#ac-voltar').onclick = () => { $('#ac-publico').classList.remove('oculto'); $('#ac-restrito').classList.add('oculto'); $('#btn-area-restrita').classList.remove('oculto'); };

  const erro = (msg, el) => { (el || $('#ac-erro')).textContent = msg; return false; };
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    let s = null;
    if (!$('#ac-restrito').classList.contains('oculto')) {
      const em = f.email_inst.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return erro('Informe o e-mail institucional.', $('#ac-erro-r'));
      if (A.usuarioBloqueado(em)) return erro('Este acesso foi bloqueado pela administração.', $('#ac-erro-r'));
      const papel = f.papel.value;
      s = { perfil: 'gestao', papel, nome: Arbo.PAPEIS[papel].nome, email: em };
    } else if (f.perfil.value === 'equipe') {
      const eq = Arbo.EQUIPES.find((x) => x.id === f.equipe.value), m = eq.membros.find((x) => x.mat === f.membro.value);
      if (f.matricula.value.trim() !== m.mat) return erro(`A matrícula não confere com ${m.nome}. (Na demonstração, a matrícula é ${m.mat}.)`);
      if (A.usuarioBloqueado('mat. ' + m.mat)) return erro('Este acesso foi bloqueado pela coordenação.');
      s = { perfil: 'equipe', papel: 'equipe', nome: m.nome, email: 'mat. ' + m.mat, matricula: m.mat, equipe: eq.id };
    } else {
      const agentes = ler(K + '.agentes', []);
      const em = f.email.value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(em)) return erro('Informe um e-mail válido.');
      if (A.usuarioBloqueado(em)) return erro('Este cadastro foi bloqueado. Fale com a prefeitura.');
      if (modoAgente === 'entrar') {
        const a = agentes.find((x) => x.email === em);
        if (!a) return erro('Não encontramos esse e-mail. Crie seu cadastro.');
        s = { perfil: 'agente', papel: 'agente', ...a };
      } else {
        const nome = f.nome.value.trim(), cel = f.celular.value.replace(/\D/g, '');
        if (nome.split(/\s+/).length < 2) return erro('Informe nome e sobrenome.');
        if (cel.length < 10) return erro('Informe um celular com DDD.');
        if (!f.bairro.value) return erro('Escolha seu bairro.');
        if (!f.termos.checked) return erro('Para enviar sugestões é preciso aceitar os termos.');
        if (agentes.some((x) => x.email === em)) return erro('Esse e-mail já tem cadastro. Use "Já tenho cadastro".');
        const novo = { nome, email: em, celular: cel, bairro: f.bairro.value, criado: new Date().toISOString() };
        gravar(K + '.agentes', [...agentes, novo]);
        s = { perfil: 'agente', papel: 'agente', ...novo };
        Arbo.definirSessao(s); Arbo.auditar('Criou cadastro de agente', `${nome} · ${novo.bairro}`);
      }
    }
    gravar(K + '.sessao', s);
    entrar(s);
    Arbo.auditar('Entrou no sistema', Arbo.PAPEIS[s.papel].nome);
  });

  function entrar(s) {
    Arbo.definirSessao(s);
    document.body.dataset.perfil = s.perfil;
    document.body.classList.add('logado');
    const ini = s.nome.replace(/\(.*\)/, '').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    $('#avatar').textContent = ini; $('#avatar').title = `${s.nome} · ${Arbo.PAPEIS[s.papel].nome}`;
    $('#chip-perfil').innerHTML = `<svg><use href="#${s.perfil === 'gestao' ? 'i-escudo' : s.perfil === 'equipe' ? 'i-rota' : 'i-agente'}"/></svg>${A.esc(Arbo.PAPEIS[s.papel].nome)}${s.perfil !== 'gestao' ? ' · ' + A.esc(s.nome.split(' ')[0]) : ''}`;
    if (s.perfil === 'agente' && A.nomeAgente) A.nomeAgente(s.nome);
    const inicio = { equipe: 'os', agente: 'agente', gestao: 'arvores' }[s.perfil];
    const visiveis = [...document.querySelectorAll('.aba')].filter((b) => !b.classList.contains('sem-perm'));
    (visiveis.find((b) => b.dataset.aba === inicio) || visiveis[0]).click();
    setTimeout(() => A.mapa.invalidateSize(), 60);
  }
  A.salvarSessao = (s) => gravar(K + '.sessao', s);

  $('#btn-sair').onclick = () => {
    Arbo.auditar('Saiu do sistema');
    gravar(K + '.sessao', null);
    Arbo.definirSessao(null);
    document.body.classList.remove('logado');
    delete document.body.dataset.perfil;
    $('#detalhe').classList.add('oculto');
    $('#ac-voltar').click();
    f.reset(); trocarPerfil();
  };

  // painel mais largo para tabelas (gastos e acessos)
  document.querySelectorAll('.aba').forEach((b) => b.addEventListener('click', () => {
    document.body.dataset.aba = b.dataset.aba;
    setTimeout(() => A.mapa.invalidateSize(), 60);
  }));

  // ---------- início ----------
  if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.legenda').open = false;
  preencher();
  trocarPerfil();
  desenharArte();
  A.aoIniciar.forEach((fn) => fn());
  const s = ler(K + '.sessao', null);
  if (s && Arbo.PAPEIS[s.papel]) entrar(s);
})();
