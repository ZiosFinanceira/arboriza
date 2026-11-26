// Perfis, funções e permissões. Cada elemento da interface com data-perm="x" só aparece
// (ou só fica habilitado, no caso de campos) para quem tem a permissão x.
// Protótipo: a checagem é só na tela. Na versão real, o servidor valida cada ação (ex.: políticas RLS no Supabase).
window.Arbo = window.Arbo || {};

(function () {
  const TODAS = [
    'ver_painel', 'emitir_laudo', 'gerir_alertas',
    'ver_arvores', 'mapear_arvore', 'registrar_cuidado', 'editar_saude', 'registrar_vistoria', 'gerar_placa', 'regularizar_arvore', 'excluir_arvore',
    'ver_chamados', 'abrir_chamado', 'atender_chamado', 'alterar_risco',
    'ver_os', 'minhas_os', 'gerir_os',
    'ver_sugestoes', 'avaliar_sugestoes', 'sugerir_local',
    'ver_obras', 'notificar_obras',
    'ver_gastos', 'lancar_gastos', 'editar_orcamento',
    'ver_agente', 'cuidar_como_agente',
    'ver_rota', 'ver_dados', 'importar_dados', 'restaurar_dados',
    'ver_acessos', 'gerir_usuarios', 'ver_auditoria'
  ];
  const leitura = ['ver_painel', 'ver_arvores', 'ver_chamados', 'ver_os', 'ver_sugestoes', 'ver_obras', 'ver_gastos', 'ver_rota', 'ver_dados'];

  // perfil: grupo de login | papel: função dentro do grupo
  const PAPEIS = {
    admin:       { perfil: 'gestao', nome: 'Administração do sistema', desc: 'Acesso total, inclusive usuários, orçamento e configurações.', perms: TODAS.filter((p) => !['minhas_os', 'sugerir_local', 'cuidar_como_agente'].includes(p)) },
    coordenador: { perfil: 'gestao', nome: 'Coordenação de arborização', desc: 'Opera o dia a dia: árvores, chamados, equipes, ordens de serviço e sugestões. Vê gastos, não lança.',
      perms: [...leitura, 'mapear_arvore', 'registrar_cuidado', 'editar_saude', 'registrar_vistoria', 'gerar_placa', 'regularizar_arvore', 'abrir_chamado', 'atender_chamado', 'alterar_risco', 'gerir_os', 'avaliar_sugestoes', 'notificar_obras', 'ver_agente', 'importar_dados', 'emitir_laudo', 'gerir_alertas'] },
    financeiro:  { perfil: 'gestao', nome: 'Financeiro', desc: 'Lança despesas e acompanha a distribuição do orçamento. Operação só leitura.',
      perms: ['ver_painel', 'ver_gastos', 'lancar_gastos', 'ver_arvores', 'ver_os', 'ver_obras', 'ver_dados'] },
    fiscal:      { perfil: 'gestao', nome: 'Fiscalização ambiental', desc: 'Acompanha obras e compensações, notifica responsáveis e abre chamados.',
      perms: ['ver_painel', 'ver_arvores', 'editar_saude', 'registrar_vistoria', 'ver_chamados', 'abrir_chamado', 'ver_obras', 'notificar_obras', 'ver_sugestoes', 'ver_os', 'emitir_laudo'] },
    auditor:     { perfil: 'gestao', nome: 'Controle e auditoria', desc: 'Vê tudo, inclusive o registro de ações. Não altera nada.',
      perms: [...leitura, 'ver_agente', 'ver_acessos', 'ver_auditoria'] },
    equipe:      { perfil: 'equipe', nome: 'Equipe de campo', desc: 'Executa ordens de serviço, registra cuidados e avalia sugestões.',
      perms: ['ver_arvores', 'mapear_arvore', 'registrar_cuidado', 'editar_saude', 'registrar_vistoria', 'gerar_placa', 'ver_chamados', 'abrir_chamado', 'atender_chamado', 'minhas_os', 'ver_sugestoes', 'avaliar_sugestoes'] },
    agente:      { perfil: 'agente', nome: 'Agente do Futuro', desc: 'Morador cadastrado: cuida das mudas, sugere locais e avisa problemas.',
      perms: ['ver_agente', 'cuidar_como_agente', 'sugerir_local', 'abrir_chamado'] }
  };

  const ROTULOS = {
    ver_painel: 'Ver painel e relatório anual', emitir_laudo: 'Emitir laudo de poda ou supressão', gerir_alertas: 'Ativar alerta de chuva forte',
    ver_arvores: 'Ver árvores', mapear_arvore: 'Mapear árvore', registrar_cuidado: 'Registrar rega e adubação', editar_saude: 'Registrar saúde da muda',
    registrar_vistoria: 'Registrar vistoria técnica (risco)', gerar_placa: 'Gerar placa com QR Code',
    regularizar_arvore: 'Regularizar árvore', excluir_arvore: 'Excluir árvore', ver_chamados: 'Ver chamados', abrir_chamado: 'Abrir chamado',
    atender_chamado: 'Atender e concluir chamado', alterar_risco: 'Alterar risco', ver_os: 'Ver ordens de serviço', minhas_os: 'Executar as próprias OS',
    gerir_os: 'Distribuir OS entre equipes', ver_sugestoes: 'Ver sugestões', avaliar_sugestoes: 'Aprovar ou recusar sugestões', sugerir_local: 'Sugerir local',
    ver_obras: 'Ver obras', notificar_obras: 'Notificar construtoras', ver_gastos: 'Ver gastos', lancar_gastos: 'Lançar despesas',
    editar_orcamento: 'Editar orçamento', ver_agente: 'Ver área do agente', cuidar_como_agente: 'Cuidar como agente', ver_rota: 'Ver rota de rega',
    ver_dados: 'Ver dados', importar_dados: 'Importar e exportar', restaurar_dados: 'Restaurar dados de exemplo',
    ver_acessos: 'Ver usuários', gerir_usuarios: 'Gerenciar usuários', ver_auditoria: 'Ver auditoria'
  };

  let sessao = null;
  const KEY_AUD = () => Arbo.CONFIG.storageKey + '.auditoria';

  Arbo.PAPEIS = PAPEIS;
  Arbo.PERMISSOES = TODAS;
  Arbo.ROTULOS_PERM = ROTULOS;
  Arbo.sessao = () => sessao;
  Arbo.pode = (p) => !!(sessao && PAPEIS[sessao.papel] && PAPEIS[sessao.papel].perms.includes(p));
  Arbo.definirSessao = (s) => { sessao = s; aplicar(); };

  // Esconde botões e trava campos que o papel atual não pode usar
  function aplicar() {
    document.querySelectorAll('[data-perm]').forEach((el) => {
      const ok = el.dataset.perm.split(' ').some(Arbo.pode);
      if (/^(SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) el.disabled = !ok;
      else el.classList.toggle('sem-perm', !ok);
    });
  }
  new MutationObserver(aplicar).observe(document.documentElement, { childList: true, subtree: true });

  // Registro de auditoria: quem fez o quê e quando
  Arbo.auditar = (acao, detalhe) => {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(KEY_AUD())) || []; } catch (e) { /* vazio */ }
    log.push({ quando: new Date().toISOString(), usuario: sessao ? sessao.nome : 'sistema', papel: sessao ? sessao.papel : '-', acao, detalhe: detalhe || '' });
    try { localStorage.setItem(KEY_AUD(), JSON.stringify(log.slice(-500))); } catch (e) { /* ignora */ }
  };
  Arbo.lerAuditoria = () => { try { return JSON.parse(localStorage.getItem(KEY_AUD())) || []; } catch (e) { return []; } };
})();
