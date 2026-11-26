// Testes das regras de "espécie certa para cada calçada" (js/especies.js). Rodar: node tests/especies.test.js
global.window = global;
require('../js/data.js');
require('../js/especies.js');
const E = Arbo.especieCerta, ESP = Arbo.ESPECIES;
let ok = 0, falhas = 0;
const t = (nome, cond) => { if (cond) ok++; else { falhas++; console.log('FALHOU:', nome); } };

let r = E.recomendar(ESP, 1.2, false);
t('calçada abaixo do mínimo não recebe árvore', r.ok === false && r.servem.length === 0);
r = E.recomendar(ESP, '1,6', false);
t('vírgula decimal é aceita', r.ok === true && r.portes.join() === 'pequeno');
r = E.recomendar(ESP, 2.2, false);
t('2,2 m sem fiação: pequeno e médio', r.portes.join() === 'pequeno,medio');
t('2,2 m: nenhuma de porte grande serve', r.servem.every((x) => x.porte !== 'grande'));
r = E.recomendar(ESP, 3, true);
t('com fiação, só porte pequeno', r.portes.join() === 'pequeno' && r.servem.every((x) => x.porte === 'pequeno'));
r = E.recomendar(ESP, 3, false);
t('calçada larga sem fiação aceita porte grande', r.portes.includes('grande') && r.servem.some((x) => x.porte === 'grande'));
t('espécie inadequada para calçada nunca é recomendada', r.servem.every((x) => ESP[x.id].calcada));
t('fícus, flamboyant e castanhola fora da lista', !r.servem.some((x) => ['ficus', 'flamboyant', 'castanhola'].includes(x.id)));
t('nativas vêm antes das exóticas entre as que servem', (() => { const i = r.servem.findIndex((x) => !x.nativa); return i === -1 || r.servem.slice(i).every((x) => !x.nativa); })());
r = E.recomendar(ESP, '', null);
t('sem largura: pede a medida', r.ok === null);
r = E.recomendar(ESP, 2.5, null);
t('fiação não informada: avisa para confirmar', /confirme/.test(r.motivo));
t('conferir: árvore sem dados de local devolve null', E.conferir({ especie: 'oiti' }, ESP) === null);
t('conferir: sibipiruna sob fiação não serve', E.conferir({ especie: 'sibipiruna', larguraCalcada: 3, fiacaoAerea: true }, ESP).serve === false);
t('conferir: pitangueira em 1,8 m com fiação serve', E.conferir({ especie: 'pitangueira', larguraCalcada: 1.8, fiacaoAerea: true }, ESP).serve === true);
t('todas as espécies do catálogo têm origem (nativa/exótica)', Object.entries(ESP).every(([k, e]) => k === 'desconhecida' || ['nativa', 'exotica'].includes(e.origem)));

console.log(`${ok} testes passaram, ${falhas} falharam`);
process.exit(falhas ? 1 : 0);
