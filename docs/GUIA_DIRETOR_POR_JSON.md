# Guia Diretor por JSON — Dark Studio

> **Manual operacional e referência de capacidades para humanos, ChatGPT e Codex Local.**
> **Estado documentado:** Dark Studio **v0.18.0 (AI Production Engine — JSON direto, voz SAPI e sincronização por bloco)** · `project.json` **schema v2** · `direction.json` **schema v1** · serviço local **protocolo 7**.
> **Branch de código:** `main`. **Última revisão editorial deste guia:** 2026-10-24.
> **Contrato de manutenção:** este guia é **vivo**. Toda nova funcionalidade ou alteração de schema/comando deve atualizar este documento, seus exemplos e os testes do guia no mesmo PR/commit. Consulte [Como manter atualizado](#19-como-atualizar-este-guia-nas-próximas-versões).

## Para que serve

Este é o documento que uma IA deve ler **antes de escrever o JSON que dirige um vídeo**. Ensina a descobrir as ferramentas disponíveis, estruturar episódios, planejar planos em frames, usar **50 composições preservadas da v0.14 + 7 estilos investigativos e recursos autorais v0.15**, construir personagens e animações próprios em camadas, associar fontes e mídias, preparar propostas revisáveis e conferir resultados. É válido para vídeos educativos, histórias, economia, tecnologia, ciência, entretenimento e investigações; **não** somente jornalismo.

**Regra central:** uma IA criativa produz decisões de direção em **JSON declarativo**; o Dark Studio interpreta essas decisões de maneira determinística via Remotion; o Codex Local, quando autorizado, cuida de operações no Windows, mídia, validação e render. O editor **não tem chat/modelo de IA interno** e **não lê qualquer JSON colado na interface como uma importação automática de direção** nesta versão. O caminho suportado é a CLI `direct` / propostas; a interface permite **importar projeto completo**. Não confundir esses dois recursos.

### Sumário

1. [Comece aqui: vídeo com direção por JSON](#1-comece-aqui-vídeo-com-direção-por-json)
2. [Os três tipos de JSON](#2-os-três-tipos-de-json)
3. [Tempo, resolução, IDs e limites](#3-tempo-resolução-ids-e-limites)
4. [Tutorial: criar projeto, roteiro e duração](#4-tutorial-criar-projeto-roteiro-e-duração)
5. [Tutorial: escrever direction.json](#5-tutorial-escrever-directionjson)
6. [Catálogo das 50 composições e sete estilos](#6-catálogo-das-50-composições-e-sete-estilos)
7. [Tutorial: criar cenas autorais com layers](#7-tutorial-criar-cenas-autorais-com-layers)
8. [Personagens, cenários, objetos e animações](#8-personagens-cenários-objetos-e-animações)
9. [Keyframes, câmera, transições e sincronismo](#9-keyframes-câmera-transições-e-sincronismo)
10. [Dados, evidências e ética editorial](#10-dados-evidências-e-ética-editorial)
11. [Narração, áudio, músicas, SFX e legendas](#11-narração-áudio-músicas-sfx-e-legendas)
12. [Mídia local, B-roll e licenciamento](#12-mídia-local-b-roll-e-licenciamento)
13. [JSON de operações: editar além da direção](#13-json-de-operações-editar-além-da-direção)
14. [Prévia, revisão, produção e exportação](#14-prévia-revisão-produção-e-exportação)
15. [Referência completa dos comandos locais](#15-referência-completa-dos-comandos-locais)
16. [Exemplo completo de episódio e direção criativa](#16-exemplo-completo-de-episódio-e-direção-criativa)
17. [Checklist, erros comuns e soluções](#17-checklist-erros-comuns-e-soluções)
18. [O que ainda NÃO está implementado](#18-o-que-ainda-não-está-implementado)
19. [Como atualizar este guia nas próximas versões](#19-como-atualizar-este-guia-nas-próximas-versões)
20. [Prompt pronto para qualquer IA diretora](#20-prompt-pronto-para-qualquer-ia-diretora)

## 1. Comece aqui: vídeo com direção por JSON

**Caso recomendado:** você já tem um projeto no Dark Studio com roteiro/cenas e, idealmente, narração e legendas. Quer que uma IA desenhe a montagem visual sem destruir áudio.

1. No Windows, atualize o código com `ATUALIZAR.bat` e abra `INICIAR.bat`. Arquivos extras não versionados (por exemplo, dados gerados pelo app) não impedem a atualização, mas alterações em arquivos versionados do Codex continuam protegidas: concilie sem usar `git reset --hard`. O `INICIAR.bat` abre a versão já instalada, sem consultar o GitHub.
2. No **Codex do ChatGPT Desktop em modo Local**, abra o clone `D-E-V1` e autorize acesso às pastas locais de projetos/mídias. A IA **não é um modelo offline** só porque os arquivos estão no computador.
3. Peça ao Codex para executar os comandos a seguir, substituindo `UUID` pelo ID retornado pelo Dark Studio (os comandos são **PowerShell**, não código JSON):

   ```powershell
   npm run project -- service-info
   npm run project -- list
   npm run project -- info UUID
   npm run project -- production UUID status
   npm run project -- presets
   npm run project -- direction-template UUID "$env:TEMP\direcao-inicial.json"
   ```

4. A IA lê o `project.json` existente, vê o total de frames, as fontes, mídias, legendas e **propostas pendentes**. Edita o modelo local da direção ou cria outro `direction.json` conforme o [schema](#5-tutorial-escrever-directionjson) e o [catálogo](#6-catálogo-das-50-composições-e-sete-estilos).
5. Com a **revisão SHA-256 atual** exibida por `info`, o Codex apresenta a proposta visual:

   ```powershell
   npm run project -- direct UUID "$env:TEMP\direcao-inicial.json" REVISAO_SHA_ATUAL
   npm run project -- pending UUID
   ```

6. No cartão do projeto, abra **Revisar Codex**. Confira cobertura, variedade, personagens, gráficos, fontes e mídias; só então **aprove** ou **rejeite**. `direct` **não aplica** a proposta sozinho.
7. **Após a aprovação**, obtenha nova revisão, audite os planos salvos, gere amostras de frames e só depois exporte:

   ```powershell
   npm run project -- info UUID
   npm run project -- direction-report UUID
   npm run project -- doctor UUID
   npm run preview:frames -- UUID 30,90,150
   npm run project -- render UUID
   ```

   `direction-report` e `doctor` avaliam **o projeto salvo**, não automaticamente a proposta ainda pendente. `preview:frames` não prova que narração, mixagem e sincronismo estão bons. **Assista e ouça o MP4 inteiro antes de publicar.**

**Se for um episódio novo:** primeiro crie o projeto, determine a duração real das cenas/narração e importe áudio/fonte; somente depois faça o `direction.json`. **Se o projeto existente já tem uma proposta de 60 planos, não gere outra antes de revisar a anterior.**

## 2. Os três tipos de JSON

| Artefato | Versão do formato | O que contém | Como entrar no app | Cuidados |
| --- | --- | --- | --- | --- |
| **`project.json`** | `"version": 2` | Identidade do episódio, cenas, capítulos, assets, clips, voz, SFX, legendas, evidências, `visualMode`, `shots`, identidade visual | Projeto salvo em disco; `project import`, `apply` ou `replace`; importação pelo painel | É **todo o episódio**; exige IDs, referências e consistência |
| **`direction.json`** | `"version": 1` | Direção visual por `beats[]`: início, duração, propósito, estilo, `presetId`, `layers[]`, movimento, mídia, dados e marca | `npm run project -- direct UUID arquivo.json REVISAO` → proposta | **Não cria voz, cenas-base, legendas, mídias nem evidências**; duração tem de coincidir com o projeto |
| **`operacoes.json`** | **array** de operações; não usa `version` global | Alterações atômicas como editar cena, acrescentar fonte/clipe, identidade, legenda, plano | `preview` / `propose` (preferível) ou `apply` (direto) | Máximo **40 operações por lote**; operações diretas alteram projeto e exigem revisão |

Além destes, `docs/MOTION_STORYBOARD.example.json` e `docs/examples/GUIA_DIRECAO_12S.example.json` são exemplos de `direction.json`, **não arquivos de projeto completo**. Projetos criados em `%USERPROFILE%\DarkStudio\projects\<UUID>\project.json` são **privados e não devem ser commitados**. A biblioteca de mídia fica sob `%USERPROFILE%\DarkStudio\media`.

### De onde vem a verdade técnica

O guia explica o código, mas quem **aceita/rejeita o JSON** é a validação Zod destes arquivos:

- [`src/model/project.ts`](../src/model/project.ts) — esquema completo e duração do episódio;
- [`src/model/direction.ts`](../src/model/direction.ts) — direção, compilação, regras dos beats e auditoria;
- [`src/model/shots.ts`](../src/model/shots.ts) — tipos de plano, estilos, investigação, marca e keyframes;
- [`src/model/layers.ts`](../src/model/layers.ts) — geometria, personagens, gestos, props e animações;
- [`src/model/presets.ts`](../src/model/presets.ts) — 50 modelos *reais* e como viram camadas;
- [`src/model/operations.ts`](../src/model/operations.ts) — todos os tipos de operação;
- [`scripts/project-tool.ts`](../scripts/project-tool.ts) — comandos existentes e argumentos;
- [`apps/agent/src/diagnostics.ts`](../apps/agent/src/diagnostics.ts) — verificações de mídia/fontes;
- [`src/model/service-contract.ts`](../src/model/service-contract.ts) — compatibilidade frontend/serviço.

As validações são **estritas** (`.strict()`): campos extras inventados, por exemplo `camera3D`, `aiVoice` ou `renderPreset`, não são aceitos simplesmente por terem nomes plausíveis. Antes de adicionar um campo, consulte o schema.

## 3. Tempo, resolução, IDs e limites

**Relógio do motor: 30 FPS fixos.** Cada `startFrame` de beat é absoluto dentro do episódio. Cada `startFrame` de camada é **relativo ao plano** (a menos que ela use `cueCaptionId`). Os keyframes são relativos à duração de seu plano/camada. Legendas e `clips` usam frames **absolutos do episódio**.

| Tempo | Frames a 30 FPS |
| --- | ---: |
| 0,5 segundo | 15 |
| 1 segundo | 30 |
| 2 segundos | 60 |
| 3 segundos | 90 |
| 4 segundos | 120 |
| 5 segundos | 150 |
| 10 segundos | 300 |
| 12 segundos | 360 |
| 30 segundos | 900 |
| 1 minuto | 1.800 |
| 4min50s | 8.700 |

`frame = arredondar(segundos × 30)`. Não arredonde cada corte de forma independente sem conferir a soma: **o último beat deve terminar exatamente no frame final da soma de `scenes[].durationFrames`.**

**Exemplo com 12 s:** `[0,120)` → `[120,240)` → `[240,300)` → `[300,360)`. O final de um plano é o início do próximo. Não deixe buracos ou sobreposições nos beats de direção.

**Especificação v0.14:**

- Projeto: `fps = 30`, `width = 1920`, `height = 1080`; outros formatos e FPS não passam no `projectSchema`.
- `scenes[]`: 1–200 cenas, cada uma **15–1800 frames** (0,5–60 s); a soma define a duração total.
- `direction.beats[]`: 1–1500 planos; cada beat dura 1–18.000 frames; **continuidade perfeita** requerida.
- `shots[]`: até 4000 no modelo do projeto; o caminho de substituição da direção trabalha com no máximo **1500**.
- `layers[]`: máximo 48 por shot; limite recomendado menor que 28 em máquinas de 16 GB; `motion` até 40 keyframes por propriedade.
- `clips[]` até 4000; `assets[]` até 2000; `captions[]` até 3000; `evidence[]` até 2000.
- `chapters[]`: até 100, com `firstSceneId` válido e capítulos em ordem.
- Cores: exatamente seis dígitos hexadecimais, como `"#F0BB66"`. Use nomes de cores? **Não**: `"orange"` falha nos schemas.
- ID de projeto e de item visual: UUID quando exigido (`shot.id`, `layer.id`, `asset.id`, `caption.id`, `evidence.id`). A compilação de `direction.json` **gera IDs** dos planos/camadas; não insira `id` dentro de `beat.layers[]`.
- Revisão de salvamento: SHA-256 de **64 caracteres**, obtida via `npm run project -- info UUID`. **Não** é o UUID do projeto, nem o commit GitHub.

**Direção editorial:** prefira aproximadamente 2–5 s por plano se a narração e o conteúdo justificarem; use mais para leitura ou explicações complexas. **Não imponha variedade aleatória a cada 2 s**: a imagem deve progredir com a frase narrada.

## 4. Tutorial: criar projeto, roteiro e duração

### 4.1 Criar sem tocar em episódios antigos

```powershell
npm run project -- path
npm run project -- create "Por que comprar uma casa ficou tão difícil?"
npm run project -- list
npm run project -- info UUID_RECEM_CRIADO
npm run project -- show UUID_RECEM_CRIADO
```

O projeto novo vem com **uma cena de exemplo de 180 frames (6 s)**, sem áudio. Isso **não é um documentário pronto** e **não serve** de base para uma direção de quatro minutos sem antes estruturar cenas e duração. `show` imprime JSON completo com dados privados: mantenha a saída apenas na máquina autorizada.

### 4.2 Organizar roteiro e capítulos

Um episódio pode ter cinco capítulos e dezenas de planos. **Capítulo** organiza a história; **cena-base** determina a linha narrativa e a duração; **plano/shot** determina o que a pessoa vê ao longo de uma ou várias cenas.

Exemplo de **operação parcial**, em `operacoes.json`, para atualizar o texto de uma cena que **já existe**:

```json
[
  {
    "type": "updateScene",
    "sceneId": "scene-1",
    "changes": {
      "title": "A conta não fecha",
      "subtitle": "Uma explicação sobre entrada, renda e prazo.",
      "kicker": "CAPÍTULO 01"
    }
  }
]
```

`"scene-1"` existe no projeto de demonstração do repositório, **não necessariamente no projeto recém-criado**. Sempre substitua pelo ID real encontrado em `show`. Para mudar duração, use `changes.durationFrames`, com cuidado para não deixar clips, legendas e planos fora dos limites; planeje o tempo antes de sincronizar áudio.

Fluxo não destrutivo:

```powershell
npm run project -- info UUID
npm run project -- preview UUID ".\operacoes.json" REVISAO_SHA
npm run project -- propose UUID ".\operacoes.json" REVISAO_SHA
```

No painel, use **Revisar Codex**. `preview` não grava. `propose` grava **somente a proposta**. O `apply` direto existe, mas não é recomendado para alterações editoriais que o usuário ainda não aprovou.

### 4.3 Estrutura fundamental de um projeto completo

Este é um **mapa do esquema**, não um `project.json` pronto para importar (UUIDs, cenas, canais, mídia e duração dependem do episódio real):

| Chave do `project.json` | Função | Observação |
| --- | --- | --- |
| `version` | Sempre 2 | Diferente de `direction.version = 1` |
| `id`, `name` | Identidade do projeto | ID da pasta do Windows deve coincidir com `project.id` |
| `fps`, `width`, `height` | 30 / 1920 / 1080 | Fixos nesta versão |
| `scenes[]` | Roteiro-base e soma da duração | `kind`: `title`, `stat`, `quote`; campos: `id`, `title`, `subtitle`, `kicker`, `durationFrames`, `accentColor`, `backgroundColor`, `imageUrl` opcional |
| `chapters[]` | Capítulos | `id`, `title`, `firstSceneId` |
| `assets[]` | Mídia **importada localmente** | UUID, `kind` imagem/vídeo/áudio, `mime`, `name`, `url` interna, duração opcional |
| `clips[]` | Blocos de timeline | `lane`: `visual`, `narration`, `music`, `sfx`; `assetId`, início/duração/trim, volume e keyframes |
| `captions[]` | Legendas | ID, início/fim absolutos, texto, `words[]` opcional |
| `evidence[]` | Alegações e rastreabilidade | Fonte, datas, trecho, região, unidade, direitos e status humano |
| `visualMode` | `legacy` ou `shots` | `legacy` lê visuais tradicionais; `direct` prepara `shots` |
| `shots[]` | Montagem visual detalhada | Estilo, motion, mídia local ou camadas |
| `channelKit` | Identidade do canal | Nome, fonte, destaque e estilo de legenda |

`import` recebe um projeto completo válido e **gera um novo UUID para não sobrescrever outro projeto**. Não crie caminhos de mídia inventados; `assets[].url` precisa corresponder ao serviço local `http://127.0.0.1:4317/media/<UUID>` e ao arquivo efetivamente importado.

## 5. Tutorial: escrever direction.json

### 5.1 Estrutura mínima e campos aceitos

```json
{
  "version": 1,
  "title": "Exemplo de direção visual de 12 segundos",
  "beats": [
    {
      "startFrame": 0,
      "durationFrames": 120,
      "purpose": "hook",
      "title": "O sonho da casa própria",
      "presetId": "person-worker",
      "motionPreset": "subtle-zoom"
    },
    {
      "startFrame": 120,
      "durationFrames": 120,
      "purpose": "context",
      "title": "A cidade muda",
      "presetId": "world-city",
      "motionPreset": "pan-left"
    },
    {
      "startFrame": 240,
      "durationFrames": 120,
      "purpose": "conclusion",
      "title": "A pergunta continua",
      "presetId": "youtube-chapter",
      "motionPreset": "still"
    }
  ]
}
```

Este JSON **é sintaticamente válido e cobre 360 frames**, mas `direct` só funcionará se o **projeto-alvo também durar 360 frames**. O exemplo mais completo, com `layers[]` originais, ficará em [`GUIA_DIRECAO_12S.example.json`](examples/GUIA_DIRECAO_12S.example.json), verificado em teste automático.

### 5.2 Todos os campos do beat (v0.14)

| Campo | Obrigatório? | Valor / significado |
| --- | --- | --- |
| `startFrame` | Sim | Frame de início absoluto, ≥0; deve coincidir com o fim do beat anterior |
| `durationFrames` | Sim | Inteiro 1–18000 |
| `purpose` | Sim | `hook`, `context`, `proof`, `data`, `contrast`, `location`, `transition`, `conclusion` |
| `title` | Sim | Texto até 180 caracteres; pode ser string vazia |
| `subtitle` | Não | Até 400; padrão vazio |
| `kicker` | Não | Até 100; etiqueta ou capítulo |
| `style` | Não | Estilo de plano reconhecido; se omitido, deriva do `purpose` |
| `presetId` | Não | Um dos **50 IDs** do catálogo; gera layers procedurais editáveis |
| `layers` | Não | Até 48 componentes autorais; **se presente, mesmo `[]`, tem precedência sobre o preset** |
| `data` | Não | `{labels,values,unit,sourceEvidenceId}`; dados para receitas de gráfico, vinculados a evidência cadastrada |
| `assetId` | Não | UUID de mídia visual **já importada**; não combina com `presetId`; para misturar mídia e objetos, use layer `image` |
| `zIndex` | Não | Número inteiro entre -20 e 20; padrão 0 |
| `accentColor` | Não | Cor hex `#RRGGBB` |
| `backgroundColor` | Não | Cor hex `#RRGGBB` |
| `investigation` | Não | Dados investigativos, representação, fonte, pontos, mapa esquemático, comparação e destaques |
| `motionPreset` | Não | `subtle-zoom` (padrão), `pan-left`, `pan-right`, `emphasis` ou `still` |

Campos da raiz: `version: 1`, `title` de 1–120 caracteres, `brand` opcional (mesmas propriedades parciais de `channelKit`: `brandName`, `font`, `accentColor` e `captionStyle`), e `beats[]` 1–1500.

**Exemplo de `brand`:** `{"brandName":"Canal Explica","font":"sans","accentColor":"#F0BB66","captionStyle":"boxed"}`. `font` só aceita `sans`, `serif` e `mono`; `captionStyle` aceita `boxed` e `minimal`.

### 5.3 Estilos, propósito e movimentos

O compilador escolhe o estilo padrão por intenção quando `style` é omitido:

| `purpose` | `style` padrão | Uso |
| --- | --- | --- |
| `hook` | `dossier` | Abrir pergunta com impacto |
| `context` | `headline` | Situar problema/pessoa/lugar |
| `proof` | `document` | Mostrar documento / prova cadastrada |
| `data` | `chart` | Apresentar medida verificável |
| `contrast` | `comparison` | Contrapor hipóteses, épocas, situações |
| `location` | `map` | Relação espacial **esquemática**, não geolocalização |
| `transition` | `lower-third` | Identificação ou passagem |
| `conclusion` | `evidence` | Reunir pontos e lacunas |

**Todos os `style` válidos**, mesmo fora da categoria investigativa: `headline`, `split`, `number`, `quote`, `chapter`, `timeline`, `dossier`, `document`, `evidence`, `chart`, `map`, `comparison` e `lower-third`. Esses estilos são visuais nativos; `presetId` e `layers` fornecem a outra via de composição.

**`motionPreset`** afeta o **plano inteiro**, não uma animação detalhada de personagem: `subtle-zoom` (aproximação sutil), `pan-left`, `pan-right`, `emphasis`, `still`. Para controlar cada elemento, use `layers[].behavior` e `layers[].motion`.

### 5.4 Regras de direção que a IA deve seguir

- **Planejar pela locução real:** cada plano precisa de uma razão visual, não apenas rotacionar presets.
- **Não colocar `presetId` e `layers: []` juntos** esperando gerar o modelo: um array vazio sobrepõe o preset e pode resultar em plano sem elementos.
- **Não inventar dados ou links.** Sem fonte, use infografia claramente ilustrativa e não números factuais.
- **Não confundir projeto salvo com proposta:** mesmo que a prévia mostre 60 planos, `direction-report` pode mostrar zero enquanto o usuário não aprovar.
- **Não “corrigir” duração mexendo em áudio por baixo dos panos.** Se a narração tem 4min49s, ajuste cenas antes da direção; `direct` rejeita incompatibilidade.
- **Não criar um PDF, mapa oficial, captura de notícia ou pessoa real fictícia** para simular prova.
- **Não despejar 50 presets diferentes no mesmo vídeo** só porque eles existem. Variedade só quando faz sentido.

## 6. Catálogo das 50 composições e sete estilos

**Fonte oficial:** `src/model/presets.ts`. As composições são **receitas com peças vetoriais editáveis**, não arquivos MP4 achatados, templates 3D ou imagens geradas por IA. `presetId` instancia `layers[]` nativos. Sempre descubra os IDs reais na versão instalada:

```powershell
npm run project -- presets
npm run project -- presets Personagens
npm run project -- composition-example person-family "$env:TEMP\familia-camadas.json"
```

`composition-example` cria um **blueprint de layers** com `note` e `durationFrames` auxiliares; ele **não é** `direction.json`. Copie somente `layers[]` para um beat com duração compatível.

### A. Personagens (10)

| ID `presetId` | Composição | Exemplos de uso |
| --- | --- | --- |
| `person-worker` | Trabalhador e objetivo | Salário, metas, esforço |
| `person-family` | Família e orçamento | Vida cotidiana, decisões |
| `person-banker` | Analista bancário | Crédito, contratos |
| `person-builder` | Construção em progresso | Trabalho e infraestrutura |
| `person-teacher` | Professor explicando | Educação e conceitos |
| `person-scientist` | Cientista e hipótese | Métodos, hipóteses |
| `person-reporter` | Repórter editorial | Contextualização |
| `person-student` | Estudante e futuro | Novas gerações |
| `person-crowd` | Multidão e sociedade | Comportamento coletivo |
| `person-dialogue` | Dois pontos de vista | Debate/contraponto |

### B. Cenários (8)

| ID | Composição | Exemplos de uso |
| --- | --- | --- |
| `world-city` | Cidade que se constrói | Urbanização |
| `world-apartment` | Dentro do apartamento | Moradia |
| `world-bank` | Agência e crédito | Financiamento |
| `world-office` | Rotina no escritório | Emprego |
| `world-market` | Custo no supermercado | Consumo |
| `world-building` | Canteiro de obras | Construção |
| `world-street` | Rua e mobilidade | Transporte |
| `world-studio` | Estúdio de explicações | Educação |

### C. Economia e dados (10)

| ID | Composição | Comportamento inicial |
| --- | --- | --- |
| `data-bars` | Barras comparativas | Gráfico de barras |
| `data-trend` | Curva de tendência | Gráfico de linha |
| `data-ranking` | Ranking explicado | Gráfico de barras/ranking |
| `data-donut` | Partes de um todo | Gráfico donut |
| `data-budget` | Orçamento doméstico | Fluxograma ilustrativo |
| `data-salary-home` | Salário versus casa | Duas colunas A/B |
| `data-loan` | Financiamento ilustrado | Linha do tempo |
| `data-interest` | Juros acumulados | Gráfico de área |
| `data-prices` | Linha histórica de preços | Linha do tempo |
| `data-counter` | Número em destaque | Tipografia cinética |

**Atenção:** nomes econômicos não transformam estes modelos em calculadoras. `data-budget`, `data-loan`, `data-prices` e `data-salary-home` começam como diagramas editoriais. Para valores reais, informe e revise os dados com fontes.

### D. Narrativa e investigação (8)

| ID | Composição |
| --- | --- |
| `story-wall` | Mural de pistas |
| `story-before-after` | Antes e depois |
| `story-timeline` | Linha do tempo |
| `story-headline` | Manchete em foco |
| `story-folder` | Pasta do arquivo |
| `story-causality` | Causa e consequência |
| `story-chronology` | Cronologia escalonada |
| `story-relations` | Rede de relações |

### E. Explicações educativas (8)

| ID | Composição |
| --- | --- |
| `explain-flowchart` | Fluxograma didático |
| `explain-cycle` | Ciclo de processos |
| `explain-cutaway` | Corte de objeto |
| `explain-layers` | Camadas separadas |
| `explain-zoom` | Lupa em detalhe |
| `explain-gears` | Engrenagens e sistema |
| `explain-particles` | Partículas e ligações |
| `explain-scales` | Comparação de escalas |

### F. Identidade e YouTube (6)

Nome oficial da categoria no catálogo: **YouTube e identidade**.

| ID | Composição |
| --- | --- |
| `youtube-intro` | Abertura cinematográfica |
| `youtube-identity` | Identificação editorial |
| `youtube-quote` | Citação animada |
| `youtube-chapter` | Cartão de capítulo |
| `youtube-cta` | Chamada para ação |
| `youtube-credits` | Créditos finais |

### Sete visuais investigativos pré-v0.14

`dossier` (dossiê), `document` (documento), `evidence` (cadeia de evidências), `chart` (gráfico), `map` (**esquema**, não geolocalização), `comparison` (comparação) e `lower-third` (identificação). São valores de `beat.style`, **não** `presetId`. O estilo `map` não inventa coordenadas.

**Como decidir:** leia o conteúdo da narração → defina intenção → escolha visual que acrescenta informação → aplique movimento → inspecione legibilidade. Não use os 50 modelos só para comprovar variedade.

## 7. Tutorial: criar cenas autorais com layers

O Codex ou outra IA pode criar a **composição número 51** combinando objetos no `direction.json`. O motor aceita **dados declarativos**, mas **não executa React/JS/CSS/HTML arbitrário** fornecido pela IA.

### 7.1 Um beat original completo

```json
{
  "startFrame": 0,
  "durationFrames": 120,
  "purpose": "hook",
  "title": "Por que comprar uma casa é tão difícil?",
  "motionPreset": "still",
  "layers": [
    {
      "kind": "character",
      "name": "Trabalhador refletindo",
      "x": 1160, "y": 320, "width": 365, "height": 610,
      "characterType": "worker", "expression": "thinking",
      "behavior": "nod", "color": "#F0BB66"
    },
    {
      "kind": "object",
      "name": "Casa ilustrativa",
      "x": 830, "y": 585, "width": 210, "height": 210,
      "objectType": "home", "behavior": "float", "startFrame": 15
    },
    {
      "kind": "text",
      "name": "Pergunta editorial",
      "x": 115, "y": 125, "width": 920, "height": 245,
      "text": "E A CASA PRÓPRIA?", "fontSize": 88,
      "color": "#F6EBDD", "behavior": "typewriter"
    }
  ]
}
```

É **um beat**, não o `direction.json` completo. Não inclua `id` dentro dos layers de direção: o compilador cria os UUIDs. Ao editar diretamente `project.shots[].layers[]` após a aprovação, o `id` passa a ser obrigatório.

### 7.2 Todos os campos de camada aceitos no v0.14

| Campo | Regra | Uso |
| --- | --- | --- |
| `kind` e `name` | **Obrigatórios**; nome 1–90 | Tipo/identificação |
| `x`, `y` | **Obrigatórios**; x de -400 a 2400, y de -400 a 1400 | Posição no canvas |
| `width`, `height` | **Obrigatórios**; 8–2400 e 8–1800 | Dimensões |
| `zIndex` | -30..30, default 0 | Ordem de empilhamento |
| `startFrame` | Padrão 0; relativo ao plano | Início do objeto |
| `durationFrames` | Pode omitir; duração restante do beat | Vida útil do objeto |
| `cueCaptionId` | UUID de legenda sobreposta ao plano | Entrada sincronizada |
| `cueOffsetFrames` | Inteiro -1800..1800 | Ajuste relativo à legenda |
| `color`, `secondaryColor` | `#RRGGBB` | Cores |
| `text` | Até 400 caracteres | Texto nativo |
| `fontSize` | 12..260 | Tipografia |
| `value`, `unit` | Número finito, unidade até 24 caracteres | Contadores |
| `labels[]`, `values[]` | Até 12 itens cada | Dados de gráfico |
| `chartType` | `bar`, `line`, `donut`, `ranking`, `area` | Apresentação de gráfico |
| `sourceEvidenceId` | UUID da evidência registrada | Obrigatório para `chart` com valores |
| `illustrative` | Booleano, padrão `true` | Representação ilustrativa |
| `objectType` | Ícone do catálogo | Camadas de objeto |
| `characterType`, `expression` | Rig/emoção do catálogo | Camadas de personagem |
| `sceneType` | Ambiente do catálogo | Cenário |
| `shapeType` | Forma do catálogo | Forma simples |
| `behavior`, `behaviorIntensity` | Comportamento; intensidade 0..3 | Animação procedural |
| `motion` | Keyframes de x/y/scale/rotation/opacity | Animação própria |
| `assetId` | UUID de imagem importada | Obrigatório se `kind:"image"` |

**Todos os 10 tipos `kind`:** `text`, `character`, `object`, `building`, `scene`, `chart`, `shape`, `connector`, `particles`, `image`.

A camada `image` exige arquivo **de imagem** já importado. Não há um tipo `video` em `layers`. Para vídeo, use um plano ou clip de vídeo com `assetId` local. Valores numéricos de `chart` não vazios exigem `sourceEvidenceId` cadastrado.

### 7.3 Receita própria com múltiplas camadas

Para um plano de 4 s, sugiro: cenário `scene` em `x:0,y:0,width:1920,height:1080,zIndex:-5`; personagem `character` na direita; objeto simbólico no centro; título e subtítulo na esquerda; entradas com `startFrame` em 0, 8, 16 e 22 frames. Reserve área inferior para legendas. Cada elemento **tem seu próprio tempo, gesto e movimento**, editável no inspetor e na timeline.

Na interface: selecione o plano → **50 COMPOSIÇÕES · GALERIA** para modelos → **OBJETOS E CAMADAS** para personalizar → **TIMELINE DE ELEMENTOS** para arrastar/cortar. Aplicar outra receita substitui as camadas daquele plano após confirmação; faça backup ou use histórico para não perder alterações importantes.

## 8. Personagens, cenários, objetos e animações

### 8.1 Tipos de personagens

`characterType`: `worker`, `parent`, `child`, `banker`, `presenter`, `scientist`, `builder`, `student`, `silhouette`.

`expression`: `neutral`, `happy`, `sad`, `curious`, `surprised`, `worried`, `thinking`.

Os personagens são **SVG vetoriais estilizados**, com cabeça, membros e gestos. Não são atores virtuais realistas nem fazem lip-sync fonético.

### 8.2 Ambientes `sceneType`

`city`, `home`, `bank`, `office`, `supermarket`, `construction`, `street`, `studio`. Todos são ilustrações 2D e não retratos verificáveis de locais reais.

### 8.3 Ícones `objectType` (23)

`home`, `key`, `car`, `phone`, `coin`, `wallet`, `contract`, `clock`, `bank`, `cart`, `computer`, `truck`, `document`, `tree`, `heart`, `lightbulb`, `calendar`, `magnifier`, `book`, `gear`, `factory`, `rocket`, `pin`.

`shapeType`: `rectangle`, `circle`, `triangle`, `line`, `ring`, `pill`. `connector` cria linhas/setas; `particles` cria pontos animados. São símbolos editoriais, não fotografias.

### 8.4 Os 19 comportamentos `behavior`

| `behavior` | Resultado |
| --- | --- |
| `none` | Elemento estático |
| `float` | Flutuação |
| `pulse` | Pulsação sutil |
| `walk` | Passos e translação |
| `wave` | Acenar |
| `point` | Apontar |
| `nod` | Aceno de cabeça |
| `think` | Oscilação de pensamento |
| `celebrate` | Comemoração |
| `orbit` | Rotação |
| `shake` | Tremor |
| `parallax` | Deslocamento 2D de profundidade |
| `draw` | Revelação de traço |
| `typewriter` | Letras progressivas |
| `count` | Número animado |
| `grow` | Crescimento suave |
| `stagger` | Revelação em etapas |
| `slide-in` | Entrada lateral |
| `bounce` | Salto amortecido |

A aparência varia conforme `kind`. Por exemplo, `wave` anima o rig do personagem, enquanto `typewriter` tem efeito principal em `text`. Não espere esqueleto 3D, física avançada ou movimentação natural garantida.

## 9. Keyframes, câmera, transições e sincronismo

### 9.1 Movimento do plano versus movimento do layer

`motionPreset` é usado no `direction.json` e movimenta **o plano inteiro**. Os presets de câmera disponíveis são `subtle-zoom`, `pan-left`, `pan-right`, `emphasis` e `still`.

Para movimento personalizado de **plano já salvo**, edite `shots[].motion` por inspetor ou operação `updateShot`; para movimento **de um objeto**, use `layers[].motion` na direção ou no projeto.

| Propriedade | Limites do plano | Limites do layer |
| --- | --- | --- |
| `x` | -100..100 | -1920..1920 (offset) |
| `y` | -100..100 | -1080..1080 (offset) |
| `scale` | 0.4..3 | 0.1..5 |
| `rotation` | -90..90 graus | -360..360 graus |
| `opacity` | 0..1 | 0..1 |

### 9.2 Exemplo de `motion` completo

```json
{
  "x": [],
  "y": [],
  "scale": [
    {"frame": 0, "value": 1, "easing": "ease-in-out"},
    {"frame": 119, "value": 1.08, "easing": "linear"}
  ],
  "rotation": [],
  "opacity": [
    {"frame": 0, "value": 0, "easing": "ease-out"},
    {"frame": 12, "value": 1, "easing": "linear"}
  ]
}
```

Use em `layer.motion` de um layer com 120 frames ou em `shot.motion` após o plano existir. **Não** use `motion` diretamente dentro de `beat`: o schema de beat só aceita `motionPreset`. Todos os cinco arrays são necessários **se** enviar o objeto `motion`; caso contrário omita `motion` para defaults. Curvas `easing`: `linear`, `ease-in`, `ease-out`, `ease-in-out`. Frames ordenados, de zero até duração menos 1, no máximo 40 por propriedade.

### 9.3 Sincronismo com legenda

`cueCaptionId` aponta para uma legenda real, existente em `project.captions[]`, que **se sobrepõe ao shot**. O motor calcula o início relativo com:

```text
max(0, legenda.startFrame - shot.startFrame + cueOffsetFrames)
```

O offset aceita de -1800 a 1800 frames. A duração do elemento continua independente, mas o início é reposicionado conforme a legenda. Isso sincroniza a entrada ao **bloco** de legenda; não alinha palavras foneticamente nem faz reconhecimento de áudio.

### 9.4 Gramática de animação

Distribua entradas quando aparecem as ideias; reserve respiros; faça títulos surgirem com `typewriter`, objetos entrarem com `slide-in` e ligações desenharem com `draw`. `motion.opacity` faz fade. `zIndex` ordena a profundidade 2D. O motor **não** oferece câmera 3D livre, máscaras programáveis, parallax reconstruído de fotografias nem transições cinematográficas infinitas.

## 10. Dados, evidências e ética editorial

### 10.1 Campos de `evidence[]`

| Campo | Regra / significado |
| --- | --- |
| `id` | UUID único |
| `sceneId` | ID de uma cena-base existente (opcional) |
| `claim` | Afirmação até 500 caracteres |
| `sourceTitle` | Origem até 200 caracteres |
| `sourceUrl` | HTTPS válido ou string vazia |
| `notes` | Notas editoriais |
| `reviewStatus` | `pending` (padrão), `verified`, `rejected` |
| `sourceExcerpt` | Trecho que sustenta a afirmação |
| `publicationDate`, `accessedAt` | `YYYY-MM-DD` ou vazio |
| `region`, `unit` | Região/população e unidade dos valores |
| `rights` | Direitos e uso de mídia, quando relevantes |

O Codex pode cadastrar evidências como **`pending`**; nunca deve promovê-las a `verified` sem revisão humana. Fonte cadastrada **não** significa fato confirmado.

**Operação de demonstração** (fonte inventada, para treinamento; **não publicar**):

```json
[
  {
    "type": "addEvidence",
    "evidence": {
      "id": "7bd13e73-bb05-4bf7-a158-bff8438d1801",
      "claim": "EXEMPLO — substituir por afirmação sustentada",
      "sourceTitle": "Fonte didática — NÃO VERIFICADA",
      "sourceUrl": "",
      "notes": "Exemplo sintético; nunca usar como prova.",
      "reviewStatus": "pending"
    }
  }
]
```

### 10.2 Tutorial: dados em gráficos

Uma **receita de gráfico** (`presetId:"data-bars"`, `"data-trend"`, `"data-interest"` etc.) pode receber o campo `data` no beat:

```json
{
  "labels": ["Período A", "Período B"],
  "values": [100, 115],
  "unit": "índice",
  "sourceEvidenceId": "7bd13e73-bb05-4bf7-a158-bff8438d1801"
}
```

Este fragmento contém **números inventados para demonstrar sintaxe**, não informações econômicas verdadeiras. Substitua por dados reais e por `sourceEvidenceId` de uma fonte efetivamente cadastrada no **projeto-alvo**, com unidade/período/região compatíveis e revisão humana. `layer.kind:"chart"` com `values[]` não vazio também exige `sourceEvidenceId`. Sem valores, a visualização pode mostrar placeholder **“DADOS PENDENTES”**.

**Gráficos investigativos antigos:** use `investigation.points[]` (até oito pares `{label,value}`) e `investigation.sourceEvidenceId`. Para `representation:"source-excerpt"`, origem registrada é obrigatória.

### 10.3 Todos os campos de `investigation`

`representation` = `illustration`, `reconstruction` ou `source-excerpt`; `sourceEvidenceId` (UUID opcional, conforme uso); `excerpt` (até 600 chars); `highlight` (até 140); `locationLabels[]` (até 4); `unit` (até 24); `points[]` (até 8 valores); `leftLabel`, `leftValue`, `rightLabel` e `rightValue` (até 80 cada). O schema não aceita valores extras arbitrários.

**Mapas atuais são esquemáticos**, não cartográficos ou geolocalizados. Documentos reconstruídos devem dizer **“reconstrução/ilustração”**. Não apresentar jornal fictício, screenshot sintético de banco ou retrato de pessoa real como prova de reportagem. Para gráfico factual, conferir denominação, recorte temporal, unidade e metodologia na fonte original.

## 11. Narração, áudio, músicas, SFX e legendas

### 11.1 O que o JSON de direção **não altera**

`compileDirection` substitui somente `shots[]`, habilita `visualMode:"shots"` e pode atualizar `channelKit` via `brand`. Mantém **`scenes[]`, `clips[]`, `captions[]`, `assets[]` e `evidence[]` inalterados**. Ele não gera locução, não transcreve voz, não compra música e não cria arquivos de mídia. Narração e sincronização precisam estar preparadas antes da montagem definitiva.

### 11.2 Trilhas do `project.clips[]`

| `lane` | Tipo de asset | Função |
| --- | --- | --- |
| `visual` | Imagem/vídeo | B-roll / recursos visuais |
| `narration` | Áudio | Voz principal |
| `music` | Áudio | Trilha licenciada |
| `sfx` | Áudio | Efeitos sonoros |

Cada `clip` contém `id` UUID, `assetId`, `lane`, `startFrame` absoluto, `durationFrames`, `trimStartFrames` (padrão 0), `volume` (0–1) e `volumeKeyframes[]` (até 40). O asset deve existir e o recorte não pode ultrapassar sua duração declarada. Keyframes de volume usam `frame` **relativo ao clip**, `value` de 0 a 1, `easing` de quatro tipos e ordenação estrita.

### 11.3 Nove sons WAV produzidos localmente

`soft-whoosh`, `page-turn`, `document-click`, `ambient-pulse`, `positive-chime`, `keyboard-tap`, `transition-sweep`, `notification-soft` e `impact-low`.

Exemplo: inserir `soft-whoosh` no frame 150, volume 0,18:

```powershell
npm run project -- sfx list
npm run project -- info UUID
npm run project -- sfx soft-whoosh UUID REVISAO_SHA 150 0.18
```

Isso produz WAV **sintético e privado** na biblioteca local e uma **proposta pendente** para asset + clip. Não gera foley profissional, não licencia música e não mistura sons automaticamente segundo a emoção. Ouça os efeitos e ajuste o volume para que não abafem a narração.

### 11.4 Narrador

A funcionalidade demonstrativa `npm run project -- pilot` cria um **novo projeto de 30 segundos** com narração Windows SAPI local, se houver voz adequada, e planos/legendas de demonstração. A qualidade e disponibilidade dependem das vozes instaladas. Para um episódio verdadeiro, é preciso gravar ou gerar áudio por ferramenta própria, importar e verificar **a duração medida do WAV**. O `direction.json` não tem campo `textToSpeech` ou `voicePrompt`.

### 11.5 SRT e legenda convencional

A interface suporta **Importar SRT** e **Exportar SRT**. Os timestamps são convertidos em frames a 30 FPS e validados (até 3000 blocos, sem sobreposição). Cada item de `project.captions[]` possui `id` UUID, `startFrame`, `endFrame` e `text`. Editar texto/tempo no inspetor atualiza o projeto; isso não altera a voz original.

### 11.6 Destaque por palavra

`captions[].words[]` é **opcional** e requer tempos reais **absolutos do episódio**. Exemplo didático, **não derivado de alinhamento fonético real**:

```json
{
  "id": "2eb15952-ae31-48b8-a98b-ab84784899af",
  "startFrame": 120,
  "endFrame": 180,
  "text": "A conta não fecha",
  "words": [
    {"text": "A", "startFrame": 120, "endFrame": 128},
    {"text": "conta", "startFrame": 128, "endFrame": 152},
    {"text": "não", "startFrame": 152, "endFrame": 163},
    {"text": "fecha", "startFrame": 163, "endFrame": 180}
  ]
}
```

O render destaca a palavra ativa. As palavras devem caber dentro do bloco da legenda, estar em ordem e não se sobrepor. **Não existe alinhador por palavra embutido na v0.14**: só preencha estes campos depois de obter e escutar um alinhamento feito a partir do áudio **real**. Modificar o texto ou tempo de uma legenda na interface pode descartar `words[]` para evitar destaque incorreto.

### 11.7 Melhor prática de áudio

Escreva → teste locução curta → ouça sotaque, ritmo e números → gere/importe narração completa → confira duração real → importe/alinha SRT → faça direção visual → ouça trecho de 30 s → revise MP4 completo. Sem áudio, o sistema pode produzir **vídeo mudo**, mas não chame esse resultado de documentário narrado.

## 12. Mídia local, B-roll e licenciamento

A biblioteca aceita **imagem, vídeo e áudio** importados, com UUID, MIME, nome e URL interna. `asset.kind` é `image`, `video` ou `audio`. `asset.url` no projeto deve ser exatamente `http://127.0.0.1:4317/media/<ID_DO_ASSET>`; não use URL pública de foto/vídeo como substituto de importação.

**Tutorial de B-roll:**

1. Localize uma imagem/vídeo com licença compatível com o uso do canal; registre URL original, data, autor, licença, atribuição e limitações.
2. Faça download legalmente **para a máquina**, importe pela biblioteca do Dark Studio e verifique se o serviço a encontra.
3. Consulte o asset no `project.json`, reutilize seu `assetId` no `direction.json` quando o plano for uma imagem/vídeo inteiro.
4. Se precisar de foto **dentro** de uma composição customizada, crie `layer.kind:"image"` com `assetId` de uma imagem importada. `layers[]` não admite vídeo como tipo de layer.
5. Renderize e revise recorte, direitos, identificação de reconstrução, duração e coerência. O vídeo final não deve depender de URLs de mídia temporárias.

**NUNCA:** colocar WAVs, MP4s, fontes pessoais, imagens licenciadas ou `project.json` em commit no GitHub. Os projetos estão em `%USERPROFILE%\DarkStudio\projects\<UUID>\project.json`; as mídias em `%USERPROFILE%\DarkStudio\media`. A IA no ChatGPT Desktop Local pode ter acesso autorizado a esses caminhos, mas o modelo **não é necessariamente offline**.

## 13. JSON de operações: editar além da direção

O `direction.json` é o caminho **preferido para montagem visual completa**. Para trabalhar também com roteiro, fontes, legendas, clips e marca, use **array de operações**. Os tipos aceitos por `src/model/operations.ts` são:

| Operação | Alvo | Efeito |
| --- | --- | --- |
| `updateScene` | `sceneId` + `changes` | Editar campos de cena-base |
| `addScene` | `scene` + `afterId` (ID ou `null`) | Inserir cena-base |
| `removeScene` | `sceneId` | Excluir cena, com limites de sincronismo |
| `moveScene` | `sceneId` + `direction` `left/right` | Reordenar cena, se não houver mídia/legendas/shots |
| `addAsset` | `asset` | Registrar mídia local **já existente/importada** |
| `addClip` | `clip` | Colocar mídia numa trilha |
| `updateClip` | `clipId` + `changes` | Volume, tempo, trim etc. |
| `removeClip` | `clipId` | Remover bloco de mídia |
| `replaceShots` | `shots[]` completos | Substituir todos os planos; cuidado |
| `addShot` | `shot` completo | Adicionar plano |
| `updateShot` | `shotId` + `changes` | Editar plano e/ou suas `layers` |
| `removeShot` | `shotId` | Remover plano |
| `replaceChapters` | `chapters[]` | Atualizar capítulos |
| `setVisualMode` | `visualMode` | Alternar `legacy` ou `shots` |
| `updateChannelKit` | `changes` | Identidade do canal |
| `replaceCaptions` | `captions[]` | Substituir legendas |
| `updateCaption` | `captionId` + `changes` | Editar legenda/words |
| `addEvidence` | `evidence` | Cadastrar fonte pendente |
| `updateEvidence` | `evidenceId` + `changes` | Atualizar origem/revisão |
| `removeEvidence` | `evidenceId` | Excluir evidência |

**Regras operacionais:** lote tem 1–40 operações, todas passam pela validação estrita de schema. `removeScene` é bloqueado quando há `shots` editáveis, pois ripple-edit completo não existe; `moveScene` é bloqueado se houver áudio, legendas ou planos. **Nunca force uma operação proibida editando JSON sem entender suas consequências.**

### 13.1 Exemplo real de operações de identidade

Veja o [JSON de operações de demonstração](examples/GUIA_OPERACOES.example.json). Ele edita a marca e a cena `scene-1` do **`starterProject` do repositório**. Para usar em um projeto criado pelo usuário, substitua `scene-1` pelo ID real de `project.scenes[]`. Não altere outro projeto por engano.

### 13.2 Prévia e proposta antes de editar

```powershell
npm run project -- info UUID
npm run project -- preview UUID ".\operacoes.json" REVISAO_SHA
npm run project -- propose UUID ".\operacoes.json" REVISAO_SHA
npm run project -- pending UUID
```

- `preview` apenas descreve diferenças; `propose` grava proposta para **Revisar Codex**.
- `direct` é uma forma especial de `propose` que gera `replaceShots` e `setVisualMode` a partir de `direction.json`, preservando narração.
- `apply UUID ops.json REVISAO` **grava no projeto diretamente**, com backup e revisão; use só com aprovação explícita e sem proposta pendente conflitante.
- `replace UUID project.json REVISAO` troca **todo o projeto**, exige cautela extra e pode descartar conteúdo se o JSON fornecido for incompleto. Prefira operação específica.
- `accept` e `reject` também existem na CLI, mas para trabalho editorial a pessoa deve decidir pela interface **Revisar Codex**.

### 13.3 Identidade do canal

`channelKit` admite:

```json
{
  "brandName": "Canal Explica",
  "font": "sans",
  "accentColor": "#F0BB66",
  "captionStyle": "boxed"
}
```

`font`: `sans`, `serif`, `mono`. `captionStyle`: `boxed` ou `minimal`. Você pode editar pelo painel de identidade, via `updateChannelKit` ou pelo `direction.brand` (proposta de direção). Isso não baixa fontes da internet nem aplica logotipos automaticamente.

## 14. Prévia, revisão, produção e exportação

### 14.1 Fluxo das propostas

O compilador valida o `direction.json` e produz uma prévia **do plano futuro**. `direct` grava `proposals/<ID>.json`, mas **não altera `project.shots[]`**. A página inicial mostra proposta pendente; **Revisar Codex** compara visual salvo e visual proposto. Após aprovação, a proposta é aplicada com backup/snapshot e o editor atualiza seu projeto. Se o projeto mudou entre a proposta e a aprovação, a revisão obsoleta bloqueia aplicação.

**Nunca interprete `0 shots` no projeto salvo e `60 shots` numa proposta como contradição.** É o estado esperado até aprovar.

### 14.2 Diagnóstico de cobertura e fontes

**Depois de aprovar**:

```powershell
npm run project -- direction-report UUID
npm run project -- doctor UUID
npm run project -- production UUID status
npm run project -- production UUID checkpoint
```

`direction-report` audita cobertura, buracos, planos longos/curtos, repetição de receitas, fonte não verificada, imagem/elementos muito perto das bordas e contraste/tamanho de texto **estimados**. A prévia de proposta também apresenta uma auditoria de cobertura. `doctor` confere mídias faltantes, cenas factuais sem fonte, fontes pendentes/rejeitadas e ausência de narração/legendas.

**`readyForRender` e `readyForEditorialReview` são estados técnicos.** Mesmo que não haja erros, você precisa verificar fatos, licenças, linguagem visual, áudio, proporções e clareza. `map` permanece ilustrativo; `visual-qa` não é OCR nem prova perceptual de legibilidade.

### 14.3 Painel de Produção e retomada

```powershell
npm run project -- production UUID status
npm run project -- production UUID checkpoint
npm run project -- production UUID continue
```

O `checkpoint` salva progresso em `production/checkpoint.json` **na pasta privada do projeto**. `continue` é um **fallback de direção ilustrativa**, não IA de pesquisa: só tenta uma proposta visual quando existem roteiro, áudio local acessível e legendas e quando não há proposta atual; nunca aprova automaticamente. **Se uma proposta já existe, não gere outra**: revise a primeira.

### 14.4 Prévia em PNG com cache

```powershell
npm run preview:frames -- UUID 0,75,150,225
```

Gera até **24 quadros por execução**, com render reduzido para aproximadamente **640×360**, salvos localmente em `%USERPROFILE%\DarkStudio\previews\<UUID>\<REVISAO>\`; quadros existentes daquela revisão são reutilizados. Requer serviço local compatível para URLs de mídia. Não representa áudio, movimento contínuo nem teste de vídeo completo.

### 14.5 Exportação MP4

```powershell
npm run project -- render UUID
```

Também há botão de exportação no editor. O serviço cria um job local com estado persistido, renderiza via Remotion/Chromium/FFmpeg com concorrência conservadora e grava o MP4 (pasta de vídeo local, informada ao final). Há histórico de jobs, identificação de render interrompido e detecção de concorrência. **Não existe retomada a partir do frame interrompido**; uma nova exportação pode refazer o vídeo inteiro. Testes CI a 640×360 não garantem fluidez/velocidade de 1080p durante minutos no computador do usuário.

### 14.6 Critérios antes da publicação

- Assista ao MP4 **inteiro**, com fones, e revise cortes, grafia, sincronismo, pronúncia, níveis de música e SFX.
- Confira todas as alegações e fontes, especialmente `reviewStatus:"pending"` ou `rejected`.
- Confirme que não há páginas/documentos ilustrativos aparentando ser reais sem aviso.
- Verifique licenças e atribuições do B-roll, músicas e imagens.
- Mantenha checkpoint/histórico dos arquivos anteriores e anote pendências.
- **Não declare o vídeo "pronto" apenas porque o JSON é válido, a cobertura é 100% ou um MP4 de 30 s foi renderizado.**


### 14.7 Tutorial prático: usar a interface do Dark Studio v0.14

Esta seção complementa a direção declarativa das seções 4–13 com um **passo a passo dos controles que existem no aplicativo**. O fluxo da interface não substitui o `direction.json`: o botão **Importar JSON** da tela inicial importa um **projeto completo**, não uma direção parcial. Para aplicar `direction.json`, use `direct` e revise a proposta (seções 5 e 14.1).

#### A. Dashboard: criar, preservar e localizar projetos

1. Abra `INICIAR.bat` na raiz do repositório (depois de instalar com `ATUALIZAR.bat`) e confira se a tela mostra um serviço local **compatível**. Se não mostrar, use `service-info` e o diagnóstico da seção 17; não prossiga supondo que `/health ready` basta.
2. Digite o nome e escolha **Criar projeto**. Para testar animação e narração do Windows sem usar um episódio real, existe o botão `Criar piloto audiovisual 30s`: é **piloto demonstrativo** e usa a voz SAPI instalada, não pesquisa/locução final aprovada.
3. Use `Importar JSON` somente com um `project.json` completo e compatível (schema v2). O botão não interpreta diretamente `direction.json` ou um array de operações.
4. No cartão de cada projeto, use **Abrir editor**, `Duplicar` (antes de ensaios arriscados), `Copiar instrução Codex` (gera a instrução com o contexto local), `Versões` (histórico/restauração), `Revisar Codex` (propostas pendentes), `Diagnóstico` (validações), `Produção` (checkpoints/exportações) ou `Arquivar`. Arquivar move o projeto para a área local `_archived`; **não é upload nem exclusão da mídia**. Antes de restaurar uma versão, leia o que será substituído.
5. O comando visual `Migrar projeto antigo` existe para migração de projetos legados. Faça backup/duplique o projeto antes de migrar. Use **Atualizar** para reler a lista se o Codex criou um projeto no disco.

**Onde estão os dados:** os projetos e as mídias ficam no Windows, fora do repositório. O dashboard informa a pasta e oferece **Copiar pasta de projetos**. Projetos inválidos são sinalizados em vez de apagados silenciosamente. Ao usar o Codex, forneça permissão local somente ao diretório necessário.

#### B. Editor: trabalhar com cenas, planos e camadas

1. Entre por **Abrir editor**. No topo, `Desfazer` e `Refazer` ajudam nas edições recentes da sessão; **não são substitutos** dos snapshots de `Versões`. `Exportar JSON` baixa uma cópia do **projeto inteiro** e `Exportar MP4` renderiza o vídeo, não o JSON.
2. Na **Biblioteca de Cenas**, selecione um cartão para posicionar a prévia, use **Adicionar cena** ou **Adicionar plano na cena**. Nas propriedades da cena, edite tipo (`title`, `stat`, `quote`), título, chamada, subtítulo, cores, duração, imagem de fundo e notas de produção. Os botões para mover/remover cena respeitam bloqueios de sincronização descritos na seção 13.
3. Use a **Visualização por planos** para editar `shots[]`. Alternar para **Visualização antiga de cartões** oculta os planos na prévia, mas não apaga `shots[]`; volte ao modo de planos quando necessário. A prévia é o Remotion Player local a 1920×1080 e 30 FPS.
4. Selecione um plano na timeline: o inspetor ajusta início/duração, título, visual gráfico ou mídia importada, corte inicial de vídeo, cores, estilo investigativo e animação do plano inteiro. Os atalhos visuais **Zoom suave**, **Panorâmica**, **Fade-in** e **Sem movimento** alteram as curvas do plano; quadros-chave permitem personalizar posição, escala, rotação e opacidade.
5. Abra **50 COMPOSIÇÕES · GALERIA** para escolher um `presetId`. Depois personalize em **OBJETOS E CAMADAS**: adicionar, selecionar, duplicar, excluir e configurar elementos; escolha tipo, texto, personagem/expressão, objeto, cenário, gráfico, coordenadas, tamanho, cor, comportamento e keyframes. Na **TIMELINE DE ELEMENTOS**, confira o intervalo de cada layer dentro do plano e sua relação com legendas. Há limite de **48 camadas por plano**. Aplicar outra composição pode substituir a montagem anterior do plano: duplique/salve antes.
6. Para vincular a entrada de uma camada à fala, em **Sincronizar entrada com legenda** selecione uma legenda existente. Essa ligação usa o tempo cadastrado no SRT/JSON, **não** transcrição automática.

#### C. Biblioteca e timeline multitrilha: mídia e volume

1. Clique `Importar mídia` e escolha imagens, vídeos ou áudios autorizados. Arquivos suportados na seleção da v0.14 incluem PNG/JPEG/WebP, MP4/WebM/MOV e MP3/WAV/M4A/OGG. A importação depende do serviço local; confira o resultado na biblioteca.
2. Para uma mídia visual, escolha **+ Visual**; para áudio, escolha **+ Narração**, **+ Música** ou **+ Efeito**. A **TIMELINE MULTITRILHA** exibe separadamente cenas, visual, narração, música, efeitos e legendas.
3. Clique em um clipe para ajustar **trilha, início, duração e corte inicial** nas propriedades. O corte inicial não aparece para imagem estática. Para áudio, ajuste volume entre 0 e 100%.
4. No editor de volume, experimente `Fade in`, `Fade out` ou `Sem fade`. O botão `Quadro-chave de volume` cria pontos com frame, valor e curva (`linear`, `ease-in`, `ease-out` ou `ease-in-out`); o máximo é **40 keyframes de volume por clipe**. Ouça o resultado: fades e efeitos visuais não garantem mixagem correta.
5. O editor não oferece waveform completo nem alinhamento fonético automático. Os tempos são baseados em **frames absolutos** para clipes e legendas; os keyframes de volume são relativos ao clipe. Não arraste a narração para corrigir uma proposta visual sem conferir a sincronização.

#### D. Legendas: importar, editar e exportar SRT

1. Na biblioteca, use `Importar SRT` para carregar um arquivo com timestamps reais. Se já houver legendas, o editor pede confirmação antes de substituí-las; revise o texto e o sincronismo na trilha **LEGENDAS**.
2. Clique em uma legenda na trilha para abrir o inspetor e ajustar texto/tempos. A edição pode invalidar `words[]` para não manter uma palavra ativa no instante errado. O destaque por palavra só funciona com alinhamento previamente obtido de um áudio real (seção 11.6).
3. Use `Exportar SRT` para salvar o texto cronometrado. Exportar SRT não exporta áudio e não gera timestamps novos por reconhecimento de fala.

#### E. Revisão final sem perder trabalho

1. Se o Codex criou uma proposta, volte ao dashboard e abra `Revisar Codex`. Compare-a com o projeto salvo antes de aceitar; alterações não aprovadas **não** aparecem como planos definitivos no editor.
2. Use `Diagnóstico` e `Produção` para conferir fontes, mídia ausente, checkpoints e status de exportação. Se o Codex gravou dados diretamente na pasta, a tela pode oferecer `Recarregar projeto do disco`; confirme de qual versão está carregando para não confundir alterações locais com propostas.
3. Exporte primeiro `Exportar JSON` como cópia verificável do projeto quando fizer sentido e depois `Exportar MP4`. Aguarde o estado real do job e examine imagem, legendas e áudio do arquivo resultante. O teste de um clipe curto não valida automaticamente um episódio longo.
4. Para direção declarativa reproduzível e auditoria, continue seguindo o fluxo **`info` → `direct` → `Revisar Codex` → `direction-report`/`doctor` → exportação**. O editor não tem chat de IA embutido nem botão para aplicar diretamente `direction.json`.

### 14.8 Motion Engine v0.15 — primeira etapa autoral por JSON

**Núcleo implementado:** tipografia configurável, grupos aninhados, efeitos visuais controlados por números, caminhos vetoriais livres, trajetórias de câmera e transições 2D. Tudo passa pelo schema Zod, aparece no editor, e é desenhado pelo mesmo Remotion usado na prévia e no MP4. Consulte a [especificação e limitações da v0.15](MOTION_ENGINE_015.md) e o [exemplo completo de direção de 12 segundos](examples/MOTION_ENGINE_015.direction.example.json).

**Novo vocabulário dos layers:** tipos `group` e `vector` (além dos dez originais); comportamento `word-reveal` para entrada por palavra (além dos 19 existentes). Cada layer aceita `parentId` de um grupo salvo. Na **direção enviada pela IA**, use `key` no grupo e `parentKey` nos filhos; o compilador cria os IDs, resolve vínculos e rejeita ciclos e pais inválidos. Coordenadas/tempo dos filhos são relativos ao grupo. Os grupos, assim como qualquer elemento, podem receber `motion`. Máximo de 48 layers por plano, incluindo grupos.

**Tipografia:** `fontFamily` (nome de fonte instalada no Windows), `fontWeight` (100–900), `textAlign` (`left`, `center`, `right`), `letterSpacing` (-15…60), `lineHeight` (0.75…2.5), `strokeColor` (hex), `strokeWidth` (0…12). A família de fonte é aplicada com fallback para Arial, não há upload nem empacotamento de fontes neste incremento. `behavior:"word-reveal"` anima cada palavra sem tentar alinhar a narração. Para SVG autoral use `kind:"vector"` com `vectorPath` contendo apenas comandos de caminho válidos; nenhum HTML/JS é executado.

**Efeitos por layer:** `effects.blur` (0…40), `radius` (0…300), `shadowBlur` (0…80), `shadowX` e `shadowY` (-100…100), `shadowColor`, `gradient` com `from`, `to` e `angle` (0…360); `mask` (`none`, `circle` ou `ellipse`). Gradientes se aplicam a texto, forma e caminho vetorial. Grupo pode aplicar transformação e efeitos a todos seus filhos.

**Câmera e transição:** cada `beat` do `direction.json` agora aceita `cameraPath` (até 24 objetos `{frame,x,y,zoom,rotation,easing}`) e `transitionIn` (`{type,durationFrames}`). `cameraPath` usa X de -1920 a 1920 px, Y de -1080 a 1080 px, zoom 0.5–4 e rotação -45° a 45°, frames em ordem estrita. `transitionIn.type` pode ser `cut`, `fade`, `slide-left` ou `wipe`, duração de 1–90 frames, respeitando o tempo do plano. Para planos contíguos, a transição revela os últimos frames do plano anterior. Ambos também podem ser editados no inspetor. Não alteram clipes de voz, legendas nem evidências.

**Fluxo para IA:** confira duração total com `npm run project -- info UUID`, gere o `direction.json` em um único arquivo usando grupos com chaves simbólicas, depois execute `npm run project -- direct UUID CAMINHO_JSON REVISAO`; clique **Revisar Codex** para aprovar. **Ainda não existe botão Importar direction.json diretamente** no editor: `Importar JSON` continua sendo a importação de projeto completo. Para criar o vídeo pronto, arquivos de mídia e áudio externos ainda precisam estar na biblioteca local.

**Limites reais:** personagens articulados com poses detalhadas, tracking automático da câmera, fontes empacotadas, máscara vetorial arbitrária, física de mola, análise dos pixels rasterizados, B-roll licenciado automaticamente e pacote portátil `.darkstudio` **não estão implementados**. Não confunda a expansão do JSON com esses recursos futuros.

### 14.9 Motion Engine v0.16 — personagens, economia, B-roll, QA e arquivo único

Consulte a [especificação completa v0.16](MOTION_ENGINE_016.md), também obrigatória para a IA que prepara direção. **Os campos têm implementação no schema, render e controles do editor, não são nomes inventados.**

- **Personagem articulado:** `layers[].rig` aceita `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `head`, `eyeX`, `eyeY` e `smile`; `rigKeys` aceita até 40 poses `{frame,pose,easing}`, interpoladas em SVG entre frames. Ajustes por membro e poses estão no `LayerEditor`.
- **Gráficos econômicos:** `chartType` acrescenta `waterfall`, `cashflow` e `counter`. Use `chartStages` (até 12 etapas) para animar `values` por frame. Exigem `sourceEvidenceId` válido para qualquer número, com verificação humana; números ilustrativos sem fonte não podem fingir ser dados reais.
- **Direção de B-roll:** cada beat de `direction.json` ou shot aceita `mediaPlan:{query,intendedUse,licenseNote}` e `framing:{fit,focusX,focusY,zoom,trimStartFrames}`. Um beat com mídia real exige `assetId` que já exista no projeto. `assets[].rights` contém `status` (`unknown`/`cleared`/`restricted`), `sourceUrl`, `creator`, `licenseName`, `attribution` e `notes`. O app avisa licenças pendentes; **não baixa nem licencia mídia automaticamente**.
- **Revisão de frames renderizados:** botão **Revisar frames renderizados (QA)**, endpoint `POST /v1/qa/frames` e CLI `npm run project -- raster-qa UUID` renderizam amostras PNG localmente e analisam diferenças reais de pixels, variação luminosa e margens, combinadas a riscos de geometria. O método não executa OCR e não comprova ausência de cortes, sobreposição ou problemas editoriais.
- **Arquivo audiovisual único:** `.darkstudio` é ZIP com manifesto SHA-256, `project.json` e todos os arquivos cadastrados em `assets[]`, incluindo narração, música e efeitos; legendas, direitos e fontes ficam no JSON. Na interface use **Exportar .darkstudio** e **Importar JSON / .darkstudio**; na CLI use `pack UUID arquivo.darkstudio` e `unpack arquivo.darkstudio`. Arquivos recebem novos IDs na importação, para preservar mídias existentes. Limite 512 MB e 250 assets; fontes locais não são embutidas.

**Processo responsável:** direção da IA continua sendo **um único `direction.json`**, aplicada via Codex/CLI e revisão editorial. Para transportar **o projeto audiovisual inteiro com mídia**, use `.darkstudio`. Não confundir essas duas entregas.

### 14.10 Intelligent Production v0.17 — OCR local, ZIP64 e fontes autorizadas

- [Documentação completa da v0.17](INTELLIGENT_PRODUCTION_017.md).
- **Revisão de frames reais com OCR português offline:** usa até 96 PNGs em pontos-chave e até 24 com Tesseract.js por arquivo local do NPM; registra caixas de texto, confiança, tempo em segundos e recomendações. Detecta riscos, não certifica perfeição.
- **Projetos grandes `.darkstudio`:** novo ZIP64 versão 2 em streaming até 64 GiB / 12 mil mídias (16 GiB por arquivo), com validação de caminho, CRC no ZIP e SHA-256 no manifesto. Transferência retomável em blocos no dashboard; download com HTTP Range. Importador v1 anterior preservado.
- **Fontes incorporadas:** envie WOFF2/WOFF/TTF/OTF na biblioteca, selecione a família `DSFont-UUID` em Tipografia. Prévia e MP4 usam @font-face local; somente fontes `rights.redistributionAllowed: true` com `licenseName` preenchido entram no `.darkstudio`. Licenças comerciais sem redistribuição continuam locais e não são empacotadas.
- O fluxo da IA ainda produz `direction.json` para revisão, ou um `.darkstudio` completo para compartilhar todos os arquivos permitidos. Nenhum arquivo do computador é enviado para o GitHub.

### 14.11 AI Production Engine v0.18 — JSON cria vídeo com narração sem Codex

A importação direta do Dashboard aceita `format:"darkstudio-production",version:1` e `beats[]` com `plannedFrames`, `narration` e todo o vocabulário de camadas, rigs, gráficos, câmera e efeitos v0.17. A IA **não** envia UUIDs internos nem WAV; o aplicativo gera áudio real por Windows SAPI, mede as durações e monta os planos no mesmo renderizador de prévia/MP4. A voz é alterável e a timeline por trecho é ressincronizada no editor. B-roll opcional `broll:{query,description,purpose,provider,licenseNote}` gera **pedido pendente**, nunca download presumido. O editor oferece **Smart B-roll** com pesquisa via API oficial Pexels (chave exigida), candidatos com autor e duração, link de licença, download MP4 após aprovação humana e associação do vídeo ao plano preservando camadas. Veja [Guia v0.18](AI_PRODUCTION_018.md) e [JSON autoral exemplo](examples/PRODUCAO_018.example.json).

**Validação:** `POST /v1/productions/validate` devolve diagnósticos de estrutura. **Vozes:** `GET /v1/productions/voices`; `POST /v1/productions/import` importa após sintetizar; `POST /v1/productions/:id/regenerate` troca voz com revisão `If-Match`. As palavras individuais não têm alinhamento acústico preciso no SAPI: legendas medem trechos inteiros, não cada palavra.

O `direction.json` v1 e suas propostas Codex continuam disponíveis para quem quiser, assim como `project.json` v2 e os pacotes `.darkstudio`; **Codex e terminal deixam de ser obrigatórios no caminho principal**.

## 15. Referência completa dos comandos locais

Execute na **pasta do repositório**, em PowerShell/CMD. `UUID` deve ser substituído pelo ID real e `REV` pelo SHA-256 exibido em `info`. O usuário pode pedir que o Codex Local execute tudo; não precisa digitar.

| Comando `npm run project -- ...` | Função | Altera projeto? |
| --- | --- | --- |
| `path` | Mostrar pasta de projetos | Não |
| `list` | Listar projetos locais | Não |
| `create "Título"` | Criar projeto novo de demonstração (6 s inicial) | Cria um projeto |
| `info UUID` | Metadados, arquivo e **revisão** | Não |
| `show UUID` | Imprimir `project.json` completo | Não |
| `validate UUID` | Parse de projeto salvo | Não |
| `import arquivo.json` | Importar `project.json` completo como novo ID | Cria um projeto |
| `service-info` | Conferir versão/API/capacidades do serviço | Não |
| `presets [categoria]` | Listar 50 modelos/IDs e comportamentos | Não |
| `composition-example presetId destino.json` | Gerar blueprint de camadas | Cria arquivo auxiliar |
| `direction-template UUID destino.json` | Gerar rascunho heurístico da direção | Cria arquivo auxiliar |
| `direct UUID direcao.json REV` | Compilar direção e criar proposta | Só proposta |
| `auto-direct UUID REV` | Primeiro passe ilustrativo automático | Só proposta |
| `direction-report UUID` | Auditar **shots salvos** | Não |
| `preview UUID ops.json REV` | Prévia de operações | Não |
| `propose UUID ops.json REV` | Criar proposta de operações | Só proposta |
| `pending UUID` | Consultar propostas | Não |
| `accept UUID propostaUUID` | Aceitar proposta | **Sim**; prefira revisão humana no editor |
| `reject UUID propostaUUID` | Descartar proposta | Remove proposta, não projeto |
| `apply UUID ops.json REV` | Aplicar operações validadas | **Sim**, com backup |
| `replace UUID projeto.json REV` | Substituir projeto completo | **Sim**, risco maior |
| `doctor [UUID]` | Ambiente + diagnóstico do projeto | Não |
| `history UUID` | Listar snapshots anteriores | Não |
| `restore UUID SHA_SNAPSHOT REV_ATUAL` | Restaurar versão com backup | **Sim** |
| `production UUID status` | Ler estado de produção | Não |
| `production UUID checkpoint` | Salvar estado persistido | Salva checkpoint privado |
| `production UUID continue` | Preparar continuação ilustrativa, se possível | Pode criar proposta |
| `sfx list` | Listar efeitos procedurais | Não |
| `sfx TIPO UUID REV FRAME [VOLUME]` | Produzir WAV e propor SFX | Cria arquivo de mídia e proposta |
| `pilot` | Criar piloto audiovisual Windows de 30 s | Cria projeto/áudio local |
| `render UUID` | Exportar projeto salvo para MP4 | Cria vídeo/job local |

Comandos npm adicionais fora de `project`:

| Comando | Objetivo |
| --- | --- |
| `npm run preview:frames -- UUID 0,75,150` | PNGs de baixa resolução em cache |
| `npm run check` | TypeScript frontend + agente |
| `npm test` | Vitest |
| `npm run build` | Build do frontend |
| `npm run smoke:service` | Teste do contrato e rotas locais |
| `npm run smoke:render` | Render técnico curto |
| `npm run smoke:pilot` | Render teste narrado |
| `npm run smoke:motion` | Render de seis famílias de composições |
| `npm run dev:service` | Serviço Node local |
| `npm run dev:desktop` | Editor Tauri |

Para operação cotidiana use os **BATs** da raiz. Evite executar `accept` ou `replace` sem o usuário ter revisado e autorizado o efeito dessas operações.

## 16. Exemplo completo de episódio e direção criativa

### 16.1 Caso didático de 12 segundos

Arquivo **versionado e testado**: [`docs/examples/GUIA_DIRECAO_12S.example.json`](examples/GUIA_DIRECAO_12S.example.json). Ele contém `version:1`, título, marca e quatro beats de durações **120 + 120 + 60 + 60 = 360 frames**, com presets e uma cena de personagem criada **diretamente em `layers[]`**.

**Premissa importante:** esse arquivo só pode ser executado sem alterações contra um **projeto-base de 360 frames**. Não é seguro executá-lo no seu documentário de quatro minutos: o compilador deve recusar, preservando áudio e conteúdo. Os testes montam um projeto **fictício isolado**, sem projetos, mídias ou dados de usuário.

### 16.2 Projeto de exemplo tem de ter cenas com 360 frames

Para experimentar em uma **cópia/projeto novo**, peça ao Codex:

1. Crie projeto novo com `npm run project -- create "Laboratório JSON 12s"`; receba UUID e revisão.
2. Edite a duração da **cena-base** de 180 para **360 frames** usando `updateScene` no projeto novo e uma operação proposta. Confirme `info` após aprovação. Se a cena já possuir áudio/captions/shots, **não** altere sua duração sem planejar os efeitos.
3. Confira que `scenes[].durationFrames` soma **exatamente 360**.
4. Use `direct` com [o arquivo de exemplo](examples/GUIA_DIRECAO_12S.example.json) e a revisão atual.
5. Abra **Revisar Codex**, inspecione a prévia, **aprove apenas se a direção fizer sentido** e exporte um curto MP4. Um arquivo de 12 s sem narração será somente ensaio **visual**.

**Não transforme este procedimento em alterações do episódio real sem autorização.**

### 16.3 Transformar um roteiro verdadeiro em 5 etapas de direção

Exemplo de vídeo educativo sobre moradia — **sem estatísticas presumidas**:

| Trecho | Intenção | Plano sugerido | Por quê |
| --- | --- | --- | --- |
| Gancho: sonho de casa | `hook` | `person-worker` + texto original | Humaniza a pergunta |
| Renda e despesas | `context` | `person-family` / `data-budget` | Mostra a decisão doméstica |
| Entrada e financiamento | `contrast` | `data-salary-home` + `world-bank` | Compara condições |
| Dados de preços/juros | `data` | `data-trend` / `data-bars` | Só com fonte, ano e unidade |
| Construção e oferta | `context` | `world-building` / `story-causality` | Explica fatores e limitações |
| Alternativas | `conclusion` | `explain-flowchart` / `youtube-chapter` | Mostra caminhos sem prometer solução universal |

**Isto é um plano editorial, não JSON final.** O JSON deve ter beats de durações precisas de acordo com WAV/cenas reais, fontes registradas, e imagens/licenças verificadas. A IA deve usar **cenas originais** em pontos de virada, em vez de se apoiar somente nas receitas.

### 16.4 Padrões de direção para um vídeo que não pareça repetitivo

Não há pontuação mágica de qualidade, mas uma IA deve conferir:

- **Variedade funcional:** personagens, diagramas, documentos, imagens autorizadas e respiros quando a narrativa pedir.
- **Progressão:** o estado visual muda para acrescentar significado, não só trocar de layout.
- **Consistência:** kit de cor, tipos de letra, contraste e assinaturas repetidos intencionalmente.
- **Ritmo adequado à voz:** um documento para ler pode durar mais que um símbolo simples.
- **Humildade editorial:** limite das provas explicitado, visual sintético marcado como ilustração.
- **Leitura em celular:** textos curtos, contraste e espaço das legendas.
- **Audio primeiro:** cortes sincronizados com frases e pausas, sem inventar timestamps de palavras.
- **QA real:** amostras de frames, voz, legendas, MP4 longo, além de validar JSON.

## 17. Checklist, erros comuns e soluções

### 17.1 Checklist de aceite para uma direção profissional

- [ ] A IA leu este guia, schemas atuais e `npm run project -- presets` **antes** de escrever a direção.
- [ ] Já existem projeto, roteiro, áudio (quando exigido) e duração final?
- [ ] `project.json` válido e `service-info` compatível?
- [ ] Não há proposta pendente que seria duplicada?
- [ ] Todos os beats cobrem exatamente o projeto, sem buracos, na ordem correta?
- [ ] `presetId` usa **ID real** do catálogo; `style` usa valor realmente aceito?
- [ ] Cada `layer` tem `name/kind/x/y/width/height`; nenhum JS executável?
- [ ] Frames de layer e keyframes cabem dentro dos intervalos?
- [ ] Imagens/vídeos vêm da biblioteca local; sem URLs temporárias?
- [ ] Valores factuais e documentos têm fontes cadastradas, recortes e revisão humana?
- [ ] Cenas reconstruídas/ilustrativas não aparecem como evidência real?
- [ ] O plano respeita identidade, legibilidade, margens e área de legendas?
- [ ] O Codex criou **proposta revisável**, em vez de fazer `replace` direto?
- [ ] O usuário examinou/decidiu a proposta pelo painel?
- [ ] `doctor`, `direction-report` e prévia em frames não mostram bloqueadores?
- [ ] Narração, música, SFX, legendas e reprodução integral foram ouvidos?
- [ ] MP4 final exportado foi assistido, com créditos/licenças corretos?
- [ ] Nenhum projeto real/mídia foi enviado ao GitHub?

### 17.2 Sintomas e correções

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `direction` não cobre o episódio | Soma de beats ≠ soma de `scenes[].durationFrames` | Leia `show UUID`, calcule frames e corrija **beats**; não altere narração escondido |
| `Intervalos visuais devem ser contínuos` | `startFrame` diferente do cursor esperado | Próximo início = início anterior + duração anterior |
| `Composição não encontrada` | `presetId` inexistente ou digitado errado | Execute `npm run project -- presets` |
| `Unrecognized key` / schema inválido | Campo inexistente na API v0.16 | Consulte schema de `direction`, `layers` ou `project`; não invente |
| `Imagem/mídia não importada` | `assetId` errado/URL externa | Importe mídia local, descubra UUID e recoloque |
| `Fonte inexistente` | `sourceEvidenceId` não existe em `evidence[]` | Cadastre origem legítima, mantenha `pending` e confirme ID |
| `Gráfico sem valores` | Receita de gráfico sem `data` | Use placeholder **ilustrativo** ou dados com origem verificável |
| `0 planos no relatório` | O projeto está em `legacy` ou proposta pendente | Veja `pending UUID`; não recrie a proposta |
| `422` ou `404` com `/health ready` | Serviço antigo da porta 4317 | `service-info`, feche serviço antigo conhecido e abra BAT atualizado |
| `Conflito: revisão mudou` | `REV` SHA obsoleto | Execute `info UUID` de novo; refaça a proposta sobre a revisão atual |
| `Proposta obsoleta` | Projeto foi alterado depois da criação | Revise, descarte/recrie com conteúdo certo; não dê reset |
| `texto cortado/baixo contraste` | Caixa pequena, fonte grande ou camadas sobrepostas | Aumente caixa, afaste bordas, troque cor; inspecione PNG/MP4 |
| `Palavras destacadas fora de tempo` | `captions.words[]` inventado ou desatualizado | Remova `words` ou realinhe usando WAV real |
| Serviço exporta vídeo, mas ele não tem locução | `clips[]` sem lane `narration` | Importe voz e verifique `doctor`; não confunda cobertura visual com áudio |
| Render interrompido | Processo/serviço foi fechado | Confira `production status`; exportação não recomeça do mesmo frame |
| Atualizador BAT bloqueado | Arquivos versionados alterados, commits divergentes ou colisão de nome com arquivo novo | Preserve o trabalho do Codex ou os dados locais; concilie antes de atualizar. Arquivos extras sem colisão não bloqueiam mais |
| O Codex ignorou 50 modelos | Não consultou o catálogo e recebeu prompt genérico | Exija `presets`, storyboard justificando escolhas, inspeção visual e proposta revisável |

### 17.3 Separar problemas de produto e problemas de direção

Se o vídeo parece estático, verifique primeiro se a **proposta aprovada** contém camadas reais (`shots[].layers[]`) ou somente estilos antigos. Se há camadas, avalie se o `behavior` funciona naquele `kind` e se o intervalo de tempo permite vê-lo. Se tudo é tecnicamente válido mas a história não funciona, o gargalo é **direção criativa**, não compilação. Se o JSON falha schema, o gargalo é **contrato técnico**. Não resolva um problema editorial inventando comandos ou apagando projeto.

## 18. O que ainda NÃO está implementado

| Capacidade desejada | Estado real na v0.17 |
| --- | --- |
| Criar direção por JSON e presets/camadas novas | **Implementado**, via CLI/proposta |
| 50 receitas + 7 visuais investigativos | **Implementado** |
| Tipografia com família de fonte instalada, gradiente/contorno, palavra a palavra | **Implementado na v0.15**; fontes externas não são empacotadas |
| Grupos, máscaras simples, blur, sombras, vetores SVG de caminho | **Implementado na v0.15**; não é um motor de máscaras arbitrárias |
| Câmera por pontos (X/Y/zoom/rotação) e transições 2D | **Implementado na v0.15**; sem tracking automático de objetos |
| Personagens 2D, ícones, cenários e keyframes | **Implementado**, animação vetorial estilizada |
| Sync entrada de layer com legenda | **Implementado**, por `cueCaptionId` de bloco |
| Destaque opcional por palavra | **Implementado**, se receber alinhamento real externo |
| SRT + importação de mídia local + MP4 | **Implementado** |
| WAV TTS com vozes SAPI Windows | **Piloto local**, qualidade depende da voz |
| Nove efeitos sonoros procedurais | **Implementado**, biblioteca simples |
| QA de contraste e margens | **Raster real + geometria**, amostral e heurístico; não é OCR/perícia visual |
| Personagens 2D com braços, pernas, cabeça, olhos e sorriso por pose/keyframes | **Implementado na v0.16**, sem lip-sync automático |
| Gráficos econômicos de fluxo, cascata, contador e valores interpolados | **Implementado na v0.16**; números exigem fonte |
| Direção de B-roll importado com enquadramento e cadastro de licença | **Implementado na v0.16**; busca/download/licença não são automáticos |
| Análise de pixels renderizados em amostras PNG | **Implementado na v0.16**, com alertas heurísticos e sem OCR |
| Pacote audiovisual único com mídia e JSON | **Implementado na v0.16** como ZIP .darkstudio, até 512 MB |
| Ator fotorrealista e lip-sync de voz | **Não** |
| Pesquisa automática dentro do editor | **Não**; Codex/IA são externos |
| Gerador integrado de imagens e vídeos por IA | **Não** |
| Download/licenciamento automático de B-roll | **Não** |
| Mapa geográfico real/cartográfico | **Não**; modelo atual é esquemático |
| Alinhador fonético/ASR por palavra embutido | **Não** |
| Waveform completo/scrubbing de áudio por palavra | **Não** |
| Parallax fotográfico com profundidade calculada | **Não** |
| Efeitos de transição 3D, máscara livre e composição física | **Não** |
| Proxy 4K, render incremental/retomável por frame | **Não** |
| Thumbnail/editor de publicação/YouTube upload | **Não** |
| Validação automática da veracidade dos dados | **Não**; pessoa revisa |
| Editor com botão “Importar direction.json” diretamente | **Não**: use `npm run project -- direct` |
| Render de 5–30 min garantido no computador do usuário | **Não comprovado**; testes de CI são menores |

Uma funcionalidade futura não deve aparecer aqui como implementada **antes** de ter schema, UI/CLI, preview, render e testes que sustentem a afirmação.

## 19. Como atualizar este guia nas próximas versões

**Este guia é uma referência de trabalho do produto, não uma fotografia imutável da v0.16.** Ele permanece em `docs/GUIA_DIRETOR_POR_JSON.md` e deve ser a primeira leitura de qualquer IA diretora. O processo abaixo deve ser seguido **na mesma alteração de código que introduzir a capacidade**.

### 19.1 Contrato de manutenção

1. **Se mudar Zod/JSON:** atualize os campos, limites, defaults e exemplos neste guia. Verifique `project.ts`, `direction.ts`, `shots.ts`, `layers.ts` e `operations.ts`.
2. **Se acrescentar um preset:** atualize `src/model/presets.ts`, tabela da seção 6, quantidade por biblioteca e `npm run project -- presets`. Teste criação/render e estilos disponíveis.
3. **Se acrescentar personagem, objeto, cenário, comportamento, easing:** atualize seções 7–9 e o teste do guia. Não marque como disponível só porque o nome consta no enum: confirme que **desenha e anima de verdade**.
4. **Se acrescentar voz, áudio, SFX, mídia, legenda ou render:** atualize seções 11–14 e 18, comandos e caminhos. Destaque permissões/licenças e limites de hardware.
5. **Se mudar CLI, API ou proposta:** atualize seções 1, 13–15, 17, `AGENTS.md`, `README.md` e documentação da versão.
6. **Teste o exemplo canônico** [`GUIA_DIRECAO_12S.example.json`](examples/GUIA_DIRECAO_12S.example.json) compilando contra projeto sintético de 360 frames. Verifique `coveragePercent=100`, ausência de alteração em áudio, legenda e fontes. Teste [`GUIA_OPERACOES.example.json`](examples/GUIA_OPERACOES.example.json) com `applyOperations` no fixture autorizado.
7. **Rode** `npm run check`, `npm test` e `npm run build`. Para novo render visual execute `npm run smoke:motion`/`smoke:pilot` conforme plataforma; para alteração de serviço execute `smoke:service`.
8. **Atualize** cabeçalho de versão, tabela do estado real e histórico abaixo. Caso haja capacidade ainda parcial, marque como **parcial/experimental**, nunca como concluída.
9. Faça commit **somente de código/documentação na `main`**, preservando dados/mídias/projetos locais. Não reescreva histórico nem use `reset --hard` em clone que contenha trabalho do Codex.

### 19.2 Histórico de manutenção

| Versão do Dark Studio | Estado do guia | Mudanças cobertas |
| --- | --- | --- |
| **0.12** | Retrospectivo | `direction.json`, 7 estilos investigativos, fontes, revisão e `direct` |
| **0.13** | Retrospectivo | Serviço versionado, propostas visíveis, checkpoints, estados de render |
| **0.14** | **Guia revisado e ampliado** | 50 presets, cenas por layers, personagens, objetos, animações, SFX, palavras destacadas e tutorial completo da interface (dashboard, edição, áudio, legendas e exportação) |
| **0.15+** | **A atualizar junto com o código** | Nunca presumir capacidades futuras antes de implementação/testes |

### 19.3 Teste de documentação ligado ao código

O arquivo [`src/model/director-json-guide.test.ts`](../src/model/director-json-guide.test.ts) testa automaticamente o exemplo canônico, a cobertura dos IDs/enums existentes e os controles essenciais de dashboard/editor documentados nesta seção 14.7. **O teste alerta quando o catálogo cresce sem o guia acompanhar**; ele **não reescreve automaticamente** documentação, nem comprova qualidade audiovisual. Atualize guia + exemplo + teste no mesmo commit. Se um enum mudar, atualize o teste para comparar com a fonte real em vez de enfraquecer a validação para “sempre verde”.

### 19.4 Leituras complementares mantidas no repositório

- [Direção pelo Codex](CODEX_DIRECTOR.md) — prompts e conduta editorial;
- [Estúdio de animação v0.14](ANIMATION_STUDIO.md) — motor de camadas e exemplos;
- [Bíblia visual](VISUAL_IDENTITY.md) — estética, ritmo e documentos;
- [Arquitetura](VIDEO_ARCHITECTURE.md) — origem e evolução da montagem;
- [Fluxo Codex](../CODEX_WORKFLOW.md) — integração operacional com Windows;
- [Roadmap](../ROADMAP.md) — pendências reais e testes;
- [Exemplo investigativo](INVESTIGATION_BRIEF.example.json) — direção baseada em fonte;
- [Storyboard de seis bibliotecas](MOTION_STORYBOARD.example.json) — receitas iniciais.

**Quando estas páginas discordarem:** o **schema/testes do código atual** decide o que o editor realmente aceita; atualize a documentação conflitante. Não copie comandos antigos sem conferir `scripts/project-tool.ts`.

## 20. Prompt pronto para qualquer IA diretora

Copie o texto abaixo na IA de sua escolha. Para que ela execute a CLI e alcance projetos reais, use **Codex ChatGPT Desktop em modo Local** com autorização de arquivos; outras IAs podem produzir apenas o JSON, deixando a operação para o Codex ou para você.

> **MISSÃO — VOCÊ É O DIRETOR CRIATIVO POR JSON DO DARK STUDIO.**
>
> Leia **`docs/GUIA_DIRETOR_POR_JSON.md`** integralmente antes de começar. Consulte os schemas `src/model/direction.ts`, `src/model/layers.ts` e `src/model/project.ts` e a lista atual de modelos com `npm run project -- presets`. Não invente IDs, campos ou recursos que o editor não suporta.
>
> Trabalhe sobre o projeto local indicado por mim; não crie ou substitua outro projeto sem autorização. Leia duração total em frames, cenas, narração, legendas, fontes, mídias e propostas pendentes. Se já existe uma proposta de montagem, verifique-a antes de gerar outra.
>
> Primeiro **entenda o roteiro**, divida a narrativa em atos e desenhe um storyboard para cada trecho, com propósito visual explícito. Varie com critério entre personagens, cenários, gráficos, vídeos autorizados, documentação, comparações e composições explicativas. Não escolha templates aleatoriamente; crie `layers[]` originais quando forem superiores aos presets. Use os 50 modelos disponíveis apenas quando acrescentarem clareza ou ritmo.
>
> Entregue **um `direction.json` schema v1**, com `beats[]` contínuos, início/duração exatos, `purpose`, `motionPreset`, `presetId` ou `layers[]`, cores coerentes e fontes vinculadas quando houver dados factuais. Cores devem ser `#RRGGBB`, camadas têm geometria 1920×1080 e cada beat deve terminar na duração real do episódio. Nunca edite narração/legendas silenciosamente para fazer a soma dos frames fechar.
>
> Use `project.evidence[]` para conectar alegações a documentos e estatísticas com ano/região/unidade. Não invente números, manchetes, mapas, fatos, licenças ou pessoas reais. Marque reconstruções e ilustrações. Fontes permanecem pendentes até revisão humana.
>
> **Se houver acesso local autorizado**, compile com `npm run project -- direct UUID caminho.json REVISAO`, criando **uma proposta para Revisar Codex**, sem `accept` automático. Relate a contagem de planos, diversidade dos estilos, fontes pendentes, cobertura, avisos e exemplos de cenas autorais. Gere uma prévia de quadros ou MP4 curto quando possível; examine o vídeo e ouça a narração, corrigindo erros reais. Ao final, informe o que eu ainda devo revisar e **não declare o episódio exportado se só houver um teste parcial**.
>
> Se você **não tiver acesso ao Windows**, entregue o JSON compatível e uma lista exata dos comandos que o Codex Local deverá executar. Não finja ter compilado, renderizado ou aprovado o projeto.

---

**Lembrete final:** o arquivo JSON é uma **linguagem de direção**, não um atestado de qualidade. O Dark Studio fornece o motor, a IA faz escolhas criativas, e uma pessoa confere veracidade, direitos, áudio e resultado final. Esse é o contrato que permite evoluir o produto sem perder controle sobre cada episódio.
