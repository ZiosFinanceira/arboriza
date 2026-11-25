# 🌳 Arboriza

Protótipo (exemplo em **Recife: Recife Antigo e Marco Zero**) de um sistema para **mapear árvores de calçada** (plantadas pela prefeitura e as não cadastradas) e **decidir irrigação e adubação** de forma inteligente, para que as mudas sobrevivam e, no futuro, ajudem a baixar a temperatura das cidades.

> Visão completa, arquitetura, roadmap e modelo de negócio: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)

**Site publicado:** https://ziosfinanceira.github.io/arboriza/

## O que o protótipo já faz

- 🔐 **Três entradas com permissões próprias:**
  - **Área restrita** (prefeitura): administração, coordenação, financeiro, fiscalização e auditoria, cada função com o que pode ver e alterar.
  - **Equipe de campo:** login por equipe e matrícula, ordens de serviço com checklist obrigatório, jornada e rota inteligente.
  - **Agente do Futuro:** cadastro do morador, sugestões de novos locais (avaliadas pela equipe de vistoria) e cuidado das mudas.
- 📋 **Ordens de serviço** geradas a partir de chamados, da rega do dia e das sugestões, distribuídas entre as equipes.
- 💰 **Gastos:** orçamento por categoria, despesas lançadas, distribuição por região e custo das mudas perdidas.
- 🛡️ **Acessos:** usuários, matriz de permissões e auditoria de todas as ações.
- 🗺️ Mapa real (OpenStreetMap) com árvores coloridas por origem: prefeitura, munícipe autorizado, não cadastrada, importada do OSM.
- 💧 **Motor de irrigação:** estima a umidade do solo de cada árvore (espécie, idade, dias desde a última rega, chuva e temperatura reais via Open-Meteo) e diz se precisa irrigar, quantos litros ou se deve adiar porque vai chover.
- 🌱 **Agenda de adubação** por fase da árvore.
- 🚚 **Rota do dia:** lista as árvores a irrigar em ordem de visita e desenha o percurso no mapa, com total de litros e km.
- ⚠️ Alerta de **espécie inadequada para calçada** (ex.: fícus).
- ➕ Mapear árvore nova clicando no mapa; registrar irrigação e adubação; regularizar árvore não cadastrada.
- 🚨 **Controle urbano:** chamados de poda, corte, remoção, recuperação, risco de queda, raiz na calçada, fiação e pragas.
  - Cada chamado vira um alerta no mapa com **cronômetro sem fim**. A cor muda pelo tempo em aberto: 🔵 até 3 dias → 🟡 3 a 7 → 🟠 7 a 10 → 🔴 10+ dias. Chamado **Urgente já nasce vermelho**. Os vermelhos piscam e ficam sempre em destaque.
  - 4 níveis de risco (**Baixo risco, Risco, Risco alto, Urgente**) que definem a fila: urgentes primeiro, depois vermelhos, depois risco × tempo.
  - Fluxo aberto → em atendimento → concluído, contador de vermelhos na aba e exportação em CSV (abre no Excel).
- 🏗️ **Obras (TCA):** acompanha as mudas do plantio compensatório de cada empreendimento: responsável, prazo de manutenção, taxa de sobrevivência, mudas mortas ou abandonadas e notificação pronta para a construtora.
- 💚 **Agente do Futuro:** o lado do cidadão. Mostra as mudas que precisam de rega ou de adoção, as hortas comunitárias e os mutirões. Cada cuidado registrado entra no histórico da árvore e vale pontos.
- 🩺 **Saúde da muda:** viva, estressada, morta ou substituída. Ao marcar como morta, o sistema já abre um chamado de substituição.
- 📥 Importar árvores do **OpenStreetMap** da área visível; exportar e importar **GeoJSON**.

### Novidades (novembro de 2026)

- 🔎 **Vistoria técnica:** DAP, altura, inclinação, cavidade, rachadura, raízes, galhos secos, pragas, poda drástica, fiação, ocupação embaixo da árvore e data da última poda. Cada vistoria fica no histórico da árvore.
- ⚠️ **Índice de risco de queda (0–100):** baixo, moderado, alto ou crítico, mostrando os motivos de cada nota. Árvores de risco alto e crítico ganham um alerta no mapa e um botão para abrir o chamado já preenchido.
- 📅 **Calendário de vistoria:** a próxima vistoria é calculada pelo risco e pelo porte (24, 12, 3 ou 1 mês; no máximo 12 meses para árvores grandes ou em locais movimentados). Filtro "Vistoria vencida ou pendente" na aba Árvores.
- 📊 **Aba Painel:** risco, fila de prioridade, calendário, diversidade de espécies (alerta acima de 10% por espécie e 20% por gênero, a partir de 30 árvores), sobrevivência das mudas e chamados.
- 📄 **Relatório anual em PDF**, gerado pelo próprio navegador ("Salvar como PDF"), já com a situação nos 5 padrões do selo **Tree Cities of the World** (Arbor Day Foundation e FAO/ONU).
- 🏷️ **Placa com QR Code:** abre a **ficha pública** da árvore no celular de qualquer pessoa, sem login, com botão para avisar a prefeitura (e-mail, WhatsApp ou telefone).
- 📑 **Planilha CSV das árvores** com risco, situação da vistoria e medidas.

Os dados ficam só no navegador (localStorage). Os sensores são **simulados**.

> Quem já usava o protótipo continua com os próprios dados (todas as árvores aparecem como "sem vistoria técnica"). Para ver os exemplos de vistoria, entre como Administração e use **Dados → Restaurar dados de exemplo**.

## Rodar localmente

Não precisa instalar nada. Basta abrir o `index.html` no navegador.
Se preferir servir por HTTP:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar de graça no GitHub Pages

1. Crie um repositório no GitHub (ex.: `arboriza`) e envie os arquivos:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/arboriza.git
   git push -u origin main
   ```
2. No repositório: **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
3. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/arboriza/`.

Quando tiverem a vaga no Vercel, é só importar o mesmo repositório lá (é site estático, sem build).

### Antes de imprimir placas com QR Code

Em `js/data.js`:
- `CONFIG.urlPublica`: o endereço publicado do site (ex.: `https://SEU-USUARIO.github.io/arboriza/`). É para onde o QR aponta. Aberto como arquivo ou em endereço local, o sistema avisa que o QR não vai funcionar no celular.
- `CONFIG.contato`: nome do órgão, WhatsApp (só números, com DDD e 55), e-mail e telefone que vão receber os avisos da ficha pública. Os valores atuais são **exemplos**.

Como ainda não há servidor, o QR leva junto um resumo da árvore no dia em que a placa foi gerada (espécie, endereço, data da última vistoria). A nota de risco **não** vai na placa, porque muda com o tempo e a placa impressa ficaria desatualizada. O link também tem o número da árvore (`ficha.html?id=...`), então a mesma placa continua valendo quando o sistema tiver servidor e a ficha passar a buscar os dados atuais.

## Testes

```bash
node tests/risco.test.js
```

Testa as regras de risco, calendário e diversidade, inclusive com dados malformados (não precisa instalar nada).
Além desses, as telas foram testadas no navegador com todos os perfis, no celular, com dados salvos pela versão anterior e contra links falsificados na ficha pública.

## Estrutura

```
index.html         página principal
css/style.css      visual
js/data.js         cidade, catálogo de espécies, árvores de exemplo  ← trocar a cidade aqui
js/engine.js       motor de decisão (irrigação/adubação), funções puras
js/risco.js        risco de queda, calendário de vistoria e diversidade, funções puras  ← ajustar pesos aqui
js/vistoria.js     vistoria técnica: formulário, cartão de risco na ficha e alertas no mapa
js/painel.js       aba Painel (indicadores)
js/relatorio.js    relatório anual imprimível (PDF)
js/placa.js        placa com QR Code e leitura segura do link
js/ficha.js        ficha pública da árvore (ficha.html)
js/csv.js          planilha CSV das árvores
js/vendor/qrcode.js gerador de QR Code (Kazuhiko Arase, licença MIT)
ficha.html         página pública aberta pelo QR Code
tests/             testes automáticos das regras
js/chamados.js     controle urbano: tipos, riscos, faixas de cor, prioridade  ← ajustar prazos aqui
js/obras.js        obras / plantio compensatório (TCA)
js/agente.js       Agente do Futuro (voluntários, hortas, mutirões, pontos)
js/permissoes.js   funções, permissões e auditoria
js/acesso.js       tela de acesso (equipe, agente e área restrita)
js/os.js           equipes, ordens de serviço e rota inteligente
js/sugestoes.js    sugestões de moradores e avaliação
js/gastos.js       orçamento e despesas
js/acessos.js      usuários, matriz de permissões e auditoria
js/ruas.js         ruas reais do Recife Antigo e entorno (OpenStreetMap) para a arte de acesso e o mapa vetorial
js/basemap.js      mapa vetorial (CONFIG.basemap = 'vetor')
js/app.js          interface: mapa, lista, rota, cadastro, importação
docs/ARQUITETURA.md visão do produto e próximos passos
```

### Trocar a cidade

Em `js/data.js`, altere `CONFIG.cidade`, `CONFIG.centro` (lat, lng) e, se quiser, as árvores de exemplo.

### Ajustar as regras

Em `js/engine.js`, o objeto `PARAMS` tem os limiares de umidade, os litros por fase, a chuva que adia a rega e os intervalos de adubação.
Em `js/risco.js`, o objeto `PARAMS` tem os pontos de cada defeito, os multiplicadores de tamanho e de ocupação, os limites das classes de risco, os intervalos de vistoria e os limites de diversidade.
**Os valores atuais são referências de protótipo** e devem ser validados com um engenheiro agrônomo ou florestal.

## Próximos passos sugeridos

1. Backend no **Supabase** (Postgres + PostGIS, plano gratuito) no lugar do localStorage.
2. Login com perfis (gestor / equipe de campo) e modo celular (PWA) para cadastro em campo com foto.
3. Protótipo de sensor de bancada: ESP32 + sensor capacitivo de umidade + LoRa.
4. Conversar com uma prefeitura para conseguir a base de árvores dela e um bairro piloto.
