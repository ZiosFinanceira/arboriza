// Motor de decisão: estima a umidade do solo e decide irrigação/adubação de cada árvore.
// Funções puras (sem DOM) para poderem ser reaproveitadas no backend no futuro.
window.Arbo = window.Arbo || {};

(function () {
  // Parâmetros de referência — ajustar com agrônomo e com dados reais de sensores.
  const PARAMS = {
    limiarUmidade: { baixa: 18, media: 25, alta: 32 },   // % volumétrica abaixo da qual irrigar
    litros: { estabelecimento: 30, consolidacao: 45, estabelecida: 60 },
    chuvaAdiaMm: 10,                // chuva prevista em 48h que adia a irrigação
    adubacaoMeses: { estabelecimento: 6, consolidacao: 12 }, // estabelecida: sem rotina
    faseMeses: { estabelecimento: 24, consolidacao: 36 },
    diasAbandono: 21               // muda nova sem rega/adubo há mais que isso = abandonada
  };

  const DIA = 86400000;
  const parse = (s) => (s ? new Date(s + 'T12:00:00') : null);
  const diasEntre = (a, b) => Math.floor((b - a) / DIA);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ruído determinístico (mesma árvore + mesmo dia = mesmo valor)
  function ruido(chave) {
    let h = 2166136261;
    for (let i = 0; i < chave.length; i++) { h ^= chave.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000 - 0.5; // -0.5 .. 0.5
  }

  function idadeMeses(arv, hoje) {
    const p = parse(arv.plantio);
    return p ? Math.max(0, Math.floor(diasEntre(p, hoje) / 30.44)) : null;
  }

  function fase(arv, hoje) {
    const m = idadeMeses(arv, hoje);
    if (m === null) return 'estabelecida';
    if (m < PARAMS.faseMeses.estabelecimento) return 'estabelecimento';
    if (m < PARAMS.faseMeses.consolidacao) return 'consolidacao';
    return 'estabelecida';
  }

  // clima: { chuvaPassada3d, chuvaPrevista48h, tmax } (mm, mm, °C) — pode ser null
  function umidadeSolo(arv, hoje, clima) {
    const ult = parse(arv.ultimaIrrigacao);
    const dias = ult ? clamp(diasEntre(ult, hoje), 0, 60) : 30;
    const tmax = clima && clima.tmax != null ? clima.tmax : 27;
    const perdaDia = 1.6 + Math.max(0, tmax - 26) * 0.25;
    const chuva = clima && clima.chuvaPassada3d != null ? clima.chuvaPassada3d : 0;
    const v = 45 - dias * perdaDia + Math.min(chuva * 1.5, 30) + ruido(arv.id + hoje.toDateString()) * 6;
    return Math.round(clamp(v, 5, 55));
  }

  function recomendacaoIrrigacao(arv, hoje, clima) {
    const esp = Arbo.ESPECIES[arv.especie] || Arbo.ESPECIES.desconhecida;
    const f = fase(arv, hoje);
    const umid = umidadeSolo(arv, hoje, clima);
    const limiar = PARAMS.limiarUmidade[esp.agua];
    // árvore estabelecida só recebe água em seca severa (metade do limiar)
    const limiarEfetivo = f === 'estabelecida' ? limiar * 0.6 : limiar;
    const base = { umidade: umid, limiar: Math.round(limiarEfetivo), fase: f, litros: 0 };

    if (arv.saude === 'morta' || arv.saude === 'substituida') {
      return { ...base, acao: 'ok', prioridade: 0, motivo: 'Muda morta: não faz sentido irrigar. Programar a substituição.' };
    }

    // Adulta sem sensor: raízes profundas, vive da chuva. Sem medição real não dá para afirmar que está seca.
    if (f === 'estabelecida' && !arv.sensor) {
      return { ...base, acao: 'ok', prioridade: 0, motivo: 'Árvore estabelecida sem sensor: depende da chuva. Irrigar só em estiagem prolongada ou se a vistoria indicar estresse hídrico.' };
    }

    if (umid >= limiarEfetivo) {
      return { ...base, acao: 'ok', prioridade: 0, motivo: `Solo com ${umid}% de umidade, acima do mínimo de ${Math.round(limiarEfetivo)}%.` };
    }
    if (clima && clima.chuvaPrevista48h >= PARAMS.chuvaAdiaMm) {
      return { ...base, acao: 'adiar', prioridade: 1, motivo: `Solo seco (${umid}%), mas há ${clima.chuvaPrevista48h.toFixed(0)} mm de chuva previstos em 48h.` };
    }
    const deficit = (limiarEfetivo - umid) / limiarEfetivo; // 0..1
    const prioridade = deficit > 0.4 || f === 'estabelecimento' || arv.saude === 'estressada' ? 3 : 2;
    const litros = Math.round(PARAMS.litros[f] * (esp.agua === 'alta' ? 1.2 : esp.agua === 'baixa' ? 0.8 : 1));
    return { ...base, acao: 'irrigar', prioridade, litros, motivo: `Solo com ${umid}%, abaixo do mínimo de ${Math.round(limiarEfetivo)}% para ${esp.nome} em fase de ${nomeFase(f)}.` };
  }

  function recomendacaoAdubacao(arv, hoje) {
    const f = fase(arv, hoje);
    const intervalo = PARAMS.adubacaoMeses[f];
    if (!intervalo) return { acao: 'ok', proxima: null, motivo: 'Árvore estabelecida: adubação só se houver sinal de deficiência na vistoria.' };
    const ult = parse(arv.ultimaAdubacao) || parse(arv.plantio);
    const prox = new Date(ult.getTime()); prox.setMonth(prox.getMonth() + intervalo);
    const atrasada = prox <= hoje;
    return {
      acao: atrasada ? 'adubar' : 'ok',
      proxima: prox.toISOString().slice(0, 10),
      motivo: atrasada
        ? (arv.ultimaAdubacao ? `Última adubação há mais de ${intervalo} meses.` : 'Nenhuma adubação registrada.')
        : `Próxima adubação de cobertura prevista para ${prox.toLocaleDateString('pt-BR')}.`
    };
  }

  // Muda nova sem nenhum cuidado registrado há muito tempo = abandonada (o caso clássico das obras)
  function abandono(arv, hoje) {
    if (fase(arv, hoje) === 'estabelecida' || arv.saude === 'morta' || arv.saude === 'substituida') return null;
    const datas = [arv.ultimaIrrigacao, arv.ultimaAdubacao].filter(Boolean).map(parse);
    const ult = datas.length ? new Date(Math.max(...datas)) : parse(arv.plantio);
    const dias = ult ? diasEntre(ult, hoje) : null;
    return dias !== null && dias > PARAMS.diasAbandono ? dias : null;
  }

  function nomeFase(f) {
    return { estabelecimento: 'estabelecimento (0–2 anos)', consolidacao: 'consolidação (2–3 anos)', estabelecida: 'estabelecida (3+ anos)' }[f];
  }

  Arbo.engine = { PARAMS, abandono, idadeMeses, fase, nomeFase, umidadeSolo, recomendacaoIrrigacao, recomendacaoAdubacao };
})();
