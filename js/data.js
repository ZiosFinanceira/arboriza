// Dados de referência do protótipo: configuração da cidade, catálogo de espécies e árvores de exemplo.
// Tudo aqui é editável. Valores de água/adubação são REFERÊNCIAS para o protótipo e devem ser
// validados com um engenheiro agrônomo / florestal antes de uso real.
window.Arbo = window.Arbo || {};

Arbo.CONFIG = {
  cidade: 'Recife - PE',
  centro: [-8.11961, -34.89833], // Boa Viagem
  zoom: 17,
  storageKey: 'arboriza.v3',
  basemap: 'osm' // 'osm' = mapa padrão; 'vetor' = desenha as ruas de js/ruas.js (usado onde imagens externas são bloqueadas)
};

// agua: necessidade hídrica relativa | porte: tamanho adulto | calcada: adequada para calçada?
Arbo.ESPECIES = {
  'ipe-amarelo':  { nome: 'Ipê-amarelo',        cientifico: 'Handroanthus chrysotrichus', agua: 'baixa', porte: 'medio',   calcada: true },
  'ipe-roxo':     { nome: 'Ipê-roxo',           cientifico: 'Handroanthus impetiginosus', agua: 'baixa', porte: 'grande',  calcada: true, obs: 'Exige calçada larga e sem fiação baixa.' },
  'quaresmeira':  { nome: 'Quaresmeira',        cientifico: 'Pleroma granulosum',         agua: 'media', porte: 'pequeno', calcada: true },
  'manaca':       { nome: 'Manacá-da-serra',    cientifico: 'Pleroma mutabile',           agua: 'media', porte: 'pequeno', calcada: true },
  'pau-brasil':   { nome: 'Pau-brasil',         cientifico: 'Paubrasilia echinata',       agua: 'media', porte: 'medio',   calcada: true },
  'sibipiruna':   { nome: 'Sibipiruna',         cientifico: 'Cenostigma pluviosum',       agua: 'media', porte: 'grande',  calcada: true, obs: 'Copa ampla; evitar sob fiação.' },
  'oiti':         { nome: 'Oiti',               cientifico: 'Moquilea tomentosa',         agua: 'media', porte: 'medio',   calcada: true },
  'reseda':       { nome: 'Resedá',             cientifico: 'Lagerstroemia indica',       agua: 'baixa', porte: 'pequeno', calcada: true },
  'jacaranda':    { nome: 'Jacarandá-mimoso',   cientifico: 'Jacaranda mimosifolia',      agua: 'media', porte: 'medio',   calcada: true },
  'aroeira':      { nome: 'Aroeira-pimenteira', cientifico: 'Schinus terebinthifolia',    agua: 'baixa', porte: 'pequeno', calcada: true },
  'pitangueira':  { nome: 'Pitangueira',        cientifico: 'Eugenia uniflora',           agua: 'alta',  porte: 'pequeno', calcada: true },
  'craibeira':    { nome: 'Craibeira',          cientifico: 'Tabebuia aurea',             agua: 'baixa', porte: 'medio',   calcada: true },
  'flamboyant':   { nome: 'Flamboyant',         cientifico: 'Delonix regia',              agua: 'media', porte: 'grande',  calcada: false, obs: 'Raízes superficiais e copa muito larga: melhor em praças e canteiros largos.' },
  'ficus':        { nome: 'Fícus',              cientifico: 'Ficus benjamina',            agua: 'alta',  porte: 'grande',  calcada: false, obs: 'Raízes agressivas: quebram calçada e tubulação. Candidata a substituição.' },
  'desconhecida': { nome: 'Não identificada',   cientifico: '—',                          agua: 'media', porte: 'medio',   calcada: true, obs: 'Identificar a espécie em vistoria.' }
};

// origem: de onde veio a árvore
Arbo.ORIGENS = {
  'prefeitura':     { nome: 'Plantio da prefeitura', cor: '#2e7d32' },
  'autorizada':     { nome: 'Munícipe (autorizada)', cor: '#1565c0' },
  'nao-cadastrada': { nome: 'Não cadastrada',        cor: '#ef6c00' },
  'compensacao':    { nome: 'Compensação de obra', cor: '#0e8f86' },
  'osm':            { nome: 'Importada do OSM',      cor: '#6a1b9a' }
};

// Estado de saúde registrado em vistoria (pela equipe ou por um agente voluntário)
Arbo.SAUDE = {
  'viva':        { nome: 'Viva e saudável' },
  'estressada':  { nome: 'Estressada (folhas secas/amarelas)' },
  'morta':       { nome: 'Morta / seca (só o tronco)' },
  'substituida': { nome: 'Substituída' }
};

// Árvores de exemplo (datas relativas a hoje para o protótipo sempre parecer "vivo").
Arbo.seed = function () {
  const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return t.toISOString().slice(0, 10); };
  const lista = [
    [-8.119958, -34.895833, 'ipe-amarelo', 'prefeitura', 200, 2, 60, true, 'R. Padre Carapuceiro'],
    [-8.119602, -34.896255, 'craibeira', 'prefeitura', 420, 6, 190, true, 'R. Padre Carapuceiro'],
    [-8.119498, -34.896797, 'pau-brasil', 'prefeitura', 90, 1, 90, true, 'R. Padre Carapuceiro'],
    [-8.124503, -34.900912, 'sibipiruna', 'prefeitura', 2200, 30, 400, false, 'R. Ernesto de Paula Santos'],
    [-8.115772, -34.89961, 'oiti', 'autorizada', 300, 9, 150, false, 'R. Félix de Brito Melo'],
    [-8.116257, -34.899012, 'pitangueira', 'nao-cadastrada', 150, 12, 999, false, 'R. Félix de Brito Melo'],
    [-8.116469, -34.898271, 'ficus', 'nao-cadastrada', 900, 40, 999, false, 'R. Félix de Brito Melo'],
    [-8.118657, -34.898888, 'jacaranda', 'prefeitura', 600, 4, 200, true, 'R. Francisco da Cunha'],
    [-8.117764, -34.898256, 'manaca', 'prefeitura', 45, 0, 45, true, 'R. Francisco da Cunha'],
    [-8.119843, -34.899704, 'reseda', 'autorizada', 500, 15, 300, false, 'R. Jack Ayres'],
    [-8.120089, -34.897524, 'aroeira', 'prefeitura', 260, 7, 120, true, 'R. Dhália'],
    [-8.123974, -34.89774, 'flamboyant', 'nao-cadastrada', 365, 20, 999, false, 'R. Ribeiro de Brito'],
    [-8.121534, -34.897858, 'ipe-roxo', 'prefeitura', 700, 5, 210, true, 'Av. Conselheiro Aguiar'],
    [-8.120633, -34.899893, 'quaresmeira', 'autorizada', 120, 3, 100, false, 'R. José Trajano'],
    [-8.119975, -34.900294, 'ipe-amarelo', 'compensacao', 200, 45, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'viva', 'emp-1'],
    [-8.120245, -34.900184, 'craibeira', 'compensacao', 200, 60, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'morta', 'emp-1'],
    [-8.120482, -34.900354, 'pau-brasil', 'compensacao', 200, 60, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'estressada', 'emp-1'],
    [-8.120752, -34.900244, 'ipe-roxo', 'compensacao', 200, 45, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'viva', 'emp-1'],
    [-8.120989, -34.900414, 'manaca', 'compensacao', 200, 70, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'morta', 'emp-1'],
    [-8.121259, -34.900304, 'jacaranda', 'compensacao', 200, 60, 999, false, 'R. Prof. Júlio Ferreira de Melo', 'estressada', 'emp-1'],
    [-8.1177, -34.901195, 'oiti', 'compensacao', 800, 90, 999, false, 'Av. Fernando Simões Barbosa', 'morta', 'emp-2'],
    [-8.118108, -34.901229, 'sibipiruna', 'compensacao', 800, 120, 999, false, 'Av. Fernando Simões Barbosa', 'viva', 'emp-2'],
    [-8.118618, -34.901272, 'aroeira', 'compensacao', 800, 90, 999, false, 'Av. Fernando Simões Barbosa', 'morta', 'emp-2'],
    [-8.119128, -34.901314, 'craibeira', 'compensacao', 800, 90, 999, false, 'Av. Fernando Simões Barbosa', 'morta', 'emp-2']
  ];
  return lista.map((r, i) => ({
    id: 'arv-' + String(i + 1).padStart(4, '0'),
    lat: r[0], lng: r[1], especie: r[2], origem: r[3],
    plantio: d(r[4]),
    ultimaIrrigacao: d(r[5]),
    ultimaAdubacao: r[6] >= 999 ? null : d(r[6]),
    sensor: r[7],
    endereco: r[8],
    saude: r[9] || 'viva',
    empreendimento: r[10] || null,
    historico: [],
    obs: ''
  }));
};

// Empreendimentos com plantio compensatório (TCA). Nomes e números FICTÍCIOS, só para o protótipo.
Arbo.seedEmpreendimentos = function () {
  const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return t.toISOString().slice(0, 10); };
  return [
    { id: 'emp-1', nome: 'Residencial Mar de Boa Viagem (exemplo)', responsavel: 'Construtora Exemplo Ltda. (fictícia)',
      tca: 'Termo de compensação nº 000/2025 (exemplo)', plantio: d(200), mesesGarantia: 24, situacao: 'obra' },
    { id: 'emp-2', nome: 'Empresarial Simões Barbosa (exemplo)', responsavel: 'Incorporadora Modelo S.A. (fictícia)',
      tca: 'Termo de compensação nº 000/2023 (exemplo)', plantio: d(800), mesesGarantia: 24, situacao: 'entregue' }
  ];
};

// Pontos onde o cidadão (Agente do Futuro) pode ajudar além das árvores. Exemplos fictícios.
Arbo.seedPontosAgente = function () {
  const f = (dias) => { const t = new Date(); t.setDate(t.getDate() + dias); return t.toISOString().slice(0, 10); };
  return [
    { id: 'pt-1', tipo: 'horta', nome: 'Horta comunitária (exemplo)', lat: -8.122894, lng: -34.900104,
      endereco: 'R. Prof. Valdemar de Oliveira', quando: 'Sábados, 9h às 12h', oque: 'Plantio, rega e compostagem. Traga luva e garrafa de água.' },
    { id: 'pt-2', tipo: 'mutirao', nome: 'Mutirão de rega e cobertura morta (exemplo)', lat: -8.119142, lng: -34.897219,
      endereco: 'R. Padre Carapuceiro', data: f(5), quando: '8h às 11h', oque: 'Regar as mudas novas da rua e espalhar folhas secas no canteiro para segurar a umidade. Ferramentas fornecidas.' }
  ];
};
