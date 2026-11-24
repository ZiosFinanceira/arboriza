# Arboriza: arquitetura e visão do produto

> Documento vivo. Comecem por aqui e atualizem conforme forem decidindo.

## 1. O problema

- As cidades plantam árvores em calçadas, mas **muitas morrem nos 2 primeiros anos** por falta de rega e de manutenção.
- Além do plantio oficial, moradores plantam por conta própria. Essas árvores **não estão no inventário**: ninguém cuida delas, e às vezes a espécie é inadequada (raiz que quebra a calçada, porte incompatível com a fiação).
- A prefeitura não tem uma visão única de **onde estão as árvores, em que estado estão e quais precisam de água hoje**.
- A arborização é uma das formas mais baratas de reduzir ilhas de calor, mas o efeito só aparece se a árvore sobreviver e crescer.

## 2. A proposta

Uma plataforma que:

1. **Mapeia** todas as árvores de calçada (oficiais e não cadastradas).
2. **Monitora** a umidade do solo (com sensor ou estimada por modelo + clima).
3. **Decide** quem precisa de água e de adubo, e quanto.
4. **Executa** a ação: gera a rota do caminhão-pipa ou aciona válvulas automáticas.
5. **Comprova** o resultado: taxa de sobrevivência, cobertura de copa e redução de temperatura, que é o que a prefeitura precisa mostrar.

### Sobre as árvores "ilegais"

No produto, o termo usado é **"não cadastrada"**. Isso tem dois motivos:
- Para a prefeitura, o valor está em **incorporar** essas árvores ao inventário (regularizar, cuidar ou planejar a substituição), não em punir.
- Assim evitamos atrito com moradores, que são justamente quem mais pode ajudar a mapear.

Fluxo: `encontrada em campo → vistoria → (regularizada | manter com cuidados | substituição programada)`.

## 3. Componentes

```
┌────────────────┐   ┌────────────────┐   ┌──────────────────┐
│ App de campo   │   │ Sensores IoT   │   │ Fontes externas  │
│ (celular, GPS, │   │ umidade do solo│   │ clima, OSM, base │
│  foto)         │   │ + válvula      │   │ municipal, satélite│
└───────┬────────┘   └───────┬────────┘   └────────┬─────────┘
        │                    │ LoRaWAN / NB-IoT    │
        ▼                    ▼                     ▼
   ┌──────────────────────────────────────────────────────┐
   │ Backend: API + banco geoespacial (PostgreSQL+PostGIS)│
   │ - inventário de árvores   - leituras de sensores     │
   │ - motor de regras         - ordens de serviço        │
   └───────────────────────┬──────────────────────────────┘
                           ▼
   ┌──────────────────────────────────────────────────────┐
   │ Painel web da prefeitura (este protótipo é o embrião)│
   │ mapa · alertas · rota do dia · relatórios · indicadores│
   └──────────────────────────────────────────────────────┘
```

### 3.1 Mapeamento (inventário)
- **Cadastro em campo:** app de celular com GPS, foto, espécie (com sugestão por foto no futuro), estado do canteiro e presença de fiação.
- **Importação:** OpenStreetMap (`natural=tree`, já está no protótipo) e inventários que a própria prefeitura já tiver (muitas capitais têm alguma base em shapefile ou GeoJSON).
- **Descoberta automática (fase 3):** visão computacional em imagens de rua ou aéreas para achar árvores que não estão em nenhuma base. É aqui que aparecem as não cadastradas em escala.

### 3.2 Monitoramento
- **Sem sensor (barato, escala):** umidade estimada por modelo de balanço hídrico: dias desde a última rega, chuva e temperatura (API de clima) e espécie. É o que o protótipo faz.
- **Com sensor (amostral):** sensor capacitivo de umidade em uma amostra de árvores por rua ou bairro, usado para **calibrar o modelo**. Não precisa ter sensor em toda árvore.
- **Conectividade:** LoRaWAN (baixo consumo, bateria de anos, gateways cobrem bairros) ou NB-IoT pela operadora.

### 3.3 Atuação (irrigação)
Três níveis, do mais barato ao mais automatizado:
1. **Rota otimizada para caminhão-pipa ou equipe** (protótipo já gera). É o que mais vende no início, porque usa a estrutura que a prefeitura já tem.
2. **Bolsa ou tubo de irrigação lenta** em mudas novas, reabastecida conforme a rota.
3. **Válvula solenoide + reservatório ou rede**, acionada pelo backend. Faz sentido em canteiros centrais e calçadões, não em toda árvore.

### 3.4 Adubação
Agenda por fase da árvore (estabelecimento, consolidação, estabelecida) e alertas da vistoria (folhas amareladas etc.). Vira ordem de serviço.

### 3.5 Controle urbano (chamados)
De onde vêm as demandas de manejo: poda, corte, remoção, recuperação, risco de queda, raiz na calçada, fiação e pragas.

- **Entrada:** central 156, vistoria da equipe, munícipe (app/site), Defesa Civil e, no futuro, alertas automáticos (ex.: sensor de inclinação, vento forte previsto).
- **Risco (gravidade):** Baixo risco · Risco · Risco alto · Urgente.
- **Cor:** **Urgente já abre vermelho.** Os demais seguem o tempo em aberto (cronômetro sem limite): 🔵 < 3 dias · 🟡 3–7 · 🟠 7–10 · 🔴 ≥ 10. Vermelho pisca e fica sempre em destaque.
- **Fila das equipes:** urgentes → vermelhos → `peso do risco × (1 + dias/7)`. Assim nenhum chamado fica esquecido, porque todo chamado sobe na fila com o tempo.
- **Indicadores:** tempo médio de atendimento por tipo/risco/região, nº de vermelhos, chamados por equipe. É o que o gestor apresenta para a Câmara/TCE.
- **Próximos passos:** atribuir chamado a equipe, foto de antes/depois, integração com o sistema 156 da prefeitura e com a Defesa Civil em dias de temporal.

### 3.6 Obras e plantio compensatório (TCA)
**O problema, visto em campo:** quando um prédio é construído, a construtora faz a urbanização da calçada e planta as mudas da compensação ambiental. Entre o plantio e a entrega do condomínio, ninguém rega nem aduba, e em poucos meses a muda seca e sobra só o tronco.

**Recife:** o exemplo do protótipo usa o Recife Antigo e o entorno do Marco Zero. Antes de apresentar à prefeitura do Recife, levantar qual é o instrumento local equivalente (licença, termo de compensação) e o prazo de manutenção exigido.

**Referência de São Paulo:** lá isso é regulado pelo **TCA (Termo de Compromisso Ambiental)**, firmado com a Secretaria do Verde e do Meio Ambiente (SVMA). O valor da muda no cálculo da compensação já inclui **2 anos de manutenção** (Decreto 53.889/2013). Uma CPI da Câmara (2016) já apontou a necessidade de ampliar esse prazo de responsabilidade. A SVMA publica a lista de TCAs em CSV no site da prefeitura, e esses dados podem alimentar o sistema.

O que o sistema faz:
- Cada muda de compensação fica ligada ao **empreendimento, ao responsável e ao número do TCA**.
- Mostra o prazo de manutenção (garantia) e avisa quando está vencendo ou já venceu sem ninguém responsável.
- Calcula a **taxa de sobrevivência** por obra e marca as mudas **abandonadas** (sem nenhum cuidado registrado há mais de 21 dias).
- Gera uma **notificação pronta** para a construtora, com as mudas mortas e as coordenadas.
- Quando a garantia acaba, a muda entra na lista do **Agente do Futuro** e na rota da prefeitura, para não ficar órfã.

Como fazer de verdade:
1. Importar o CSV de TCAs da SVMA e cruzar com o endereço das obras.
2. Vistoria inicial com o app de campo: cadastrar as mudas de cada obra.
3. Vender para a prefeitura como **ferramenta de fiscalização do TCA**: hoje ela não tem como saber, muda a muda, o que sobreviveu antes de dar o recebimento definitivo.
4. Oferecer às construtoras um **relatório automático de manutenção**. Isso ajuda a cumprir o TCA e a evitar exigências de reposição.

### 3.7 Agente do Futuro (participação cidadã)
O lado público do sistema. Pode funcionar como site ou app aberto, separado do painel da prefeitura.
- **Onde ajudar:** mudas que precisam de água agora (com a quantidade em baldes), mudas para adotar, hortas comunitárias e mutirões.
- **Registro:** "eu reguei", "coloquei composto" e "adotei" entram no histórico da árvore e reduzem a rota do caminhão. Na versão real, com foto e localização como comprovação.
- **Engajamento:** pontos, níveis (Semente → Floresta) e ranking por bairro.
- **Limites claros:** o cidadão rega, cobre o solo e avisa a prefeitura. Poda, corte, plantio na calçada e adubo químico continuam com a prefeitura (o sistema orienta a abrir um chamado).
- **Parcerias possíveis:** já existem iniciativas para conectar, como a plataforma **Sampa+Rural** (mapeia hortas e iniciativas de agricultura da cidade) e o **Adote uma Praça**. Em outras cidades há programas de adoção de árvores (Curitiba, Fortaleza) que podem servir de modelo.
- **Próximos passos:** login simples, comprovação por foto, kits de composto com parceiros, eventos criados pelas próprias hortas e notificação quando uma muda adotada precisar de água.

### 3.8 Risco de queda e vistoria técnica
- **Vistoria:** DAP (cm), altura (m), inclinação (°), inclinação recente, cavidade (nenhuma/pequena/grande), rachadura, raízes (ok/levantando calçada/danificadas), galhos secos, praga, poda drástica, fiação, ocupação embaixo (baixa/média/alta) e última poda.
- **Índice (0–100):** soma dos pontos dos defeitos × tamanho da árvore (pequena 0,6 · média 1,0 · grande 1,2) × ocupação embaixo (baixa 0,7 · média 1,0 · alta 1,3). Classes: baixo < 25 ≤ moderado < 50 ≤ alto < 75 ≤ crítico. Lógica inspirada nas avaliações de risco de arboricultura (ex.: TRAQ, da ISA); pesos a validar com engenheiro agrônomo ou florestal.
- **Calendário:** próxima vistoria em 24/12/3/1 meses conforme a classe; no máximo 12 meses para árvore grande ou em local de muito movimento. Referência: Singapura inspeciona cada árvore a cada 6–24 meses e reduziu as falhas de árvores em cerca de 85% entre 2001 e 2018.
- **Diversidade:** regra 10-20 (no máximo 10% de uma espécie e 20% de um gênero), contando árvores vivas e identificadas, com alerta a partir de 30 árvores.
- **Placa com QR Code:** ficha pública sem login (`ficha.html?id=<árvore>#d=<resumo>`). Hoje o resumo (espécie, endereço, plantio, data da última vistoria) vai no link e é validado, e o `id` do endereço precisa bater com o do resumo. A nota de risco fica de fora porque mudaria depois da impressão. Com backend, a ficha busca os dados atuais pelo `id` e as placas já impressas continuam valendo. Limite atual: sem servidor, alguém pode montar um link com dados inventados; a ficha avisa que as informações são da data de emissão da placa.

### 3.9 Indicadores para a prefeitura (o que justifica a compra)
- Taxa de sobrevivência de mudas (antes e depois).
- Litros de água por árvore viva e custo por árvore.
- Árvores não cadastradas incorporadas ao inventário.
- Cobertura de copa por bairro e cruzamento com **temperatura de superfície** (imagens Landsat/Sentinel), para mostrar onde plantar e o efeito ao longo dos anos.

## 4. Perfis de acesso e permissões

O sistema tem três portas de entrada, cada uma com suas obrigações e restrições. A matriz completa (permissão × função) aparece na aba **Acessos** e está definida em `js/permissoes.js`.

| Entrada | Quem | O que faz | O que não faz |
|---|---|---|---|
| **Área restrita** (botão discreto na tela de acesso) | Servidores da prefeitura | Depende da função, ver abaixo | — |
| **Equipe de campo** | Servidores e terceirizados, um login por pessoa (equipe + matrícula), usando o tablet da equipe | Executa as próprias ordens de serviço com checklist obrigatório, segue a rota do dia, registra rega e saúde da muda, avalia sugestões de moradores | Não vê gastos, não exclui árvores, não vê OS de outras equipes como suas |
| **Agente do Futuro** | Moradores com cadastro (nome, e-mail, celular, bairro e aceite dos termos) | Vê o mapa das mudas, rega e adota, participa de hortas e mutirões, **sugere novos locais** e avisa problemas | Não vê chamados internos, gastos nem dados de outras pessoas |

Funções da área restrita:
- **Administração do sistema:** tudo, inclusive usuários, orçamento e restauração de dados.
- **Coordenação de arborização:** opera o dia a dia (árvores, chamados, distribuição de OS entre equipes, sugestões, obras). Vê gastos, mas não lança.
- **Financeiro:** lança despesas e acompanha a distribuição do orçamento. Operação só leitura.
- **Fiscalização ambiental:** obras e compensações, notifica construtoras, abre chamados.
- **Controle e auditoria:** vê tudo, inclusive o registro de ações, e não altera nada.

**Ordens de serviço:** cada chamado vira uma OS para a equipe certa (manejo, cuidado ou vistoria); a rega do dia vira uma OS com paradas; cada sugestão de morador vira uma OS de vistoria. Fluxo: pendente → em deslocamento → em execução → concluída. A OS só pode ser concluída com o checklist completo (EPI, isolamento da área, fotos etc.), e os horários de saída, chegada e conclusão ficam registrados.

**Rota inteligente:** urgentes primeiro; depois, vizinho mais próximo ponderado pela prioridade, saindo da base das equipes, com estimativa de km e de tempo (deslocamento + tempo de serviço por tipo). No protótipo a distância é em linha reta; na versão real, usar roteamento pelas ruas (ex.: OSRM ou GraphHopper).

**Sugestões e combate a trote:** só envia quem tem cadastro; limite de 5 sugestões por dia; um pedido repetido a menos de 20 m do mesmo tipo vira "apoio" ao pedido existente; quem avalia vê o histórico de quem sugeriu (aprovadas e recusadas); recusas têm motivo padronizado (inclusive "possível trote") e a administração pode bloquear o cadastro. Na versão real: confirmação do celular por código ou login gov.br.

**Auditoria:** entradas e saídas, cuidados registrados, decisões, mudanças de risco, redistribuição de OS, despesas e mudanças de orçamento ficam registradas com quem, quando e o quê.

**Importante:** no protótipo, as restrições são aplicadas só na tela. Na versão real, o servidor precisa validar cada ação (ex.: políticas RLS no Supabase por função e por equipe).

## 5. Modelo de dados (inicial)

```
arvore(id, geom POINT, especie_id, origem, status, endereco, data_plantio,
       tem_sensor, criado_por, criado_em)
especie(id, nome, nome_cientifico, necessidade_agua, porte, adequada_calcada, obs)
leitura_sensor(arvore_id, momento, umidade_solo, temperatura_solo, bateria)
vistoria(arvore_id, data, responsavel, dap_cm, altura_m, inclinacao_graus, inclinacao_recente,
         cavidade, rachadura, raizes, galhos_secos, praga, poda_drastica, fiacao, alvo, ultima_poda, obs)
evento(arvore_id, tipo [irrigacao|adubacao|vistoria|poda|regularizacao],
       data, litros, responsavel, foto_url, obs)
ordem_servico(id, data, tipo, equipe, rota GEOMETRY, status)
empreendimento(id, nome, responsavel, tca_numero, data_plantio, meses_garantia, situacao)
agente(id, nome, pontos, bairro)          -- voluntário
cuidado(arvore_id, agente_id NULL, tipo, data, foto_url)  -- rega/adubação/adoção
ponto_agente(id, tipo [horta|mutirao], geom, nome, quando, descricao)
usuario(id, nome, email, papel, equipe_id NULL, ativo)
equipe(id, nome, funcao, veiculo, tablet)
ordem_servico_item(os_id, arvore_id, regada_em)   -- paradas da rota de rega
sugestao(id, agente_id, tipo, geom, descricao, foto_url, status, motivo, avaliador_id, apoios)
despesa(id, data, categoria, descricao, regiao, valor, contrato, lancado_por)
orcamento(ano, categoria, valor)
auditoria(quando, usuario_id, acao, detalhe)
chamado(id, arvore_id NULL, geom POINT, tipo, risco, origem, descricao,
        status [aberto|atendimento|concluido], aberto_em, concluido_em, equipe_id)
```

O protótipo já guarda um subconjunto disso e exporta em **GeoJSON**, formato que qualquer SIG municipal (QGIS, ArcGIS) abre.

## 6. Stack sugerida

| Camada | Agora (grátis) | Depois |
|---|---|---|
| Hospedagem do painel | **GitHub Pages** | Vercel (quando tiverem a vaga) |
| Mapa | Leaflet + tiles OSM | MapLibre + tiles próprios/vetoriais |
| Banco | localStorage (só protótipo) | **Supabase** (Postgres + PostGIS + auth, plano gratuito) |
| Clima | Open-Meteo (grátis, sem chave) | idem + estações locais/INMET |
| Sensores | simulados | ESP32 + sensor capacitivo + LoRa (protótipo de bancada) |

Observação: o servidor público de tiles do OpenStreetMap tem política de uso justo. Para o piloto com prefeitura, usem um provedor de tiles (MapTiler, Stadia etc.) ou hospedem os próprios.

## 7. Roadmap

**Fase 0 (agora):** protótipo navegável (este repositório). Serve para apresentar a ideia.

**Fase 1, MVP de piloto (1 bairro):**
- Backend no Supabase (tabelas acima + login por perfil: gestor, equipe de campo).
- App de campo (pode ser o próprio site responsivo, como PWA) para cadastrar e registrar irrigações.
- Importação da base da prefeitura parceira.
- Relatório mensal em PDF (o anual já existe no protótipo).

**Fase 2, sensores:**
- 10 a 30 sensores em um piloto e calibração do modelo de umidade.
- Alertas por WhatsApp/e-mail para a equipe.

**Fase 3, escala:**
- Detecção automática de árvores por imagem.
- Mapa de calor × cobertura de copa para planejar plantio.
- Integração com sistemas da prefeitura (ordem de serviço, 156).

## 8. Como vender para prefeitura (pontos para estudar)

- **Contratação pública:** Lei 14.133/2021 (licitações) e, para startups, o **Marco Legal das Startups (LC 182/2021)**, que criou o *Contrato Público para Solução Inovadora (CPSI)*: permite à prefeitura testar uma solução em piloto pago com processo simplificado. Vale estudar a fundo com alguém da área jurídica.
- **Porta de entrada:** secretarias de Meio Ambiente/Verde, de Zeladoria/Subprefeituras e programas de cidades inteligentes. Editais de inovação aberta e hubs municipais também são caminhos.
- **Modelo de cobrança:** SaaS por árvore monitorada/mês ou por bairro, mais hardware (sensores) vendido ou alugado.
- **Argumento central:** "cada muda que morre é dinheiro de plantio jogado fora". Mostrem o custo de replantio contra o custo do sistema.
- **LGPD:** fotos de campo podem pegar pessoas e placas de carro. Prevejam desfoque ou regra de captura.

## 9. Premissas a validar

- [ ] Limiares de umidade e litros por espécie/fase (com engenheiro agrônomo ou florestal).
- [ ] Quanto custa hoje para a prefeitura alvo plantar e manter uma muda, e qual a taxa de perda.
- [ ] Se a prefeitura alvo já tem inventário digital e em que formato.
- [ ] Custo real por ponto de sensor instalado (hardware + instalação + conectividade).
