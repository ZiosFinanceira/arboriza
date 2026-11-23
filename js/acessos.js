// Acessos: usuários por função, matriz de permissões e registro de auditoria.
(function () {
  const A = Arbo.app, { esc } = A;
  const $ = (s) => document.querySelector(s);
  const KEY_AG = Arbo.CONFIG.storageKey + '.agentes';
  const KEY_INAT = Arbo.CONFIG.storageKey + '.inativos';
  const GESTAO = [
    { nome: 'Administração do sistema (exemplo)', email: 'admin@recife.exemplo', papel: 'admin' },
    { nome: 'Coordenação de arborização (exemplo)', email: 'coordenacao@recife.exemplo', papel: 'coordenador' },
    { nome: 'Setor financeiro (exemplo)', email: 'financeiro@recife.exemplo', papel: 'financeiro' },
    { nome: 'Fiscalização ambiental (exemplo)', email: 'fiscal@recife.exemplo', papel: 'fiscal' },
    { nome: 'Controladoria (exemplo)', email: 'controle@recife.exemplo', papel: 'auditor' }
  ];
  const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) || padrao; } catch (e) { return padrao; } };

  function render() {
    const inativos = ler(KEY_INAT, []);
    const agentes = ler(KEY_AG, []);
    const equipe = (Arbo.EQUIPES || []).flatMap((e) => e.membros.map((m) => ({ nome: m.nome, email: 'mat. ' + m.mat, papel: 'equipe', extra: e.nome })));
    const usuarios = [...GESTAO, ...equipe, ...agentes.map((a) => ({ nome: a.nome, email: a.email, papel: 'agente', extra: a.bairro }))];
    $('#acessos-usuarios').innerHTML = usuarios.map((u) => `<tr>
      <td>${esc(u.nome)}<small>${esc(u.email)}${u.extra ? ' · ' + esc(u.extra) : ''}</small></td>
      <td>${esc(Arbo.PAPEIS[u.papel].nome)}</td>
      <td><label class="interruptor"><input type="checkbox" data-usuario="${esc(u.email)}" data-perm="gerir_usuarios" ${inativos.includes(u.email) ? '' : 'checked'}><span>${inativos.includes(u.email) ? 'Bloqueado' : 'Ativo'}</span></label></td></tr>`).join('');
    document.querySelectorAll('[data-usuario]').forEach((cb) => (cb.onchange = () => {
      let l = ler(KEY_INAT, []); const em = cb.dataset.usuario;
      l = cb.checked ? l.filter((x) => x !== em) : [...l, em];
      try { localStorage.setItem(KEY_INAT, JSON.stringify(l)); } catch (e) { /* ignora */ }
      Arbo.auditar(cb.checked ? 'Desbloqueou usuário' : 'Bloqueou usuário', em); render();
    }));
    const papeis = Object.keys(Arbo.PAPEIS);
    $('#acessos-matriz').innerHTML = `<thead><tr><th>Permissão</th>${papeis.map((p) => `<th title="${esc(Arbo.PAPEIS[p].desc)}">${esc(Arbo.PAPEIS[p].nome)}</th>`).join('')}</tr></thead>
      <tbody>${Arbo.PERMISSOES.map((perm) => `<tr><td>${esc(Arbo.ROTULOS_PERM[perm])}</td>${papeis.map((p) => `<td class="${Arbo.PAPEIS[p].perms.includes(perm) ? 'sim' : 'nao'}">${Arbo.PAPEIS[p].perms.includes(perm) ? '✓' : '–'}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const log = Arbo.lerAuditoria().slice().reverse().slice(0, 60);
    $('#acessos-auditoria').innerHTML = log.length ? log.map((l) => `<tr><td>${new Date(l.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
      <td>${esc(l.usuario)}<small>${esc((Arbo.PAPEIS[l.papel] || {}).nome || l.papel)}</small></td><td>${esc(l.acao)}<small>${esc(l.detalhe)}</small></td></tr>`).join('')
      : '<tr><td colspan="3" class="ajuda">Nenhuma ação registrada ainda.</td></tr>';
  }
  A.usuarioBloqueado = (email) => ler(KEY_INAT, []).includes(email);
  A.renderers.push(() => { if (A.abaAtiva() === 'acessos') render(); });
})();
