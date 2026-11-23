// Tela de acesso com perfis. Protótipo: sem senha; o perfil só decide quais seções aparecem.
// Na versão real, o login vem do backend (ex.: Supabase Auth) e as permissões são checadas no servidor.
(function () {
  const $ = (s) => document.querySelector(s);
  const KEY = Arbo.CONFIG.storageKey + '.sessao';
  const ler = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const gravar = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) { /* ignora */ } };

  // Arte da tela de acesso: as ruas reais de Boa Viagem em linhas, as árvores como pontos de luz.
  function desenharArte() {
    const svg = $('#arte-mapa'), R = window.__RUAS;
    if (!R) return;
    const pts = R.flatMap((w) => w.p);
    const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
    const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const W = 1000, H = 1000 * (la1 - la0) / (lo1 - lo0);
    const xy = ([la, lo]) => [((lo - lo0) / (lo1 - lo0)) * W, ((la1 - la) / (la1 - la0)) * H];
    svg.setAttribute('viewBox', `0 0 ${W} ${H.toFixed(0)}`);
    const larg = { P: 5, S: 3.6, T: 2.6, R: 1.8 };
    const costa = R.find((w) => w.k === 'C');
    let html = '';
    if (costa) {
      const c = costa.p.map(xy);
      html += `<path d="M${c.map((p) => p.join(',')).join('L')}L${W + 50},${H + 50}L${W + 50},-50Z" fill="#17534a"/>`;
    }
    R.filter((w) => larg[w.k]).forEach((w) => {
      html += `<path d="M${w.p.map((p) => xy(p).map((v) => v.toFixed(1)).join(',')).join('L')}" stroke="${w.k === 'P' ? '#3f8577' : '#2a6359'}" stroke-width="${larg[w.k]}" fill="none" stroke-linecap="round"/>`;
    });
    Arbo.seed().forEach((a, i) => {
      const [x, y] = xy([a.lat, a.lng]);
      const cor = a.saude === 'morta' ? '#e3412b' : '#9be3b0';
      html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${cor}" opacity=".16"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${cor}"/>`;
    });
    svg.innerHTML = html;
  }

  function entrar(sessao) {
    document.body.dataset.perfil = sessao.perfil;
    document.body.classList.add('logado');
    const abas = [...document.querySelectorAll('.aba')];
    abas.forEach((b) => b.classList.toggle('oculto', !b.dataset.perfis.split(' ').includes(sessao.perfil)));
    $('#avatar').textContent = sessao.nome.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    $('#avatar').title = sessao.nome;
    if (sessao.perfil === 'agente' && Arbo.app.nomeAgente) Arbo.app.nomeAgente(sessao.nome);
    abas.find((b) => !b.classList.contains('oculto')).click();
    setTimeout(() => Arbo.app.mapa.invalidateSize(), 50);
  }

  $('#form-acesso').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const sessao = { perfil: f.perfil.value, nome: f.nome.value.trim() || 'Visitante', email: f.email.value.trim() };
    gravar(sessao);
    entrar(sessao);
  });

  $('#btn-sair').onclick = () => {
    gravar(null);
    document.body.classList.remove('logado');
    delete document.body.dataset.perfil;
  };

  if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.legenda').open = false;
  desenharArte();
  const s = ler();
  if (s) entrar(s);
})();
