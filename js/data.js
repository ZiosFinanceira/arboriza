// Dados de referência do protótipo: configuração da cidade, catálogo de espécies e árvores de exemplo.
// Tudo aqui é editável. Valores de água/adubação são REFERÊNCIAS para o protótipo e devem ser
// validados com um engenheiro agrônomo / florestal antes de uso real.
window.Arbo = window.Arbo || {};

Arbo.CONFIG = {
  cidade: 'São Paulo - SP',
  centro: [-23.5614, -46.6559], // região da Av. Paulista
  zoom: 16,
  storageKey: 'arboriza.v1'
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
  'ficus':        { nome: 'Fícus',              cientifico: 'Ficus benjamina',            agua: 'alta',  porte: 'grande',  calcada: false, obs: 'Raízes agressivas: quebram calçada e tubulação. Candidata a substituição.' },
  'desconhecida': { nome: 'Não identificada',   cientifico: '—',                          agua: 'media', porte: 'medio',   calcada: true, obs: 'Identificar a espécie em vistoria.' }
};

// origem: de onde veio a árvore
Arbo.ORIGENS = {
  'prefeitura':     { nome: 'Plantio da prefeitura', cor: '#2e7d32' },
  'autorizada':     { nome: 'Munícipe (autorizada)', cor: '#1565c0' },
  'nao-cadastrada': { nome: 'Não cadastrada',        cor: '#ef6c00' },
  'osm':            { nome: 'Importada do OSM',      cor: '#6a1b9a' }
};

// Árvores de exemplo (datas relativas a hoje para o protótipo sempre parecer "vivo").
Arbo.seed = function () {
  const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return t.toISOString().slice(0, 10); };
  const lista = [
    [-23.5636, -46.6543, 'ipe-amarelo', 'prefeitura',     200, 2,  60, true,  'Al. Santos'],
    [-23.5631, -46.6551, 'quaresmeira', 'prefeitura',     420, 6,  190, true, 'Al. Santos'],
    [-23.5626, -46.6560, 'pau-brasil',  'prefeitura',      90, 1,  90, true,  'Al. Santos'],
    [-23.5620, -46.6569, 'sibipiruna',  'prefeitura',    2200, 30, 400, false, 'Al. Santos'],
    [-23.5602, -46.6548, 'oiti',        'autorizada',     300, 9,  150, false, 'R. Peixoto Gomide'],
    [-23.5597, -46.6556, 'pitangueira', 'nao-cadastrada', 150, 12, 999, false, 'R. Peixoto Gomide'],
    [-23.5592, -46.6563, 'ficus',       'nao-cadastrada', 900, 40, 999, false, 'R. Peixoto Gomide'],
    [-23.5609, -46.6578, 'jacaranda',   'prefeitura',     600, 4,  200, true,  'R. Pamplona'],
    [-23.5615, -46.6586, 'manaca',      'prefeitura',      45, 0,  45, true,   'R. Pamplona'],
    [-23.5644, -46.6566, 'reseda',      'autorizada',     500, 15, 300, false, 'R. Haddock Lobo'],
    [-23.5650, -46.6575, 'aroeira',     'prefeitura',     260, 7,  120, true,  'R. Haddock Lobo'],
    [-23.5588, -46.6538, 'desconhecida','nao-cadastrada', 365, 20, 999, false, 'R. Augusta'],
    [-23.5582, -46.6547, 'ipe-roxo',    'prefeitura',     700, 5,  210, true,  'R. Augusta'],
    [-23.5657, -46.6555, 'quaresmeira', 'autorizada',     120, 3,  100, false, 'Al. Jaú']
  ];
  return lista.map((r, i) => ({
    id: 'arv-' + String(i + 1).padStart(4, '0'),
    lat: r[0], lng: r[1], especie: r[2], origem: r[3],
    plantio: d(r[4]),
    ultimaIrrigacao: d(r[5]),
    ultimaAdubacao: r[6] >= 999 ? null : d(r[6]),
    sensor: r[7],
    endereco: r[8],
    obs: ''
  }));
};
