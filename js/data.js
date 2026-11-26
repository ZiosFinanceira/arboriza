// Dados de referência do protótipo: configuração da cidade, catálogo de espécies e árvores de exemplo.
// Tudo aqui é editável. Valores de água/adubação são REFERÊNCIAS para o protótipo e devem ser
// validados com um engenheiro agrônomo / florestal antes de uso real.
window.Arbo = window.Arbo || {};

Arbo.CONFIG = {
  cidade: 'Recife - PE',
  centro: [-8.06315, -34.87113], // Marco Zero, Recife Antigo
  zoom: 16,
  baseEquipes: [-8.071135, -34.876066], // base das equipes (exemplo)
  storageKey: 'arboriza.v4',
  basemap: 'osm', // 'osm' = mapa padrão; 'vetor' = desenha as ruas de js/ruas.js (usado onde imagens externas são bloqueadas)
  // Endereço público do site (ex.: 'https://SEU-USUARIO.github.io/arboriza/'). É para onde o QR Code da placa aponta.
  // Vazio = usa o endereço em que o sistema está aberto (só funciona no celular se o site já estiver publicado).
  urlPublica: 'https://ziosfinanceira.github.io/arboriza/',
  // Para onde o cidadão manda o aviso feito pela ficha pública da árvore (QR Code). EXEMPLOS: trocar pelos canais reais.
  contato: { orgao: 'Prefeitura do Recife (exemplo)', whatsapp: '', email: 'arborizacao@prefeitura.exemplo', telefone: '156' }
};

// agua: necessidade hídrica relativa | porte: tamanho adulto | calcada: adequada para calçada?
Arbo.ESPECIES = {
  'ipe-amarelo':  { nome: 'Ipê-amarelo',        cientifico: 'Handroanthus chrysotrichus', agua: 'baixa', porte: 'medio',   calcada: true, origem: 'nativa' },
  'ipe-roxo':     { nome: 'Ipê-roxo',           cientifico: 'Handroanthus impetiginosus', agua: 'baixa', porte: 'grande',  calcada: true, obs: 'Exige calçada larga e sem fiação baixa.', origem: 'nativa' },
  'quaresmeira':  { nome: 'Quaresmeira',        cientifico: 'Pleroma granulosum',         agua: 'media', porte: 'pequeno', calcada: true, origem: 'nativa' },
  'manaca':       { nome: 'Manacá-da-serra',    cientifico: 'Pleroma mutabile',           agua: 'media', porte: 'pequeno', calcada: true, origem: 'nativa' },
  'pau-brasil':   { nome: 'Pau-brasil',         cientifico: 'Paubrasilia echinata',       agua: 'media', porte: 'medio',   calcada: true, origem: 'nativa' },
  'sibipiruna':   { nome: 'Sibipiruna',         cientifico: 'Cenostigma pluviosum',       agua: 'media', porte: 'grande',  calcada: true, obs: 'Copa ampla; evitar sob fiação.', origem: 'nativa' },
  'oiti':         { nome: 'Oiti',               cientifico: 'Moquilea tomentosa',         agua: 'media', porte: 'medio',   calcada: true, origem: 'nativa' },
  'reseda':       { nome: 'Resedá',             cientifico: 'Lagerstroemia indica',       agua: 'baixa', porte: 'pequeno', calcada: true, origem: 'exotica' },
  'jacaranda':    { nome: 'Jacarandá-mimoso',   cientifico: 'Jacaranda mimosifolia',      agua: 'media', porte: 'medio',   calcada: true, origem: 'exotica' },
  'aroeira':      { nome: 'Aroeira-pimenteira', cientifico: 'Schinus terebinthifolia',    agua: 'baixa', porte: 'pequeno', calcada: true, origem: 'nativa' },
  'pitangueira':  { nome: 'Pitangueira',        cientifico: 'Eugenia uniflora',           agua: 'alta',  porte: 'pequeno', calcada: true, origem: 'nativa' },
  'craibeira':    { nome: 'Craibeira',          cientifico: 'Tabebuia aurea',             agua: 'baixa', porte: 'medio',   calcada: true, origem: 'nativa' },
  'flamboyant':   { nome: 'Flamboyant',         cientifico: 'Delonix regia',              agua: 'media', porte: 'grande',  calcada: false, obs: 'Raízes superficiais e copa muito larga: melhor em praças e canteiros largos.', origem: 'exotica' },
  'castanhola':   { nome: 'Castanhola',         cientifico: 'Terminalia catappa',         agua: 'media', porte: 'grande',  calcada: false, origem: 'exotica', obs: 'Raízes superficiais que levantam o piso e copa muito larga: melhor em praças e áreas abertas.' },
  'pau-ferro':    { nome: 'Pau-ferro',          cientifico: 'Libidibia ferrea',           agua: 'baixa', porte: 'grande',  calcada: true, origem: 'nativa', obs: 'Só em calçada larga, sem fiação.' },
  'ficus':        { nome: 'Fícus',              cientifico: 'Ficus benjamina',            agua: 'alta',  porte: 'grande',  calcada: false, obs: 'Raízes agressivas: quebram calçada e tubulação. Candidata a substituição.', origem: 'exotica' },
  'desconhecida': { nome: 'Não identificada',   cientifico: '—',                          agua: 'media', porte: 'medio',   calcada: true, obs: 'Identificar a espécie em vistoria.' }
};

// origem: de onde veio a árvore
Arbo.ORIGENS = {
  'prefeitura':     { nome: 'Plantio da prefeitura', cor: '#2e7d32' },
  'autorizada':     { nome: 'Munícipe (autorizada)', cor: '#1565c0' },
  'nao-cadastrada': { nome: 'Não cadastrada',        cor: '#ef6c00' },
  'compensacao':    { nome: 'Compensação de obra', cor: '#0e8f86' },
  'planejada':      { nome: 'Local aprovado para plantio', cor: '#9be3b0' },
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
    [-8.062553, -34.871518, 'ipe-amarelo', 'prefeitura', 200, 2, 60, true, 'R. do Bom Jesus'],
    [-8.06453, -34.873023, 'craibeira', 'prefeitura', 420, 6, 190, true, 'R. da Moeda'],
    [-8.062783, -34.872652, 'pau-brasil', 'prefeitura', 90, 1, 90, true, 'Av. Rio Branco'],
    [-8.061228, -34.872245, 'sibipiruna', 'prefeitura', 2200, 30, 400, false, 'R. do Apolo'],
    [-8.063446, -34.873026, 'oiti', 'autorizada', 300, 9, 150, false, 'Av. Marquês de Olinda'],
    [-8.061849, -34.872056, 'pitangueira', 'nao-cadastrada', 150, 12, 999, false, 'R. da Guia'],
    [-8.064885, -34.873425, 'ficus', 'nao-cadastrada', 900, 40, 999, false, 'R. Madre de Deus'],
    [-8.062886, -34.87694, 'jacaranda', 'prefeitura', 600, 4, 200, true, 'R. Imperador Dom Pedro II'],
    [-8.068842, -34.881372, 'manaca', 'prefeitura', 45, 0, 45, true, 'Av. Dantas Barreto'],
    [-8.06422, -34.879467, 'reseda', 'autorizada', 500, 15, 300, false, 'R. Nova'],
    [-8.061307, -34.879616, 'aroeira', 'prefeitura', 260, 7, 120, true, 'R. do Sol'],
    [-8.0538, -34.876332, 'flamboyant', 'nao-cadastrada', 365, 20, 999, false, 'R. da Aurora'],
    [-8.056912, -34.87016, 'ipe-roxo', 'prefeitura', 700, 5, 210, true, 'R. de São Jorge'],
    [-8.064884, -34.872098, 'quaresmeira', 'autorizada', 120, 3, 100, false, 'Av. Alfredo Lisboa'],
    [-8.054885, -34.872103, 'ipe-amarelo', 'compensacao', 200, 45, 999, false, 'Av. Cais do Apolo', 'viva', 'emp-1'],
    [-8.056265, -34.872177, 'craibeira', 'compensacao', 200, 60, 999, false, 'Av. Cais do Apolo', 'morta', 'emp-1'],
    [-8.057616, -34.872463, 'pau-brasil', 'compensacao', 200, 60, 999, false, 'Av. Cais do Apolo', 'estressada', 'emp-1'],
    [-8.058995, -34.872536, 'ipe-roxo', 'compensacao', 200, 45, 999, false, 'Av. Cais do Apolo', 'viva', 'emp-1'],
    [-8.060332, -34.872861, 'manaca', 'compensacao', 200, 70, 999, false, 'Av. Cais do Apolo', 'morta', 'emp-1'],
    [-8.061591, -34.87339, 'jacaranda', 'compensacao', 200, 60, 999, false, 'Av. Cais do Apolo', 'estressada', 'emp-1'],
    [-8.062833, -34.876695, 'oiti', 'compensacao', 800, 90, 999, false, 'R. Siqueira Campos', 'morta', 'emp-2'],
    [-8.062771, -34.87715, 'sibipiruna', 'compensacao', 800, 120, 999, false, 'R. Siqueira Campos', 'viva', 'emp-2'],
    [-8.062708, -34.877605, 'aroeira', 'compensacao', 800, 90, 999, false, 'R. Siqueira Campos', 'morta', 'emp-2'],
    [-8.062646, -34.87806, 'craibeira', 'compensacao', 800, 90, 999, false, 'R. Siqueira Campos', 'morta', 'emp-2']
  ];
  const arvores = lista.map((r, i) => ({
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
  // vistorias técnicas de exemplo (js/risco.js)
  return Arbo.risco ? Arbo.risco.seedVistorias(arvores) : arvores;
};

// Largura da calçada (m) e fiação aérea de algumas árvores de exemplo (FICTÍCIO), para mostrar o recomendador
Arbo.LOCAL_EXEMPLO = {
  'arv-0001': [2.4, false], 'arv-0002': [1.8, true], 'arv-0003': [2.2, false], 'arv-0004': [1.8, true],
  'arv-0007': [1.6, false], 'arv-0008': [3.0, false], 'arv-0009': [1.6, true], 'arv-0012': [2.0, true], 'arv-0013': [2.0, true]
};

// Empreendimentos com plantio compensatório (TCA). Nomes e números FICTÍCIOS, só para o protótipo.
Arbo.seedEmpreendimentos = function () {
  const d = (dias) => { const t = new Date(); t.setDate(t.getDate() - dias); return t.toISOString().slice(0, 10); };
  return [
    { id: 'emp-1', nome: 'Residencial Cais do Apolo (exemplo)', responsavel: 'Construtora Exemplo Ltda. (fictícia)',
      tca: 'Termo de compensação nº 000/2025 (exemplo)', plantio: d(200), mesesGarantia: 24, situacao: 'obra' },
    { id: 'emp-2', nome: 'Empresarial Santo Antônio (exemplo)', responsavel: 'Incorporadora Modelo S.A. (fictícia)',
      tca: 'Termo de compensação nº 000/2023 (exemplo)', plantio: d(800), mesesGarantia: 24, situacao: 'entregue' }
  ];
};

// Sugestões de moradores (exemplos fictícios)
Arbo.seedSugestoes = function () {
  const h = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
  return [
    { id: 'sg-0001', tipo: 'plantio', lat: -8.057159, lng: -34.870736, endereco: 'R. Bernardo Vieira de Melo', descricao: 'Calçada larga, sem nenhuma árvore e com sol o dia inteiro.', autor: { nome: 'Maria Oliveira (exemplo)', email: 'maria@exemplo.com', bairro: 'Recife' }, criada: h(2), status: 'analise', apoios: 3 },
    { id: 'sg-0002', tipo: 'arvore_nao_mapeada', lat: -8.063816, lng: -34.87291, endereco: 'R. Mariz e Barros', descricao: 'Tem um oiti grande na frente do número 300 que não aparece no mapa.', autor: { nome: 'João Santos (exemplo)', email: 'joao@exemplo.com', bairro: 'Recife' }, criada: h(1), status: 'analise', apoios: 0 },
    { id: 'sg-0003', tipo: 'muda_cuidado', lat: -8.06431, lng: -34.873033, endereco: 'R. Tomazina', descricao: 'Muda com o protetor quebrado e sem tutor.', autor: { nome: 'Ana Lima (exemplo)', email: 'ana@exemplo.com', bairro: 'Santo Amaro' }, criada: h(6), status: 'recusada', motivo: 'Duplicada: já existe chamado para este local.', avaliador: 'Equipe Vistoria 03', decididaEm: h(5), apoios: 0 }
  ];
};

// Pontos onde o cidadão (Agente do Futuro) pode ajudar além das árvores. Exemplos fictícios.
Arbo.seedPontosAgente = function () {
  const f = (dias) => { const t = new Date(); t.setDate(t.getDate() + dias); return t.toISOString().slice(0, 10); };
  return [
    { id: 'pt-1', tipo: 'horta', nome: 'Horta comunitária (exemplo)', lat: -8.060417, lng: -34.87205,
      endereco: 'R. do Observatório', quando: 'Sábados, 9h às 12h', oque: 'Plantio, rega e compostagem. Traga luva e garrafa de água.' },
    { id: 'pt-2', tipo: 'mutirao', nome: 'Mutirão de rega e cobertura morta (exemplo)', lat: -8.061851, lng: -34.871707,
      endereco: 'R. Domingos José Martins', data: f(5), quando: '8h às 11h', oque: 'Regar as mudas novas da rua e espalhar folhas secas no canteiro para segurar a umidade. Ferramentas fornecidas.' }
  ];
};
