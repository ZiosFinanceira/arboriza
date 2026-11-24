// Risco de queda, calendário de vistoria e diversidade de espécies.
// Funções puras (sem DOM), como em engine.js, para poderem ir para o backend no futuro e serem testadas.
//
// O índice segue a lógica das avaliações de risco usadas em arboricultura (ex.: TRAQ da ISA):
// risco = chance de a árvore falhar (defeitos) × tamanho do que pode cair × o que existe embaixo (alvo).
// Os PESOS abaixo são REFERÊNCIAS de protótipo e devem ser validados com um engenheiro agrônomo ou florestal.
window.Arbo = window.Arbo || {};

(function () {
  const PARAMS = {
    // pontos de defeito (chance de falhar)
    inclinacao: [[10, 0], [20, 10], [30, 20], [Infinity, 35]], // graus: abaixo de 10° = 0 pt; de 10° a 19° = 10 ...
    inclinacaoRecente: 30,       // solo levantado / raiz arrancando do lado oposto: sinal de queda próxima
    cavidade: { nenhuma: 0, pequena: 12, grande: 35 }, // grande = mais de 1/3 do diâmetro do tronco
    rachadura: 30,               // fenda no tronco ou na bifurcação principal
    raizes: { ok: 0, calcada: 5, danificadas: 20 }, // danificadas = cortadas em obra, podres ou estranguladas
    galhosSecos: 15,             // galhos secos, quebrados ou pendurados
    praga: 10,                   // cupim, broca, fungos (orelha-de-pau)
    podaDrastica: 10,            // poda drástica deixa a copa desequilibrada e favorece a podridão
    morta: 40,                   // árvore morta em pé
    inadequadaGrande: 5,         // espécie inadequada para calçada e de porte grande
    semPodaAnosGrande: 5,        // árvore grande sem poda de manutenção há mais que isso (anos)...
    semPodaPontos: 5,            // ...soma estes pontos
    fiacao: 8,                   // copa encostando na rede: risco de choque e apagão
    // multiplicadores
    tamanho: { pequena: 0.6, media: 1.0, grande: 1.2 }, // pelo DAP e pela altura
    alvo: { baixa: 0.7, media: 1.0, alta: 1.3 },        // ocupação embaixo da árvore
    // classes (0–100)
    classes: [[25, 'baixo'], [50, 'moderado'], [75, 'alto'], [Infinity, 'critico']],
    // calendário: meses até a próxima vistoria por classe
    intervaloMeses: { baixo: 24, moderado: 12, alto: 3, critico: 1 },
    limiteGrandeOuMovimentado: 12, // árvore grande ou com alvo de ocupação alta: no máximo 12 meses
    // diversidade (regra de referência da silvicultura urbana: no máximo 10% de uma espécie e 20% de um gênero)
    maxEspecie: 0.10,
    maxGenero: 0.20,
    minArvoresDiversidade: 30    // com poucas árvores, 2 exemplares da mesma espécie já passam de 10%: alerta só a partir daqui
  };

  const CLASSES = {
    'sem-vistoria': { nome: 'Sem vistoria técnica', cor: '#90a4ae', ordem: 0 },
    baixo:    { nome: 'Baixo',    cor: '#2f8a45', ordem: 1 },
    moderado: { nome: 'Moderado', cor: '#f2b632', ordem: 2 },
    alto:     { nome: 'Alto',     cor: '#ef6c00', ordem: 3 },
    critico:  { nome: 'Crítico',  cor: '#c62828', ordem: 4 }
  };

  // Campos da vistoria (usados no formulário, na ficha e no CSV)
  const OPCOES = {
    cavidade: { nenhuma: 'Nenhuma', pequena: 'Pequena', grande: 'Grande (mais de 1/3 do tronco)' },
    raizes: { ok: 'Sem problema', calcada: 'Levantando a calçada', danificadas: 'Cortadas, podres ou estranguladas' },
    alvo: { baixa: 'Baixa (canteiro, pouco movimento)', media: 'Média (calçada comum)', alta: 'Alta (ponto de ônibus, escola, via movimentada, estacionamento)' }
  };

  const DIA = 86400000;
  const parse = (s) => (s ? new Date(String(s).slice(0, 10) + 'T12:00:00') : null);
  // data local (AAAA-MM-DD); toISOString usaria UTC e trocaria o dia perto da meia-noite
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const num = (v) => (v === '' || v == null || !isFinite(+v) ? null : +v);
  const tem = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);
  const dataOk = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(parse(s)) === s; // recusa 2026-02-30
  // soma meses sem "transbordar": 31/01 + 1 mês = 28/02 (setMonth puro daria 03/03)
  function somaMeses(d, meses) {
    const r = new Date(d.getTime()), dia = r.getDate();
    r.setDate(1); r.setMonth(r.getMonth() + meses);
    const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(dia, ultimo));
    return r;
  }

  // Árvores que entram nas contas: um local planejado ainda não é árvore, e uma substituída saiu do inventário.
  const contaComoArvore = (a) => a.origem !== 'planejada' && a.saude !== 'substituida';

  // Só considera vistorias com data válida (dados importados de arquivo podem vir malformados)
  function ultimaVistoria(a) {
    const v = (Array.isArray(a.vistorias) ? a.vistorias : []).filter((x) => x && typeof x === 'object' && dataOk(x.data));
    if (!v.length) return null;
    return v.reduce((m, x) => (x.data >= m.data ? x : m));
  }

  function tamanho(v, esp) {
    const dap = num(v.dap), alt = num(v.altura);
    if (dap == null && alt == null) return esp && esp.porte === 'grande' ? 'grande' : esp && esp.porte === 'pequeno' ? 'pequena' : 'media';
    if ((dap != null && dap >= 50) || (alt != null && alt >= 12)) return 'grande';
    if ((dap == null || dap < 15) && (alt == null || alt < 5)) return 'pequena';
    return 'media';
  }

  // Retorna { pontos: 0–100 | null, classe, motivos: [{texto, pontos}], vistoria, tamanho }
  function avaliar(a, esp, hoje) {
    const v = ultimaVistoria(a);
    if (!v) return { pontos: null, classe: 'sem-vistoria', motivos: [], vistoria: null, tamanho: null };
    const P = PARAMS, motivos = [];
    const soma = (cond, pts, texto) => { if (cond && pts) motivos.push({ texto, pontos: pts }); };
    const inc = Math.max(0, Math.min(90, num(v.inclinacao) || 0));
    const ptsInc = P.inclinacao.find(([ate]) => inc < ate)[1];
    soma(true, ptsInc, `Inclinação de ${inc}°`);
    soma(v.inclinacaoRecente === true, P.inclinacaoRecente, 'Inclinação recente (solo levantado na base)');
    soma(true, tem(P.cavidade, v.cavidade) ? P.cavidade[v.cavidade] : 0, `Cavidade ou podridão ${v.cavidade === 'grande' ? 'grande' : 'pequena'} no tronco`);
    soma(v.rachadura === true, P.rachadura, 'Rachadura no tronco ou na bifurcação');
    soma(true, tem(P.raizes, v.raizes) ? P.raizes[v.raizes] : 0, v.raizes === 'danificadas' ? 'Raízes cortadas, podres ou estranguladas' : 'Raízes levantando a calçada');
    soma(v.galhosSecos === true, P.galhosSecos, 'Galhos secos ou pendurados');
    soma(v.praga === true, P.praga, 'Praga ou fungo (cupim, broca, orelha-de-pau)');
    soma(v.podaDrastica === true, P.podaDrastica, 'Sinais de poda drástica');
    soma(a.saude === 'morta', P.morta, 'Árvore morta em pé');
    const tam = tamanho(v, esp);
    soma(esp && !esp.calcada && tam === 'grande', P.inadequadaGrande, 'Espécie inadequada para calçada, de porte grande');
    if (tam === 'grande') {
      const poda = dataOk(v.ultimaPoda) ? parse(v.ultimaPoda) : null;
      const anos = poda ? (parse(v.data) - poda) / (365.25 * DIA) : Infinity;
      soma(anos > P.semPodaAnosGrande, P.semPodaPontos, poda ? `Sem poda de manutenção há ${Math.floor(anos)} anos` : 'Sem registro de poda de manutenção');
    }
    soma(v.fiacao === true, P.fiacao, 'Copa em conflito com a fiação');
    const base = motivos.reduce((s, m) => s + m.pontos, 0);
    const fator = P.tamanho[tam] * (tem(P.alvo, v.alvo) ? P.alvo[v.alvo] : 1);
    const pontos = Math.max(0, Math.min(100, Math.round(base * fator) || 0));
    const classe = P.classes.find(([ate]) => pontos < ate)[1];
    return { pontos, classe, motivos, vistoria: v, tamanho: tam, fator: Math.round(fator * 100) / 100 };
  }

  // Próxima vistoria: pela classe de risco, com teto para árvore grande ou em local movimentado.
  // Sem vistoria: fica "pendente" (vencida) desde já.
  function proximaVistoria(a, esp, hoje) {
    if (!contaComoArvore(a)) return null;
    const r = avaliar(a, esp, hoje);
    if (!r.vistoria) return { data: null, vencida: true, pendente: true, dias: null, meses: null, classe: r.classe };
    let meses = PARAMS.intervaloMeses[r.classe];
    if (r.tamanho === 'grande' || r.vistoria.alvo === 'alta') meses = Math.min(meses, PARAMS.limiteGrandeOuMovimentado);
    const d = somaMeses(parse(r.vistoria.data), meses);
    const h = parse(iso(hoje));
    const dias = Math.round((d - h) / DIA);
    return { data: iso(d), vencida: dias < 0, pendente: false, dias, meses, classe: r.classe };
  }

  // Diversidade: porcentagem de cada espécie e de cada gênero entre as árvores vivas identificadas.
  function diversidade(arvores, especies) {
    const vivas = arvores.filter((a) => contaComoArvore(a) && a.saude !== 'morta');
    const ident = vivas.filter((a) => a.especie && a.especie !== 'desconhecida' && especies[a.especie]);
    const total = ident.length;
    const conta = (chave) => {
      const m = new Map();
      ident.forEach((a) => { const k = chave(a); if (k) m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].map(([k, n]) => ({ k, n, pct: total ? n / total : 0 })).sort((x, y) => y.n - x.n || x.k.localeCompare(y.k));
    };
    const poucas = total < PARAMS.minArvoresDiversidade;
    const esp = conta((a) => a.especie).map((x) => ({ ...x, nome: especies[x.k].nome, alerta: !poucas && x.pct > PARAMS.maxEspecie }));
    const gen = conta((a) => { const c = especies[a.especie].cientifico || ''; const g = c.split(/\s+/)[0]; return /^[A-Z][a-z]+$/.test(g) ? g : null; })
      .map((x) => ({ ...x, nome: x.k, alerta: !poucas && x.pct > PARAMS.maxGenero }));
    return { total, naoIdentificadas: vivas.length - total, poucas, especies: esp, generos: gen, maxEspecie: PARAMS.maxEspecie, maxGenero: PARAMS.maxGenero };
  }

  // Exemplos de vistoria para as árvores de exemplo (datas relativas a hoje). Valores FICTÍCIOS.
  function seedVistorias(arvores) {
    const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return iso(t); };
    const base = { inclinacao: 0, inclinacaoRecente: false, cavidade: 'nenhuma', rachadura: false, raizes: 'ok', galhosSecos: false, praga: false, podaDrastica: false, fiacao: false, alvo: 'media', ultimaPoda: null, obs: '', por: 'Equipe Vistoria 03 (exemplo)' };
    const ex = {
      'arv-0004': { data: d(40), dap: 62, altura: 14, inclinacao: 8, galhosSecos: true, fiacao: true, alvo: 'alta', ultimaPoda: d(2400), obs: 'Galhos baixos sobre a faixa de ônibus.' },
      'arv-0007': { data: d(20), dap: 48, altura: 11, inclinacao: 18, raizes: 'danificadas', cavidade: 'pequena', alvo: 'alta', obs: 'Raízes cortadas na reforma da calçada.' },
      'arv-0012': { data: d(400), dap: 22, altura: 6, praga: true, alvo: 'media', obs: 'Cupim na base.' },
      'arv-0013': { data: d(150), dap: 35, altura: 9, fiacao: true, alvo: 'media', ultimaPoda: d(500) },
      'arv-0002': { data: d(200), dap: 12, altura: 4, alvo: 'baixa' },
      'arv-0010': { data: d(800), dap: 18, altura: 5, alvo: 'media' },
      'arv-0021': { data: d(60), dap: 30, altura: 7, cavidade: 'grande', rachadura: true, alvo: 'media', obs: 'Muda de compensação morta; tronco oco.' }
    };
    arvores.forEach((a) => { if (ex[a.id]) a.vistorias = [{ ...base, ...ex[a.id] }]; });
    return arvores;
  }

  Arbo.risco = { PARAMS, CLASSES, OPCOES, dataOk, avaliar, proximaVistoria, diversidade, ultimaVistoria, contaComoArvore, seedVistorias };
})();
