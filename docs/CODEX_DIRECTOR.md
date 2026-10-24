# Codex Local como diretor de montagem — modo investigação

> Para dirigir **qualquer categoria de vídeo** (investigação, educativo, economia, ciência, personagens etc.), leia primeiro o **[Guia Studio Dark](GUIA_STUDIO_DARK.md)**. Este documento é um complemento de investigação: o caminho principal da v0.18 usa produção IA importada no dashboard e não exige Codex. O guia central traz todos os enums e tutoriais atualizáveis.

## Fluxo sem chat dentro do Dark Studio

Você **continua conversando com o Codex pelo app ChatGPT**, em modo **Local / Este computador**, com acesso autorizado à pasta do código e à pasta \`%USERPROFILE%\DarkStudio\`. O Codex executa as ferramentas quando você manda uma mensagem; o usuário NÃO precisa digitar comandos manualmente.

### Primeira fase — entendimento e fontes

Peça ao Codex que leia \`AGENTS.md\`, \`docs/VISUAL_IDENTITY.md\`, \`src/model/direction.ts\` e \`src/model/shots.ts\`. Ele deve abrir o JSON do projeto e os materiais locais (roteiro, narração, mídia autorizada). Verificar duração real da narração antes de fixar as cenas/planos. Nunca criar “prova” sintética; criar registros de evidências **pendentes** quando tiver origem identificável. Fontes devem ser verificadas independentemente antes da publicação.

### Segunda fase — direção

No terminal que **o próprio Codex** usa, dentro do repositório:

~~~powershell
npm run project -- info UUID-DO-PROJETO
npm run project -- direction-template UUID-DO-PROJETO "$env:TEMP\dark-studio-direction.json"
~~~

O comando cria um storyboard de referência local; se já existir, o Codex deve usar outro nome (não sobrescreve automaticamente). Ele pode editar o arquivo usando como base o modelo [INVESTIGATION_BRIEF.example.json](INVESTIGATION_BRIEF.example.json). O storyboard é **JSON com os intervalos visuais em frames** (30 FPS), cada intervalo possui intenção, título, subtítulo, estilo, movimento e dados opcionais. Cobrir exatamente a duração do episódio sem buracos. Preferir 2–5 s por plano, mas variar intencionalmente.

O Codex pode usar **fonte de prova visual cadastrada** em \`investigation.sourceEvidenceId\` (UUID que está em \`project.evidence[]\`). Quando inserir valores em um gráfico, usar a fonte cadastrada e conservar suas unidades. O programa aceita a origem pendente para construção da proposta, mas avisa e renderiza estado não verificado; não fabrica a revisão humana.

### Terceira fase — proposta, sem sobrescrever episódios

~~~powershell
npm run project -- direct UUID-DO-PROJETO "$env:TEMP\dark-studio-direction.json" REVISAO_SHA
~~~

O comando valida cada intervalo, fonte e mídia; cria planos nativos editáveis, e deixa uma proposta **Revisar Codex** na página inicial do editor. **Não altera o projeto antes da aprovação.** Usará \`replaceShots\` para substituir somente a camada de direção visual, **sem mexer em cenas, áudio, legendas e evidências**. Se a revisão mudar, refazer a proposta, não dar reset.

Alternativa totalmente automática (mais rápida, **apenas ilustrativa**):

~~~powershell
npm run project -- auto-direct UUID-DO-PROJETO REVISAO_SHA
~~~

A versão automática pega textos das cenas e das legendas, cria vários planos curtos, movimento suave e composições rotativas sem inventar números ou fontes. Ela **não realiza pesquisa factual, não gera imagens fotográficas nem sintetiza narração**. É um primeiro passe para o Codex aperfeiçoar.

### Quarta fase — revisão de qualidade

Depois que você aprovar a proposta no editor:

~~~powershell
npm run project -- direction-report UUID-DO-PROJETO
npm run project -- doctor UUID-DO-PROJETO
npm run project -- render UUID-DO-PROJETO
~~~

**O que é auditado:** buracos entre planos, ritmo excessivamente lento/rápido, vários templates idênticos, origem não verificada, gráfico sem dados, mapa esquemático e falta de narração/legendas. Uma validação de engenharia não prova a verdade de uma reportagem; você precisa assistir e conferir.

### Como criar fundo e B-roll sem “imagem falsa como prova”

- Para **atmosfera**: composições SVG/HTML do Remotion (dossiê, textura, linha, marca-texto) são geradas sem API de IA; mantêm texto, destaque e movimento editáveis.
- Para **foto/vídeo real**: Codex pode procurar material, mas precisa verificar licença/atribuição e importar o arquivo para a biblioteca local; ele não deve depender de links externos no MP4.
- Para **arte ilustrativa gerada com ferramentas de imagem**: peça uma composição sem logotipos oficiais, sem pessoas reais identificáveis e sem documentos que pareçam registros autênticos. Identifique em vídeo como *ilustração editorial*, e nunca a apresente como captação factual.
- Para **mapa real, gráfico factual e manchete**: obtenha dados originais e registre a fonte. Os templates \`map\` e \`chart\` são respectivamente esquema e gráfico; o primeiro não geolocaliza, o segundo não cria valores.
- Para **áudio**: preserve narrador e legendas existentes. Se tiver voz sintetizada localmente, alinhe as legendas à duração real; não deduza timestamps confiáveis apenas do texto.

## Mensagem pronta para enviar ao chat do Codex

> Atue como diretor de montagem de um canal investigativo no meu Dark Studio. Leia AGENTS.md, docs/VISUAL_IDENTITY.md e docs/CODEX_DIRECTOR.md. Quero que você faça a maior parte do trabalho: leia meu roteiro, áudio e evidências locais; verifique as fontes necessárias; prepare o storyboard inteiro em frames, com 2–5 segundos por plano quando fizer sentido; use dossiês, documentos, gráficos e comparações, com movimentos discretos e legíveis; mantenha a narração e as legendas sincronizadas; importe apenas B-roll autorizado; e use os comandos direction-template e direct para criar uma proposta. **Não aplique a proposta automaticamente.** Não invente dados, pessoas, mapas, documentos, prints, manchetes nem fontes. Ao terminar, mostre o diagnóstico e me diga o que ainda preciso conferir, para eu abrir **Revisar Codex** no editor.

## Limites atuais que o Codex não deve disfarçar

- O app **não tem modelo IA interno**, recuperação web automática, detector de fake news, licenciamento automático nem gerador de fotografia realista integrado.
- O comando \`auto-direct\` usa um algoritmo de ritmo e composição **sem entender profundamente a investigação**. O Codex na conversa precisa dirigir o conteúdo editorial.
- \`direct\` preserva a composição visual anterior no histórico local. As propostas são revisáveis, mas não fazem merge automático quando duas pessoas editam a mesma revisão.
- O serviço é experimental em \`127.0.0.1\`. Não expor na rede.
- Render 1080p de episódio longo e preview com centenas de planos ainda exigem testes reais e otimização.


## Motion Studio v0.14

Use \`npm run project -- presets\` para listar todas as 50 novas composições, ou \`npm run project -- composition-example person-family <destino.json>\` para receber um blueprint editável. Os beats podem declarar \`presetId\` **OU** \`layers[]\` autorais, com texto, personagem, objeto, cena, gráfico e animação (o segundo tem precedência). Nenhum JS executável precisa ser gerado.

\`npm run project -- sfx list\` lista sons básicos locais; a inserção de um efeito em um projeto também passa pela fila de propostas. Para legenda com palavras realçadas, forneça \`words[]\` somente depois de obter alinhamento do WAV real. Não confunda timestamps hipotéticos com sincronização validada.

Faça \`npm run preview:frames -- UUID 0,150,300\` para gerar amostras em cache local; isso NÃO testa áudio, mas ajuda detectar problemas antes de exportar cinco minutos.
