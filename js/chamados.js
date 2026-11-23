// Controle urbano: chamados (poda, corte, remoção, risco de queda...) com cronômetro de abertura,
// cor por tempo em aberto e prioridade por risco. Funções puras + dados de exemplo.
window.Arbo = window.Arbo || {};

(function () {
  const TIPOS = {
    'risco-queda':  'Risco de queda',
    'poda':         'Poda',
    'corte':        'Corte / supressão',
    'remocao':      'Remoção de árvore caída/morta',
    'recuperacao':  'Recuperação / tratamento',
    'raiz-calcada': 'Raiz danificando calçada',
    'fiacao':       'Conflito com fiação',
    'praga':        'Praga / doença',
    'substituicao': 'Muda morta — substituir',
    'outro':        'Outro'
  };

  // peso usado para priorizar as equipes
  const RISCOS = {
    'baixo':   { nome: 'Baixo risco', peso: 1, sigla: 'B' },
    'medio':   { nome: 'Risco',       peso: 2, sigla: 'R' },
    'alto':    { nome: 'Risco alto',  peso: 3, sigla: 'A' },
    'urgente': { nome: 'Urgente',     peso: 4, sigla: 'U' }
  };

  // Faixas de cor pelo TEMPO EM ABERTO (dias), para Baixo risco, Risco e Risco alto. O cronômetro não tem fim: passou de 10 dias, fica vermelho para sempre.
  const FAIXAS = [
    { ate: 3,        cor: '#1e88e5', nome: 'Azul',     desc: 'até 3 dias' },
    { ate: 7,        cor: '#fbc02d', nome: 'Amarelo',  desc: '3 a 7 dias' },
    { ate: 10,       cor: '#fb8c00', nome: 'Laranja',  desc: '7 a 10 dias' },
    { ate: Infinity, cor: '#e53935', nome: 'Vermelho', desc: '10 dias ou mais' }
  ];

  const STATUS = { 'aberto': 'Aberto', 'atendimento': 'Em atendimento', 'concluido': 'Concluído' };
  const ORIGENS_CHAMADO = { '156': 'Central 156', 'vistoria': 'Vistoria da equipe', 'municipe': 'Munícipe (app/site)', 'defesa-civil': 'Defesa Civil', 'sensor': 'Alerta automático' };

  function diasAberto(ch, agora) {
    const fim = ch.status === 'concluido' && ch.conclusao ? new Date(ch.conclusao) : agora;
    return Math.max(0, (fim - new Date(ch.abertura)) / 86400000);
  }

  // Urgente já nasce vermelho. Os demais riscos seguem as faixas de tempo.
  function faixa(ch, agora) {
    if (ch.risco === 'urgente') return FAIXAS[FAIXAS.length - 1];
    const d = diasAberto(ch, agora);
    return FAIXAS.find((f) => d < f.ate);
  }

  // Prioridade = peso do risco × fator de tempo. Um "Urgente" novo fica acima de um "Baixo" antigo,
  // mas qualquer chamado esquecido vai subindo na fila com o passar dos dias.
  function prioridade(ch, agora) {
    return RISCOS[ch.risco].peso * 10 * (1 + diasAberto(ch, agora) / 7);
  }

  function tempoTexto(ch, agora) {
    const ms = (ch.status === 'concluido' && ch.conclusao ? new Date(ch.conclusao) : agora) - new Date(ch.abertura);
    const min = Math.max(0, Math.floor(ms / 60000));
    const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}min`;
    return `${m}min`;
  }

  // Exemplos com idades variadas, ligados às árvores de exemplo (arv-0001...) ou a pontos soltos.
  function seed() {
    const atras = (dias, horas = 0) => new Date(Date.now() - (dias * 24 + horas) * 3600000).toISOString();
    const L = [
      ['arv-0004', null, 'poda', 'medio', 'Galhos baixos atrapalhando a passagem de ônibus.', '156', 12, 3],
      ['arv-0007', null, 'raiz-calcada', 'alto', 'Fícus levantou a calçada; pedestre tropeçou.', 'municipe', 8, 5],
      [null, [-23.556939, -46.658869, 'R. Luís Coelho'], 'risco-queda', 'urgente', 'Árvore inclinada após temporal, sobre ponto de ônibus.', 'defesa-civil', 0, 6],
      ['arv-0013', null, 'fiacao', 'medio', 'Copa encostando na rede elétrica.', 'vistoria', 4, 2],
      [null, [-23.556628, -46.657721, 'R. Antônio Carlos'], 'remocao', 'alto', 'Árvore morta em pé, tronco oco.', '156', 1, 20],
      ['arv-0012', null, 'praga', 'baixo', 'Cupim na base do tronco.', 'vistoria', 2, 1],
      [null, [-23.559505, -46.656344, 'R. São Carlos do Pinhal'], 'recuperacao', 'baixo', 'Muda com tutor quebrado e protetor danificado.', 'municipe', 15, 0],
      [null, [-23.56197, -46.655873, 'Al. Casa Branca'], 'corte', 'alto', 'Tronco rachado na bifurcação.', '156', 6, 12]
    ];
    return L.map((r, i) => ({
      id: 'ch-' + String(i + 1).padStart(4, '0'),
      arvoreId: r[0], coords: r[1] ? r[1].slice(0, 2) : null, endereco: r[1] ? r[1][2] : '', tipo: r[2], risco: r[3], descricao: r[4], origem: r[5],
      abertura: atras(r[6], r[7]), status: i === 3 ? 'atendimento' : 'aberto', conclusao: null
    }));
  }

  Arbo.chamados = { TIPOS, RISCOS, FAIXAS, STATUS, ORIGENS_CHAMADO, diasAberto, faixa, prioridade, tempoTexto, seed };
})();
