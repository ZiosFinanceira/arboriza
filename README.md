# 🌳 Arboriza

Protótipo de um sistema para **mapear árvores de calçada** (plantadas pela prefeitura e as não cadastradas) e **decidir irrigação e adubação** de forma inteligente, para que as mudas sobrevivam e, no futuro, ajudem a baixar a temperatura das cidades.

> Visão completa, arquitetura, roadmap e modelo de negócio: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)

## O que o protótipo já faz

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
- 📥 Importar árvores do **OpenStreetMap** da área visível; exportar e importar **GeoJSON**.

Os dados ficam só no navegador (localStorage). Os sensores são **simulados**.

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

## Estrutura

```
index.html         página principal
css/style.css      visual
js/data.js         cidade, catálogo de espécies, árvores de exemplo  ← trocar a cidade aqui
js/engine.js       motor de decisão (irrigação/adubação), funções puras
js/chamados.js     controle urbano: tipos, riscos, faixas de cor, prioridade  ← ajustar prazos aqui
js/app.js          interface: mapa, lista, rota, cadastro, importação
docs/ARQUITETURA.md visão do produto e próximos passos
```

### Trocar a cidade

Em `js/data.js`, altere `CONFIG.cidade`, `CONFIG.centro` (lat, lng) e, se quiser, as árvores de exemplo.

### Ajustar as regras

Em `js/engine.js`, o objeto `PARAMS` tem os limiares de umidade, os litros por fase, a chuva que adia a rega e os intervalos de adubação.
**Os valores atuais são referências de protótipo** e devem ser validados com um engenheiro agrônomo ou florestal.

## Próximos passos sugeridos

1. Backend no **Supabase** (Postgres + PostGIS, plano gratuito) no lugar do localStorage.
2. Login com perfis (gestor / equipe de campo) e modo celular (PWA) para cadastro em campo com foto.
3. Protótipo de sensor de bancada: ESP32 + sensor capacitivo de umidade + LoRa.
4. Conversar com uma prefeitura para conseguir a base de árvores dela e um bairro piloto.
