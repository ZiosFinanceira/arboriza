// Testes das regras de risco, calendário de vistoria e diversidade.
// Rodar: node tests/risco.test.js   (não precisa instalar nada)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ctx = { window: {}, console, Date };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['data.js', 'engine.js', 'risco.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const { Arbo } = ctx;
const R = Arbo.risco;
const ESP = Arbo.ESPECIES;
const HOJE = new Date('2026-11-24T12:00:00');

let ok = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ok  ', nome); }
  catch (e) { console.error('  FALHOU', nome, '\n       ', e.message); process.exitCode = 1; }
}
const vist = (o) => ({ data: '2026-11-01', inclinacao: 0, inclinacaoRecente: false, cavidade: 'nenhuma', rachadura: false, raizes: 'ok',
  galhosSecos: false, praga: false, podaDrastica: false, fiacao: false, alvo: 'media', ultimaPoda: null, dap: 30, altura: 8, ...o });
const arv = (o = {}, v) => ({ id: 'x', especie: 'oiti', origem: 'prefeitura', saude: 'viva', plantio: '2015-01-01', ...o, vistorias: v ? [].concat(v) : undefined });

console.log('Risco de queda');
teste('sem vistoria: sem nota e classe "sem-vistoria"', () => {
  const r = R.avaliar(arv(), ESP.oiti, HOJE);
  assert.strictEqual(r.pontos, null); assert.strictEqual(r.classe, 'sem-vistoria');
});
teste('árvore sem defeitos: 0 pontos, baixo', () => {
  const r = R.avaliar(arv({}, vist()), ESP.oiti, HOJE);
  assert.strictEqual(r.pontos, 0); assert.strictEqual(r.classe, 'baixo'); assert.strictEqual(r.motivos.length, 0);
});
teste('faixas de inclinação: 9° = 0, 10° = 10, 25° = 20, 31° = 35', () => {
  const p = (g) => R.avaliar(arv({}, vist({ inclinacao: g })), ESP.oiti, HOJE).pontos;
  assert.deepStrictEqual([p(9), p(10), p(25), p(31)], [0, 10, 20, 35]);
});
teste('alvo multiplica: mesma cavidade grande vale 25 (baixa), 35 (média), 46 (alta)', () => {
  const p = (alvo) => R.avaliar(arv({}, vist({ cavidade: 'grande', alvo })), ESP.oiti, HOJE).pontos;
  assert.deepStrictEqual([p('baixa'), p('media'), p('alta')], [25, 35, 46]);
});
teste('tamanho: DAP ≥ 50 cm é grande (×1,2); DAP < 15 e altura < 5 é pequena (×0,6)', () => {
  const g = R.avaliar(arv({}, vist({ rachadura: true, dap: 50, altura: 8, ultimaPoda: '2026-01-01' })), ESP.oiti, HOJE);
  const pq = R.avaliar(arv({}, vist({ rachadura: true, dap: 10, altura: 3 })), ESP.oiti, HOJE);
  assert.strictEqual(g.tamanho, 'grande'); assert.strictEqual(g.pontos, 36);
  assert.strictEqual(pq.tamanho, 'pequena'); assert.strictEqual(pq.pontos, 18);
});
teste('árvore grande sem poda registrada ganha 5 pontos; com poda recente, não', () => {
  const sem = R.avaliar(arv({}, vist({ dap: 60 })), ESP.oiti, HOJE);
  const com = R.avaliar(arv({}, vist({ dap: 60, ultimaPoda: '2025-06-01' })), ESP.oiti, HOJE);
  assert.strictEqual(sem.pontos, 6); assert.ok(sem.motivos.some((m) => /poda/.test(m.texto)));
  assert.strictEqual(com.pontos, 0);
});
teste('nota nunca passa de 100 e vira crítico', () => {
  const r = R.avaliar(arv({ saude: 'morta' }, vist({ inclinacao: 40, inclinacaoRecente: true, cavidade: 'grande', rachadura: true, alvo: 'alta' })), ESP.oiti, HOJE);
  assert.strictEqual(r.pontos, 100); assert.strictEqual(r.classe, 'critico');
});
teste('limites das classes: 24 baixo, 25 moderado, 49 moderado, 50 alto, 74 alto, 75 crítico', () => {
  const classe = (p) => R.PARAMS.classes.find(([ate]) => p < ate)[1];
  assert.deepStrictEqual([24, 25, 49, 50, 74, 75].map(classe), ['baixo', 'moderado', 'moderado', 'alto', 'alto', 'critico']);
});
teste('usa a vistoria mais recente, não a última da lista', () => {
  const r = R.avaliar(arv({}, [vist({ data: '2026-10-01', rachadura: false }), vist({ data: '2025-01-01', rachadura: true })]), ESP.oiti, HOJE);
  assert.strictEqual(r.vistoria.data, '2026-10-01'); assert.strictEqual(r.pontos, 0);
});
teste('espécie inadequada só pesa quando a árvore é grande', () => {
  const grande = R.avaliar(arv({ especie: 'ficus' }, vist({ dap: 70, ultimaPoda: '2026-01-01' })), ESP.ficus, HOJE);
  const media = R.avaliar(arv({ especie: 'ficus' }, vist({ dap: 30 })), ESP.ficus, HOJE);
  assert.strictEqual(grande.pontos, 6); assert.strictEqual(media.pontos, 0);
});
teste('campos numéricos vazios ou inválidos não quebram o cálculo', () => {
  const r = R.avaliar(arv({}, vist({ dap: '', altura: 'abc', inclinacao: '' })), ESP.oiti, HOJE);
  assert.strictEqual(r.pontos, 0); assert.strictEqual(r.tamanho, 'media');
});

console.log('Calendário de vistoria');
teste('sem vistoria: pendente e vencida', () => {
  const p = R.proximaVistoria(arv(), ESP.oiti, HOJE);
  assert.ok(p.pendente && p.vencida);
});
teste('baixo risco: 24 meses; árvore grande: no máximo 12', () => {
  assert.strictEqual(R.proximaVistoria(arv({}, vist()), ESP.oiti, HOJE).data, '2028-11-01');
  assert.strictEqual(R.proximaVistoria(arv({}, vist({ dap: 60, ultimaPoda: '2026-01-01' })), ESP.oiti, HOJE).data, '2027-11-01');
});
teste('alvo de ocupação alta: no máximo 12 meses', () => {
  assert.strictEqual(R.proximaVistoria(arv({}, vist({ alvo: 'alta' })), ESP.oiti, HOJE).meses, 12);
});
teste('crítico: 1 mês; vencida quando a data passou', () => {
  const p = R.proximaVistoria(arv({ saude: 'morta' }, vist({ data: '2026-09-01', cavidade: 'grande', rachadura: true })), ESP.oiti, HOJE);
  assert.strictEqual(p.meses, 1); assert.strictEqual(p.data, '2026-10-01'); assert.ok(p.vencida); assert.ok(p.dias < 0);
});
teste('local planejado e árvore substituída ficam fora do calendário', () => {
  assert.strictEqual(R.proximaVistoria(arv({ origem: 'planejada' }), ESP.oiti, HOJE), null);
  assert.strictEqual(R.proximaVistoria(arv({ saude: 'substituida' }), ESP.oiti, HOJE), null);
});

teste('virada de mês: vistoria em 31/01 com ciclo de 1 mês vence em 28/02 (não 03/03)', () => {
  const p = R.proximaVistoria(arv({ saude: 'morta' }, vist({ data: '2026-01-31', cavidade: 'grande', rachadura: true })), ESP.oiti, HOJE);
  assert.strictEqual(p.data, '2026-02-28');
});
teste('29/02 + 12 meses = 28/02 do ano seguinte', () => {
  const p = R.proximaVistoria(arv({}, vist({ data: '2028-02-29', dap: 60, ultimaPoda: '2028-01-01' })), ESP.oiti, HOJE);
  assert.strictEqual(p.data, '2029-02-28');
});

console.log('Dados malformados (ex.: arquivo importado)');
teste('valores estranhos não quebram nem geram NaN', () => {
  const casos = [
    { alvo: 'constructor' }, { cavidade: 'toString' }, { raizes: '__proto__' }, { inclinacao: 'Infinity' }, { inclinacao: -50 },
    { inclinacao: 1e9 }, { rachadura: 'false' }, { ultimaPoda: 'ontem' }, { dap: 'NaN', altura: {} }
  ];
  casos.forEach((c) => {
    const r = R.avaliar(arv({}, vist(c)), ESP.oiti, HOJE);
    assert.ok(Number.isFinite(r.pontos) && r.pontos >= 0 && r.pontos <= 100, JSON.stringify(c) + ' → ' + r.pontos);
    assert.ok(R.CLASSES[r.classe], JSON.stringify(c));
  });
});
teste('inclinação acima de 90° conta como 90° (35 pontos)', () => {
  assert.strictEqual(R.avaliar(arv({}, vist({ inclinacao: 1e9 })), ESP.oiti, HOJE).pontos, 35);
});
teste('vistorias que não são lista, ou com data inválida, são ignoradas', () => {
  assert.strictEqual(R.avaliar(arv({ vistorias: {} }), ESP.oiti, HOJE).classe, 'sem-vistoria');
  assert.strictEqual(R.avaliar(arv({}, [vist({ data: 20260101 }), vist({ data: '2026-02-30' }), null]), ESP.oiti, HOJE).classe, 'sem-vistoria');
  const p = R.proximaVistoria(arv({}, vist({ data: 20260101 })), ESP.oiti, HOJE);
  assert.ok(p.pendente);
});
teste('dataOk recusa datas impossíveis', () => {
  assert.deepStrictEqual(['2026-02-28', '2026-02-30', '2026-13-01', '26-01-01', 20260101].map(R.dataOk), [true, false, false, false, false]);
});

console.log('Diversidade');
const lote = (pares) => pares.flatMap(([esp, n], i) => Array.from({ length: n }, (_, j) => arv({ id: `${esp}-${j}`, especie: esp })));
teste('espécie acima de 10% gera alerta; até 10% não', () => {
  const d = R.diversidade(lote([['oiti', 6], ['ipe-amarelo', 3], ['quaresmeira', 3], ['manaca', 3], ['pau-brasil', 3], ['sibipiruna', 3], ['reseda', 3], ['jacaranda', 3], ['aroeira', 3], ['pitangueira', 3]]), ESP);
  assert.strictEqual(d.total, 33);
  assert.ok(d.especies.find((e) => e.k === 'oiti').alerta);           // 6/33 = 18%
  assert.ok(!d.especies.find((e) => e.k === 'reseda').alerta);        // 3/33 = 9%
});
teste('exatamente 10% não gera alerta', () => {
  const d = R.diversidade(lote([['oiti', 3], ['ipe-amarelo', 3], ['quaresmeira', 3], ['manaca', 3], ['pau-brasil', 3], ['sibipiruna', 3], ['reseda', 3], ['jacaranda', 3], ['aroeira', 3], ['pitangueira', 3]]), ESP);
  assert.ok(d.especies.every((e) => !e.alerta));                      // 3/30 = 10%
});
teste('gênero: os dois ipês (Handroanthus) somam no mesmo gênero', () => {
  const d = R.diversidade(lote([['ipe-amarelo', 6], ['ipe-roxo', 3], ['oiti', 21]]), ESP);
  const h = d.generos.find((g) => g.k === 'Handroanthus');
  assert.strictEqual(h.n, 9); assert.ok(h.alerta); // 30% > 20%
});
teste('mortas, planejadas e não identificadas ficam fora da porcentagem', () => {
  const l = [...lote([['oiti', 10]]), arv({ id: 'm', especie: 'ipe-roxo', saude: 'morta' }), arv({ id: 'p', especie: 'ipe-roxo', origem: 'planejada' }), arv({ id: 'd', especie: 'desconhecida' })];
  const d = R.diversidade(l, ESP);
  assert.strictEqual(d.total, 10); assert.strictEqual(d.naoIdentificadas, 1);
  assert.strictEqual(d.especies.length, 1);
});
teste('com menos de 30 árvores identificadas não emite alerta', () => {
  const d = R.diversidade(lote([['oiti', 29]]), ESP);
  assert.ok(d.poucas); assert.ok(!d.especies[0].alerta);
});
teste('inventário vazio não quebra', () => {
  const d = R.diversidade([], ESP);
  assert.strictEqual(d.total, 0); assert.deepStrictEqual([...d.especies], []);
});

console.log('Dados de exemplo');
teste('exemplos de vistoria cobrem as quatro classes de risco', () => {
  const arvs = Arbo.seed();
  const classes = new Set(arvs.map((a) => R.avaliar(a, ESP[a.especie], new Date()).classe));
  ['sem-vistoria', 'baixo', 'moderado', 'alto', 'critico'].forEach((c) => assert.ok(classes.has(c), 'faltou ' + c));
});

console.log(`\n${ok} testes passaram${process.exitCode ? ' — HÁ FALHAS' : ''}.`);
