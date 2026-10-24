# Dark Studio v0.14 — Estúdio de animação controlado pelo Codex

> **Documento principal para IA diretora:** [Guia Diretor por JSON](GUIA_DIRETOR_POR_JSON.md). O guia é atualizado conforme o editor evolui; esta página aprofunda o motor Motion Studio v0.14.

## O que existe AGORA

O Dark Studio continua um editor Tauri/React + Remotion, com os projetos e áudios 100% no computador do usuário. A v0.14 acrescenta uma camada de motion design sobre os planos em \`shots[]\`. A versão de projeto continua \`2\` (novas propriedades têm defaults), mantendo documentários anteriores no modo \`legacy\` ou \`shots\` sem reconstrução destrutiva.

**50 composições editoriais registradas** em \`src/model/presets.ts\`, organizadas em:
- 10 personagens: trabalho, família, banco, construção, professor, ciência, jornalismo, estudante, multidão, diálogo;
- 8 ambientes: cidade, apartamento, banco, escritório, supermercado, obra, rua, estúdio;
- 10 economia/dados: barras, tendência, ranking, donut, orçamento, salário/casa, financiamento, juros, preços e métrica;
- 8 narrativa: mural, antes/depois, cronologia, manchete, pasta, causalidade, linha do tempo e redes;
- 8 educação: fluxo, ciclo, corte de objeto, camadas, lupa, engrenagens, partículas e escalas;
- 6 YouTube: abertura, identificação, citação, capítulo, CTA e créditos.

Cada composição é uma receita distinta com elementos vetoriais, tempos, geometrias, objetos e comportamentos próprios. Elas compartilham primitives testadas (não são 50 filmes achatados). **São exemplos estilizados**, não fotogramas reais, animação 3D ou atores digitais fotorrealistas.

## Sete motores reutilizáveis

1. **Personagem 2D articulado** (\`Character2D\`): tronco, rosto e membros; gestos deterministicamente calculados a 30 FPS; personagens fictícios, sem identidade real.
2. **Câmera e profundidade 2D**: keyframes de plano inteiro e de objeto; cena de fundo e camadas movem-se independentemente, com pan/float/parallax estilizado. Ainda não é câmera 3D calibrada nem parallax real a partir de fotografia.
3. **Tipografia cinética**: texto por letra, revelação, contador somente com valor ligado a fonte quando for gráfico factual.
4. **Objetos SVG**: 23 objetos editoriais (casa, chave, banco, carro, relógio, etc.), combináveis sem mídia externa.
5. **Scene graph**: cada plano tem \`layers[]\` (0–48) com tipo, início/duração, geometria em pixels, zIndex, cor, imagem local opcional e quadros-chave x/y/scale/rotation/opacity.
6. **Sincronização por legenda**: \`cueCaptionId\` e \`cueOffsetFrames\` vinculam a entrada de um objeto ao timestamp de um bloco de legenda real. **Não** produz alinhamento fonético por palavra nem reconhecimento de áudio automático.
7. **Animação procedural**: \`float\`, \`pulse\`, \`walk\`, \`wave\`, \`point\`, \`nod\`, \`think\`, \`celebrate\`, \`orbit\`, \`shake\`, \`parallax\`, \`draw\`, \`typewriter\`, \`count\`, \`grow\`, \`stagger\`, \`slide-in\`, \`bounce\`, com intensidade ajustável.

A mesma composição \`Documentary\` é usada no Remotion Player do desktop e no render MP4. Dados/elementos externos só são permitidos por referência \`assetId\` importada localmente; nenhum código React/JS gerado pelo Codex é executado como template.

## Codex pode criar uma composição número 51

O Codex pode incluir um \`presetId\` em qualquer beat de \`direction.json\`, ou construir \`layers[]\` com geometria e ações próprias. A propriedade \`layers[]\` tem precedência sobre \`presetId\` na compilação para permitir personalização. Não é necessário criar arquivo TSX novo para cada visual.

\`\`\`json
{
  "version": 1,
  "title": "A vida fica mais cara",
  "beats": [
    {
      "startFrame": 0,
      "durationFrames": 120,
      "purpose": "context",
      "title": "O sonho da casa própria",
      "presetId": "person-worker",
      "motionPreset": "subtle-zoom"
    },
    {
      "startFrame": 120,
      "durationFrames": 120,
      "purpose": "context",
      "title": "Como o orçamento encolhe",
      "layers": [
        {
          "kind": "character", "name": "Pessoa que trabalha",
          "x": 130, "y": 320, "width": 360, "height": 630,
          "characterType": "worker", "expression": "thinking", "behavior": "nod"
        },
        {
          "kind": "object", "name": "Apartamento desejado",
          "x": 1050, "y": 400, "width": 360, "height": 360,
          "objectType": "home", "behavior": "pulse", "color": "#F0BB66"
        },
        {
          "kind": "text", "name": "Pergunta da narração",
          "x": 510, "y": 130, "width": 1180, "height": 180,
          "text": "E A ENTRADA?", "fontSize": 115, "behavior": "typewriter"
        }
      ]
    }
  ]
}
\`\`\`

**Atenção:** esse JSON é trecho conceitual. Os beats de um episódio real devem cobrir exatamente toda a duração em frames; se o projeto durar mais que 8s, faltam beats. IDs são gerados automaticamente pelo compilador. \`layers[].durationFrames\` pode ser omitido (utiliza o tempo restante do plano). \`cueCaptionId\` precisa apontar para uma legenda existente do mesmo plano.

Para descobrir IDs, descrições, categorias, animações e modelos:
\`\`\`powershell
npm run project -- presets
npm run project -- presets Personagens
npm run project -- composition-example person-family "$env:TEMP\dark-family.json"
npm run project -- direction-template UUID "$env:TEMP\direcao.json"
npm run project -- direct UUID "$env:TEMP\direcao.json" REVISAO_SHA
\`\`\`

Esses comandos devem ser executados pelo próprio **Codex Local** no Windows (não pelo usuário). O último apenas prepara uma proposta pendente; o usuário aprova pelo botão **Revisar Codex** no Dark Studio. O comando \`auto-direct\` alterna modelos ilustrativos mas não pesquisa, não verifica fontes e não cria vozes do nada.

## Timeline e inspetor

- **Galeria 50 composições:** filtrar por categoria/pesquisa e aplicar num plano já existente; pede confirmação antes de substituir as camadas.
- **Objetos e camadas:** lista com seleção, posição, tamanho, cor, gesto/expressão, texto, números com fonte vinculada, inserção, exclusão e duplicação.
- **Timeline de elementos:** mover/cortar blocos em frames relativos ao plano (arraste, alças, Shift para snap de 15 frames).
- **Keyframes:** x, y, scale, rotation e opacity por elemento; curvas linear/ease-in/ease-out/ease-in-out. Arrastar limites do plano retima keyframes do plano e das camadas.
- **Sincronização:** associar uma camada a uma legenda importada; altera automaticamente o início visual quando a legenda muda, sem deslocar a narração.
- **Limites:** 48 elementos/plano, 40 keyframes por propriedade. O editor precisa de testes reais para projetos com centenas de planos; a CI não mede UX da timeline no PC do usuário.

## Testes automáticos e desempenho

- \`npm run check && npm test && npm run build\`
- \`npm run smoke:motion\` (Windows): render de 12 segundos com um exemplar das seis categorias, inspeção por hashes de PNG, H.264 real a 640×360.
- \`npm run smoke:pilot\` (Windows): narração SAPI local, legendas, plano investigativo e MP4 de 30s, no renderizador antigo e novo compartilhado.
- \`npm run preview:frames -- UUID 0,75,150,225\`: cria PNGs de baixa resolução com cache por SHA do projeto em \`%USERPROFILE%\DarkStudio\previews\<UUID>\<REVISAO>\`. Renderiza só os frames que faltarem. Serviço local precisa estar atualizado.
- Os testes não provam fluidez interativa, mixagem de um episódio longo ou uso de memória no Ryzen 5 4600G/16 GB/RX 7600.

## Segurança e limitações

- **Fatos e direitos:** personagens e cenas procedurais são ilustrações. Gráficos com valores exigem \`sourceEvidenceId\` cadastrado; evidência cadastrada não equivale a verificada. Uso de imagem/vídeo real requer licença e importação local.
- **Não implementado nesta fase:** IA de geração de fotos/vídeos integrada, busca/licenciamento de B-roll, personagens realistas com atuação facial, lip-sync fonético, captura automática de voz por palavra, mapa cartográfico, thumbnail completa, proxy 4K ou retomada de render pelo frame exato. Esses elementos precisam de etapas e validação próprias.
- **GitHub só armazena código-fonte.** Projetos, WAV, mídia, prévias e MP4 permanecem em \`%USERPROFILE%\DarkStudio\`.
- **Evite \`reset --hard\` e \`clean\`** quando o Codex já tiver modificado o clone local: preserve qualquer commit local antes de atualizar \`main\`.

Leia \`docs/CODEX_DIRECTOR.md\` e \`docs/VISUAL_IDENTITY.md\` para regras editoriais e atribuição.


## Sonoplastia simples, gerada localmente

A v0.14 também oferece **nove efeitos sintéticos** sem download de música ou gravações de terceiros: soft-whoosh, page-turn, document-click, ambient-pulse, positive-chime, keyboard-tap, transition-sweep, notification-soft e impact-low. São sons experimentais e discretos, não foley fotorrealista.

O Codex Local pode descobrir e propor um efeito à trilha \`sfx\` do episódio com:
\`\`\`powershell
npm run project -- sfx list
npm run project -- sfx soft-whoosh UUID-DO-PROJETO REVISAO-SHA 150 0.18
\`\`\`
O WAV é criado apenas em \`%USERPROFILE%\DarkStudio\media\`, adicionado à biblioteca e submetido como **proposta** (não é aplicado sem revisão). A duração é medida em frames e a trilha usa o mixer Remotion existente. A frequência/volume não fazem o áudio soar como produção profissional automaticamente: ouça e ajuste, e nunca preencha a trilha inteira com sons por padrão.


## Destaque de palavras durante a narração

Legendas podem opcionalmente conter \`words: [{text,startFrame,endFrame}]\`, com frames absolutos do projeto, não relativos à legenda. O renderizador destaca visualmente a palavra ativa; quando não há timings reais, mantém a legenda normal. O schema rejeita palavras fora dos limites ou sobrepostas. Se o usuário editar o texto/tempo da legenda, o editor limpa \`words[]\` para não manter dados de alinhamento incorretos.

A v0.14 **não tem transcrição forçada embutida**. O Codex precisa produzir timestamps de um alinhador local apropriado com áudio real, testá-los e usar as operações de legenda existentes. Não insira tempos simulados fingindo sincronismo fonético.


## QA visual e carregamento eficiente

O \`src/model/visual-qa.ts\` calcula contraste aproximado entre cor de texto e fundo do plano, alerta para títulos que podem exceder a caixa e elementos próximos da borda/sobreposição de legendas. Esses avisos entram no \`direction-report\` e na revisão visual do Codex. **São heurísticas de geometria**, não OCR nem prova de legibilidade (uma forma atrás do texto pode alterar o contraste real). O editor principal é importado sob demanda na tela de projetos para reduzir o JS inicial, mas o Player ainda precisa ser medido em episódios longos.

Depois de renderizar frames locais com \`preview:frames\`, o Codex deve inspeccionar a prévia real e ajustar objetos com problemas. Uma auditoria de pixels/áudio completa segue pendente.
