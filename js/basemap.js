// Mapa de fundo vetorial (ruas reais do OpenStreetMap) para quando as imagens do mapa padrão não carregam.
window.Arbo = window.Arbo || {};
Arbo.basemapVetor = function (mapa, ruas) {
  mapa.getContainer().style.background = '#f2efe9';
  const pane = mapa.createPane('base'); pane.style.zIndex = 250; pane.style.pointerEvents = 'none';
  const lab = mapa.createPane('rotulos'); lab.style.zIndex = 260; lab.style.pointerEvents = 'none';
  const r = L.svg({ pane: 'base', padding: 0.5 });
  const st = { P: [16, '#e6a96b', '#fcd6a4'], S: [13, '#c9c38a', '#f7fabf'], T: [11, '#c6c6c6', '#ffffff'], R: [9, '#cfcfcf', '#ffffff'], D: [7, '#d9cfb8', '#f6f1e4'] };
  const grupo = [];
  ruas.filter((w) => w.k === 'W').forEach((w) => grupo.push(L.polygon(w.p, { pane: 'base', renderer: r, stroke: false, fillColor: '#a9d6e5', fillOpacity: 1, interactive: false })));
  ruas.filter((w) => w.k === 'C').forEach((w) => grupo.push(L.polyline(w.p, { pane: 'base', renderer: r, color: '#a9d6e5', weight: 30, lineJoin: 'round', interactive: false })));
  ruas.filter((w) => w.k === 'G').forEach((w) => grupo.push(L.polygon(w.p, { pane: 'base', renderer: r, color: '#a5d6a7', weight: 1, fillColor: '#c8facc', fillOpacity: 1, interactive: false })));
  [1, 2].forEach((pass) => ['D', 'R', 'T', 'S', 'P'].forEach((k) => ruas.filter((w) => w.k === k).forEach((w) => {
    const s = st[k];
    grupo.push(L.polyline(w.p, { pane: 'base', renderer: r, color: pass === 1 ? s[1] : s[2], weight: pass === 1 ? s[0] + 2 : s[0], lineCap: 'round', lineJoin: 'round', interactive: false }));
  })));
  const camada = L.layerGroup(grupo).addTo(mapa);
  // ajusta largura das ruas ao zoom
  const ajusta = () => { const f = Math.pow(2, mapa.getZoom() - 17); grupo.forEach((l) => { if (!l._w0) l._w0 = l.options.weight; if (!(l instanceof L.Polygon)) l.setStyle({ weight: Math.max(1, l._w0 * f) }); }); };
  mapa.on('zoomend', ajusta); ajusta();
  // rótulos: o trecho mais longo de cada rua
  const melhor = {};
  ruas.filter((w) => w.n && w.k !== 'G').forEach((w) => { const L0 = w.p.length; if (!melhor[w.n] || L0 > melhor[w.n].p.length) melhor[w.n] = w; });
  const rotulos = Object.values(melhor).map((w) => L.tooltip({ pane: 'rotulos', permanent: true, direction: 'center', className: 'rotulo-rua', interactive: false })
    .setLatLng(w.p[Math.floor(w.p.length / 2)]).setContent(w.n));
  const mostra = () => rotulos.forEach((t) => (mapa.getZoom() >= 17 ? t.addTo(mapa) : t.remove()));
  mapa.on('zoomend', mostra); mostra();
  mapa.setMinZoom(15);
  const todos = ruas.flatMap((w) => w.p); mapa.setMaxBounds(L.latLngBounds(todos).pad(0.15));
  mapa.attributionControl.addAttribution('Ruas &copy; colaboradores do OpenStreetMap');
  return camada;
};
