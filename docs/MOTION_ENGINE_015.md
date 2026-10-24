# Dark Studio v0.15 — Motion Engine (primeiro incremento)

A v0.15 amplia o **vocabulário declarativo de direção audiovisual**, sem executar JS, HTML ou CSS enviados pela IA. Mantém **projeto JSON schema v2**, **direção schema v1**, 30 FPS / 1920×1080, 50 presets existentes e revisão pelo Codex antes de aplicar. As camadas continuam editáveis.

## O que está realmente implementado neste incremento

| Fundamento | JSON + validação | Prévia e MP4 (mesmo componente) | Editor |
| --- | --- | --- | --- |
| Tipografia | `fontFamily`, `fontWeight`, `textAlign`, `letterSpacing`, `lineHeight`, `strokeColor`, `strokeWidth`, `effects.gradient`, `behavior: "word-reveal"` | CSS nativo, contorno, gradiente, palavra a palavra | Campos de texto, fonte, contorno e espaçamento |
| Grupos e efeitos | `kind: "group"`, `parentId` no projeto, `key`/`parentKey` no `direction.json`, `effects` | Árvore de camadas hierárquica com transformações herdadas, sombra, blur, cantos e máscara circular/elíptica | Criar grupo, associar elemento, editar efeitos, duplicar subárvore, excluir com descendentes |
| Vetores autorais | `kind: "vector"` + `vectorPath` SVG com sintaxe restrita | `<path>` editável renderizado como SVG no mesmo canvas | Campo do caminho vetorial e estilos |
| Câmera | `cameraPath` em `beat` / `shot` | Interpolação determinística entre pontos (X/Y em px, zoom, rotação) | Inserir, modificar, excluir pontos; trajetória-modelo |
| Transição 2D | `transitionIn: {type,durationFrames}` | Corte, fusão, deslizar, revelar; quando há plano contíguo, reexibe os últimos frames do plano anterior durante a entrada | Tipo e duração no inspetor |

**Ainda não implementado:** importação direta de direction JSON pelo dashboard, importação de fontes em arquivo e empacotamento de fontes, character rig com braços/pernas e troca de poses, câmera seguindo automaticamente objetos, mola/física, parallax de profundidade real, máscaras arbitrárias por caminho, agrupamento automático por seleção múltipla, gráficos de fluxos de dinheiro avançados, licenciamento automático de B-roll, inspeção computacional dos pixels renderizados e pacote único `.darkstudio`. Nada disso deve ser descrito como pronto.

## Como a IA cria uma cena do zero

Leia o exemplo completo [MOTION_ENGINE_015.direction.example.json](examples/MOTION_ENGINE_015.direction.example.json). Ele cobre 360 frames de um projeto de **12 segundos**. Na primeira cena, `key: "carteira"` identifica um grupo. Os filhos usam `parentKey: "carteira"`; o compilador cria os UUIDs reais e converte em `parentId` antes de armazenar no projeto. Cada filho tem posição e tempo **relativos ao grupo**. Uma transformação do grupo afeta todos os filhos. Uma camada só pode apontar para grupos existentes; autorreferência e ciclos são rejeitados.

O exemplo mantém gráficos ilustrativos **sem números fictícios**. Para um gráfico factual com `values[]`, a evidência cadastrada e a revisão humana continuam obrigatórias.

**Fluxo real de aplicação:** crie um projeto com 360 frames, obtenha UUID e revisão com `npm run project -- info UUID`, execute `npm run project -- direct UUID docs/examples/MOTION_ENGINE_015.direction.example.json REVISAO`, depois abra **Revisar Codex**. A direção produz **uma proposta**, não modifica silenciosamente um projeto. Se o projeto tiver outra duração, ajuste todos os `beats` para cobri-la antes de executar.

## Campos e limites

**Layer** (além dos campos v0.14): `parentId` = UUID de outra camada `group`, `fontFamily` = nome de fonte instalada no ambiente de render (até 100 caracteres seguros; se ausente, Arial), `fontWeight` 100–900, `textAlign` = `left|center|right`, `letterSpacing` -15…60 px, `lineHeight` 0.75…2.5, `strokeColor` = hex RGB, `strokeWidth` 0…12 px, `vectorPath` = SVG `d` de até 2000 caracteres com comandos de caminho e números. Não aceita HTML/JS.

**effects**: `blur` 0…40, `radius` 0…300, `shadowBlur` 0…80, `shadowX` / `shadowY` -100…100, `shadowColor` hex, `mask` = `none|circle|ellipse`, `gradient` opcional com `from`, `to` hex e `angle` 0…360. O gradiente incide sobre texto, forma ou vetor; nos outros elementos os efeitos de camada (blur, máscara etc.) continuam disponíveis. Valores ausentes recebem defaults seguros.

**Group**: uma camada `kind:"group"` é um contêiner posicionável e animável, sem desenho próprio. O grupo pode conter outros grupos, desde que não haja ciclos. Os filhos não podem usar `cueCaptionId`: seu tempo é relativo ao início do grupo. A camada precisa caber no intervalo do grupo. `layers` permanece limitado a 48 elementos por plano **contando grupos**.

**Camera**: `cameraPath:[{frame,x,y,zoom,rotation,easing}]` em cada beat ou shot: máximo 24 pontos, frames crescentes menores que `durationFrames`, X -1920…1920, Y -1080…1080, zoom 0.5…4, rotação -45…45 graus, interpolação `linear|ease-in|ease-out|ease-in-out`. Sem pontos, câmera neutra. A câmera move a composição do plano, sem alterar a locução/legenda.

**Transition**: `transitionIn:{type:"cut"|"fade"|"slide-left"|"wipe",durationFrames:1..90}`. O valor deve caber na duração do plano quando for diferente de `cut`. Se o plano anterior é contíguo na timeline, a transição recupera seus últimos frames; caso contrário, a entrada se dá sobre o fundo. A duração do episódio e os tempos do áudio **não se deslocam**.

## Compatibilidade e limites técnicos

Projetos antigos continuam em `version:2`. Ao carregar planos da v0.14 sem `cameraPath`, `transitionIn`, tipografia ou `effects`, o parser adiciona defaults e preserva as imagens, clipes, legendas e evidências. Os presets v0.14 não são removidos nem duplicados. Preview e MP4 reutilizam `src/video/Documentary.tsx`, `ShotVisual.tsx` e `AnimatedLayer.tsx`. Mesmo com esses componentes compartilhados, a fidelidade das fontes **depende das fontes instaladas na máquina de render** e pode diferir em outros computadores. A inspeção dos frames exportados e a revisão editorial continuam obrigatórias.

O incremento abre espaço para o segundo conjunto de melhorias: personagens articulados, gráficos econômicos guiados por fonte, media/B-roll autorizado, inspeção de frames rasterizados e arquivo audiovisual portátil. Não confundir planejamento com função já disponível.
