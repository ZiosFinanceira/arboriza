// Placa de identificação com QR Code. O QR abre a ficha pública da árvore (ficha.html) no celular de
// qualquer pessoa, sem login. Como o protótipo ainda não tem servidor, o link leva junto um resumo da árvore
// no momento da impressão (depois do "#", parte que o navegador não envia a servidor nenhum).
// Na versão com servidor, o mesmo link continua valendo: a ficha passa a buscar os dados atuais pelo ?id=.
window.Arbo = window.Arbo || {};

(function () {
  // ---------- codificação do resumo (também usada pela ficha pública e pelos testes) ----------
  const b64url = {
    de(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    para(txt) {
      const b = atob(txt.replace(/-/g, '+').replace(/_/g, '/'));
      return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
    }
  };

  // Campos separados por "|", na ordem abaixo, sem nomes: quanto menor o texto, menos denso o QR Code
  // e mais fácil de ler com a câmera (placa ao ar livre, de perto ou de longe).
  // A classe de risco e a próxima vistoria NÃO vão no QR: mudam com o tempo e a placa impressa ficaria
  // dizendo algo desatualizado. Elas aparecem na ficha quando o sistema tiver servidor (consulta pelo ?id=).
  const CAMPOS = ['v', 'id', 'especie', 'origem', 'saude', 'gerado', 'endereco', 'plantio', 'lat', 'lng', 'vistoria'];
  const VERSAO = '3';

  function resumo(a, risco, prox, hojeISO) {
    const limpa = (s, max) => String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, max);
    const coord = (x) => (typeof x === 'number' && isFinite(x) ? String(Math.round(x * 1e5) / 1e5) : '');
    const v = risco && risco.vistoria;
    return [VERSAO, a.id, limpa(a.especie, 40), limpa(a.origem, 40), limpa(a.saude || 'viva', 20), hojeISO, limpa(a.endereco, 50), a.plantio || '',
      coord(a.lat), coord(a.lng), v ? v.data : ''].join('|');
  }

  function link(base, a, risco, prox, hojeISO) {
    const u = new URL('ficha.html', base);
    u.search = 'id=' + encodeURIComponent(a.id);
    u.hash = 'd=' + b64url.de(resumo(a, risco, prox, hojeISO));
    return u.toString();
  }

  // Lê e VALIDA o resumo vindo do link: qualquer pessoa pode montar um link, então nada é confiado sem checar.
  // idUrl: o ?id= do endereço; precisa bater com o número da árvore dentro do resumo
  function ler(hash, cat, idUrl) {
    const m = /(?:^#|&)d=([A-Za-z0-9_-]{4,1000})/.exec(hash || '');
    if (!m) return null;
    let partes;
    try { partes = b64url.para(m[1]).split('|'); } catch (e) { return null; }
    if (partes.length !== CAMPOS.length || partes[0] !== VERSAO) return null;
    const o = Object.fromEntries(CAMPOS.map((k, i) => [k, partes[i]]));
    const data = (s) => (Arbo.risco && Arbo.risco.dataOk ? Arbo.risco.dataOk(s) : /^\d{4}-\d{2}-\d{2}$/.test(s)) ? s : null;
    const de = (k, lista) => (k && Object.prototype.hasOwnProperty.call(lista, k) ? k : null);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(o.id)) return null;
    if (idUrl != null && idUrl !== o.id) return null;
    const lat = o.lat === '' ? NaN : +o.lat, lng = o.lng === '' ? NaN : +o.lng;
    const coords = isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
    return {
      id: o.id, especie: de(o.especie, cat.ESPECIES) || 'desconhecida', origem: de(o.origem, cat.ORIGENS), saude: de(o.saude, cat.SAUDE) || 'viva',
      endereco: o.endereco.slice(0, 50), plantio: data(o.plantio), coords,
      vistoria: data(o.vistoria), gerado: data(o.gerado)
    };
  }

  Arbo.placa = { resumo, link, ler, b64url };

  // ---------- interface (só no sistema; a ficha pública usa apenas as funções acima) ----------
  const A = Arbo.app;
  if (!A || !document.getElementById('dlg-placa')) return;
  const { esc } = A;
  const $ = (s) => document.querySelector(s);
  const impressao = document.createElement('div');
  impressao.id = 'placa-impressao';
  impressao.setAttribute('aria-hidden', 'true');
  document.body.appendChild(impressao);
  let atual = null;

  function baseUrl() {
    const cfg = (Arbo.CONFIG.urlPublica || '').trim();
    return cfg ? (cfg.endsWith('/') ? cfg : cfg + '/') : new URL('.', location.href).toString();
  }
  function avisoEndereco(base) {
    if (/^file:/.test(base)) return 'O sistema está aberto como arquivo no computador: o QR Code não vai abrir no celular. Publique o site (ex.: GitHub Pages) e informe o endereço em CONFIG.urlPublica, no arquivo js/data.js.';
    if (/^https?:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|[^/]+\.local[:/])/.test(base)) return 'O sistema está aberto num endereço local: o QR Code só abre em aparelhos da mesma rede. Para placas definitivas, informe o endereço publicado em CONFIG.urlPublica (js/data.js).';
    return '';
  }

  function placaHTML(a, url) {
    const esp = Arbo.ESPECIES[a.especie] || Arbo.ESPECIES.desconhecida;
    const qr = qrcode(0, 'M');
    qr.addData(url, 'Byte');
    qr.make();
    return `<div class="placa">
      <div class="placa-topo"><span>${esc(Arbo.CONFIG.contato.orgao)}</span><b>Arboriza</b></div>
      <div class="placa-corpo">
        <div class="placa-qr" role="img" aria-label="QR Code da árvore ${esc(a.id)}">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
        <div class="placa-txt">
          <div class="placa-nome">${esc(esp.nome)}</div>
          <div class="placa-cient">${esc(esp.cientifico)}</div>
          <div class="placa-id">Árvore nº ${esc(a.id)}</div>
          <p>Aponte a câmera do celular para conhecer esta árvore e avisar a prefeitura se ela tiver algum problema.</p>
        </div>
      </div>
    </div>`;
  }

  function abrir(a) {
    atual = a;
    const base = baseUrl();
    const url = link(base, a, A.risco(a), A.proximaVistoria(a), A.hojeISO());
    $('#placa-previa').innerHTML = placaHTML(a, url);
    let aviso = avisoEndereco(base);
    // árvore importada com número fora do padrão gera um QR que a ficha não aceita: avisa e não deixa imprimir
    const ok = !!ler(new URL(url).hash, { ESPECIES: Arbo.ESPECIES, ORIGENS: Arbo.ORIGENS, SAUDE: Arbo.SAUDE }, a.id);
    if (!ok) aviso = `O número desta árvore (${a.id}) tem caracteres que não cabem na placa. Use só letras, números, "-" e "_" (até 40).`;
    $('#placa-aviso').textContent = aviso;
    $('#placa-imprimir').disabled = !ok;
    $('#placa-link').value = url;
    $('#placa-abrir').href = url;
    $('#dlg-placa').showModal();
  }
  A.abrirPlaca = abrir;

  $('#placa-fechar').onclick = () => $('#dlg-placa').close();
  $('#placa-copiar').onclick = async () => {
    try { await navigator.clipboard.writeText($('#placa-link').value); A.toast('Link copiado'); }
    catch (e) { $('#placa-link').select(); }
  };
  $('#placa-imprimir').onclick = () => {
    if (!atual) return;
    // a placa fica sozinha na tela; se o navegador não avisar o fim da impressão, o botão "Voltar" resolve
    impressao.innerHTML = '<div class="rel-barra no-print"><button class="btn" data-fechar-placa>Voltar ao sistema</button><button class="btn primario" data-reimprimir-placa>Imprimir</button></div>' + $('#placa-previa').innerHTML;
    $('#dlg-placa').close();
    document.body.classList.add('imprimindo-placa');
    impressao.removeAttribute('aria-hidden');
    Arbo.auditar('Imprimiu placa com QR Code', atual.id);
    const fim = () => { document.body.classList.remove('imprimindo-placa'); impressao.setAttribute('aria-hidden', 'true'); window.removeEventListener('afterprint', fim); setTimeout(() => A.mapa.invalidateSize(), 0); };
    window.addEventListener('afterprint', fim);
    impressao.querySelector('[data-fechar-placa]').onclick = fim;
    impressao.querySelector('[data-reimprimir-placa]').onclick = () => window.print();
    setTimeout(() => window.print(), 50);
  };
})();
