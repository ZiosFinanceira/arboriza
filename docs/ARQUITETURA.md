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
- **Tempo em aberto (cor):** cronômetro sem limite. 🔵 < 3 dias · 🟡 3–7 · 🟠 7–10 · 🔴 ≥ 10 (pisca e fica sempre em destaque).
- **Fila das equipes:** urgentes → vermelhos → `peso do risco × (1 + dias/7)`. Assim nenhum chamado fica esquecido, porque todo chamado sobe na fila com o tempo.
- **Indicadores:** tempo médio de atendimento por tipo/risco/região, nº de vermelhos, chamados por equipe. É o que o gestor apresenta para a Câmara/TCE.
- **Próximos passos:** atribuir chamado a equipe, foto de antes/depois, SLA diferente por risco (ex.: urgente vira vermelho em horas, não em dias), integração com o sistema 156 da prefeitura e com a Defesa Civil em dias de temporal.

### 3.6 Indicadores para a prefeitura (o que justifica a compra)
- Taxa de sobrevivência de mudas (antes e depois).
- Litros de água por árvore viva e custo por árvore.
- Árvores não cadastradas incorporadas ao inventário.
- Cobertura de copa por bairro e cruzamento com **temperatura de superfície** (imagens Landsat/Sentinel), para mostrar onde plantar e o efeito ao longo dos anos.

## 4. Modelo de dados (inicial)

```
arvore(id, geom POINT, especie_id, origem, status, endereco, data_plantio,
       tem_sensor, criado_por, criado_em)
especie(id, nome, nome_cientifico, necessidade_agua, porte, adequada_calcada, obs)
leitura_sensor(arvore_id, momento, umidade_solo, temperatura_solo, bateria)
evento(arvore_id, tipo [irrigacao|adubacao|vistoria|poda|regularizacao],
       data, litros, responsavel, foto_url, obs)
ordem_servico(id, data, tipo, equipe, rota GEOMETRY, status)
chamado(id, arvore_id NULL, geom POINT, tipo, risco, origem, descricao,
        status [aberto|atendimento|concluido], aberto_em, concluido_em, equipe_id)
```

O protótipo já guarda um subconjunto disso e exporta em **GeoJSON**, formato que qualquer SIG municipal (QGIS, ArcGIS) abre.

## 5. Stack sugerida

| Camada | Agora (grátis) | Depois |
|---|---|---|
| Hospedagem do painel | **GitHub Pages** | Vercel (quando tiverem a vaga) |
| Mapa | Leaflet + tiles OSM | MapLibre + tiles próprios/vetoriais |
| Banco | localStorage (só protótipo) | **Supabase** (Postgres + PostGIS + auth, plano gratuito) |
| Clima | Open-Meteo (grátis, sem chave) | idem + estações locais/INMET |
| Sensores | simulados | ESP32 + sensor capacitivo + LoRa (protótipo de bancada) |

Observação: o servidor público de tiles do OpenStreetMap tem política de uso justo. Para o piloto com prefeitura, usem um provedor de tiles (MapTiler, Stadia etc.) ou hospedem os próprios.

## 6. Roadmap

**Fase 0 (agora):** protótipo navegável (este repositório). Serve para apresentar a ideia.

**Fase 1, MVP de piloto (1 bairro):**
- Backend no Supabase (tabelas acima + login por perfil: gestor, equipe de campo).
- App de campo (pode ser o próprio site responsivo, como PWA) para cadastrar e registrar irrigações.
- Importação da base da prefeitura parceira.
- Relatório mensal em PDF.

**Fase 2, sensores:**
- 10 a 30 sensores em um piloto e calibração do modelo de umidade.
- Alertas por WhatsApp/e-mail para a equipe.

**Fase 3, escala:**
- Detecção automática de árvores por imagem.
- Mapa de calor × cobertura de copa para planejar plantio.
- Integração com sistemas da prefeitura (ordem de serviço, 156).

## 7. Como vender para prefeitura (pontos para estudar)

- **Contratação pública:** Lei 14.133/2021 (licitações) e, para startups, o **Marco Legal das Startups (LC 182/2021)**, que criou o *Contrato Público para Solução Inovadora (CPSI)*: permite à prefeitura testar uma solução em piloto pago com processo simplificado. Vale estudar a fundo com alguém da área jurídica.
- **Porta de entrada:** secretarias de Meio Ambiente/Verde, de Zeladoria/Subprefeituras e programas de cidades inteligentes. Editais de inovação aberta e hubs municipais também são caminhos.
- **Modelo de cobrança:** SaaS por árvore monitorada/mês ou por bairro, mais hardware (sensores) vendido ou alugado.
- **Argumento central:** "cada muda que morre é dinheiro de plantio jogado fora". Mostrem o custo de replantio contra o custo do sistema.
- **LGPD:** fotos de campo podem pegar pessoas e placas de carro. Prevejam desfoque ou regra de captura.

## 8. Premissas a validar

- [ ] Limiares de umidade e litros por espécie/fase (com engenheiro agrônomo ou florestal).
- [ ] Quanto custa hoje para a prefeitura alvo plantar e manter uma muda, e qual a taxa de perda.
- [ ] Se a prefeitura alvo já tem inventário digital e em que formato.
- [ ] Custo real por ponto de sensor instalado (hardware + instalação + conectividade).
