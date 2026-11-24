// Planilha CSV das árvores, com risco de queda e calendário de vistoria (abre no Excel e no Google Planilhas).
(function () {
  const A = Arbo.app, R = Arbo.risco;
  const especie = (a) => Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida;
  const n = (x) => (x == null || x === '' ? '' : String(x).replace('.', ','));
  // Célula começando com = + - @ vira fórmula no Excel (risco de "CSV injection"): prefixa com apóstrofo.
  // Números negativos (coordenadas) continuam números.
  const celula = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  function linhas() {
    const cab = ['id', 'especie', 'nome_cientifico', 'origem', 'endereco', 'latitude', 'longitude', 'plantio', 'fase', 'saude',
      'adequada_calcada', 'risco_pontos', 'risco_classe', 'ultima_vistoria', 'proxima_vistoria', 'situacao_vistoria',
      'dap_cm', 'altura_m', 'inclinacao_graus', 'ultima_poda', 'ultima_irrigacao', 'ultima_adubacao', 'adotada'];
    const corpo = A.arvores.map((a) => {
      const esp = especie(a), r = A.risco(a), p = A.proximaVistoria(a), v = r.vistoria || {};
      const sit = !p ? 'fora do calendário' : p.pendente ? 'pendente' : p.vencida ? 'vencida' : 'em dia';
      return [a.id, esp.nome, esp.cientifico, (Arbo.ORIGENS[a.origem] || {}).nome || a.origem, a.endereco || '', n(a.lat), n(a.lng),
        a.plantio || '', a.plantio ? Arbo.engine.fase(a, A.hoje) : '', (Arbo.SAUDE[a.saude || 'viva'] || {}).nome || a.saude,
        esp.calcada ? 'sim' : 'não', r.pontos ?? '', R.CLASSES[r.classe].nome, v.data || '', (p && p.data) || '', sit,
        n(v.dap), n(v.altura), n(v.inclinacao), v.ultimaPoda || '', a.ultimaIrrigacao || '', a.ultimaAdubacao || '', a.adotadaPor ? 'sim' : 'não']; // sem o nome do voluntário (LGPD)
    });
    return [cab, ...corpo];
  }

  function exportar() {
    const csv = linhas().map((l) => l.map(celula).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `arvores-${A.hojeISO()}.csv` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Arbo.auditar('Exportou planilha de árvores', `${A.arvores.length} árvores`);
  }
  A.csvArvores = linhas; // usado nos testes
  Arbo.csvCelula = celula; // também usado no CSV de chamados (js/app.js)

  document.addEventListener('click', (e) => { if (e.target.closest('[data-csv-arvores]')) exportar(); });
})();
