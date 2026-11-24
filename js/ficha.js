// Ficha pública da árvore (aberta pelo QR Code da placa). Não pede login e não grava nada.
// Os dados vêm do próprio link (ver js/placa.js) e são validados antes de aparecer; o aviso do cidadão
// vai pelos canais oficiais definidos em CONFIG.contato (js/data.js), nunca por um contato vindo do link.
(function () {
  const C = Arbo.CONFIG, el = document.getElementById('ficha');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') : '');
  const digitos = (s) => String(s || '').replace(/\D/g, '');
  const contato = C.contato || {};

  const idUrl = new URLSearchParams(location.search).get('id');
  const d = Arbo.placa.ler(location.hash, { ESPECIES: Arbo.ESPECIES, ORIGENS: Arbo.ORIGENS, SAUDE: Arbo.SAUDE }, idUrl);

  const PROBLEMAS = {
    galho: 'Galho quebrado, pendurado ou caindo',
    inclinada: 'Árvore inclinando ou com rachadura',
    raiz: 'Raiz levantando a calçada',
    fiacao: 'Galhos encostando na fiação',
    praga: 'Cupim, fungo ou praga',
    muda: 'Muda seca, quebrada ou sem protetor',
    outro: 'Outro problema'
  };

  function canais(msg, assunto) {
    const b = [];
    const wa = digitos(contato.whatsapp);
    if (wa.length >= 10) b.push(`<a class="btn primario" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>`);
    if (contato.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(contato.email)) b.push(`<a class="btn ${b.length ? '' : 'primario'}" href="mailto:${encodeURIComponent(contato.email).replace('%40', '@')}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(msg)}">Enviar por e-mail</a>`);
    const tel = digitos(contato.telefone);
    if (tel) b.push(`<a class="btn" href="tel:${tel}">Ligar ${esc(contato.telefone)}</a>`);
    return b.join('');
  }

  if (!d) {
    document.title = 'Placa não reconhecida · Arboriza';
    el.innerHTML = `<header class="ficha-topo"><span>${esc(contato.orgao || C.cidade)}</span><b>Arboriza</b></header>
      <h1>Não conseguimos ler esta placa</h1>
      <p>O link pode ter sido copiado pela metade. Tente escanear o QR Code de novo.</p>
      <p>Se a árvore tiver algum problema, avise a prefeitura:</p>
      <div class="acoes">${canais(`Olá! Quero avisar sobre uma árvore em ${C.cidade}.`, 'Aviso sobre árvore') || '<span class="ajuda">Canal de atendimento não configurado.</span>'}</div>`;
    return;
  }

  const esp = Arbo.ESPECIES[d.especie];
  const idade = d.plantio ? Math.floor((Date.now() - new Date(d.plantio + 'T12:00:00')) / (365.25 * 86400000)) : null;
  document.title = `${esp.nome} · ${d.id} · Arboriza`;

  el.innerHTML = `
    <header class="ficha-topo"><span>${esc(contato.orgao || C.cidade)}</span><b>Arboriza</b></header>
    <p class="ficha-id">Árvore nº ${esc(d.id)}</p>
    <h1>${esc(esp.nome)}</h1>
    <p class="ficha-cient">${esc(esp.cientifico)}</p>

    <section class="cartao">
      <dl class="dl">
        ${d.endereco ? `<dt>Onde fica</dt><dd>${esc(d.endereco)}</dd>` : ''}
        ${d.plantio ? `<dt>Plantada em</dt><dd>${fmt(d.plantio)}${idade != null ? ` (${idade < 1 ? 'menos de 1 ano' : idade === 1 ? '1 ano' : idade + ' anos'})` : ''}</dd>` : ''}
        ${d.origem ? `<dt>Origem</dt><dd>${esc(Arbo.ORIGENS[d.origem].nome)}</dd>` : ''}
        <dt>Estado</dt><dd>${esc(Arbo.SAUDE[d.saude].nome)}</dd>
        <dt>Porte quando adulta</dt><dd>${esc({ pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' }[esp.porte] || '—')}</dd>
      </dl>
      ${d.coords ? `<p style="margin:10px 0 0"><a href="https://www.openstreetmap.org/?mlat=${d.coords[0]}&amp;mlon=${d.coords[1]}#map=19/${d.coords[0]}/${d.coords[1]}" target="_blank" rel="noopener">Ver no mapa</a></p>` : ''}
    </section>

    <section class="cartao">
      <h2>Segurança</h2>
      ${d.vistoria
        ? `<p>Última vistoria técnica registrada até a emissão da placa: <b>${fmt(d.vistoria)}</b>.</p>`
        : '<p>Até a emissão da placa, esta árvore ainda não tinha vistoria técnica registrada.</p>'}
      <p class="ajuda">Para saber a situação atual ou pedir uma vistoria, use o aviso abaixo.</p>
    </section>

    <section class="cartao" id="aviso">
      <h2>Viu algum problema nesta árvore?</h2>
      <fieldset class="ficha-problemas">
        <legend class="ajuda">Escolha o que está acontecendo:</legend>
        ${Object.entries(PROBLEMAS).map(([k, v], i) => `<label class="check-linha"><input type="radio" name="problema" value="${k}" ${i === 0 ? 'checked' : ''}> ${esc(v)}</label>`).join('')}
      </fieldset>
      <label class="campo">Detalhes (opcional) <textarea id="detalhes" rows="2" maxlength="300" placeholder="Ex.: o galho está sobre o ponto de ônibus"></textarea></label>
      <p class="ficha-urgente">Se a árvore estiver caindo ou já caiu sobre a rua, fiação ou pessoas, ligue para a Defesa Civil (199) ou para os Bombeiros (193).</p>
      <div class="acoes" id="canais"></div>
    </section>

    <section class="cartao">
      <h2>Como você pode ajudar</h2>
      <p><b>Pode:</b> regar mudas novas de manhã cedo ou no fim da tarde, cobrir o solo com folhas secas e manter o canteiro limpo.</p>
      <p><b>Não pode:</b> podar, cortar, pregar placas, pintar o tronco ou mexer perto da fiação. Para isso, peça à prefeitura.</p>
      <p><a href="index.html">Quero ser um Agente do Futuro e cuidar das árvores do meu bairro</a></p>
    </section>

    <p class="ajuda ficha-rodape">${d.gerado ? `Informações de ${fmt(d.gerado)}, data em que a placa foi gerada. ` : ''}${esc(C.cidade)} · Arboriza</p>`;

  function atualizarCanais() {
    const p = (el.querySelector('input[name=problema]:checked') || {}).value || 'outro';
    const det = el.querySelector('#detalhes').value.trim().slice(0, 300);
    const msg = `Olá! Quero avisar sobre a árvore nº ${d.id} (${esp.nome})${d.endereco ? `, ${d.endereco}` : ''}.\n` +
      `Problema: ${PROBLEMAS[p]}.${det ? `\nDetalhes: ${det}` : ''}` +
      `${d.coords ? `\nLocal: https://www.openstreetmap.org/?mlat=${d.coords[0]}&mlon=${d.coords[1]}` : ''}\nFicha: ${location.href}`;
    el.querySelector('#canais').innerHTML = canais(msg, `Árvore ${d.id}: ${PROBLEMAS[p]}`) || '<span class="ajuda">Canal de atendimento não configurado.</span>';
  }
  el.addEventListener('change', atualizarCanais);
  el.querySelector('#detalhes').addEventListener('input', atualizarCanais);
  atualizarCanais();
})();
