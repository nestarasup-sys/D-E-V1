# Dark Studio v0.17 — Intelligent Production: OCR local, ZIP streaming e fontes portáteis

O **Dark Studio** é um editor de documentários para Windows 11. A interface usa Tauri 2 + React + TypeScript, o preview utiliza Remotion e a exportação MP4 acontece via Remotion Renderer/FFmpeg em processo separado.

**Como a IA funciona:** você conversa com o **Codex no aplicativo ChatGPT Desktop, em modo Local / Este computador**. O Codex recebe permissão para trabalhar com arquivos locais do projeto Dark Studio, cria ou modifica projetos e opcionalmente solicita a exportação MP4. O editor detecta alterações no disco. **Não existe chat de IA dentro do Dark Studio; nenhum projeto é sincronizado via GitHub.**

GitHub serve apenas para hospedar o **código-fonte do aplicativo**, sem roteiros, mídia ou projetos reais de usuários.


## v0.18 — Criar vídeo do ChatGPT sem Codex ou terminal

Na tela inicial, **Importar produção IA / JSON / .darkstudio** aceita um arquivo `darkstudio-production` v1 criado pelo ChatGPT, com narração por bloco, descrições de camadas, personagens, câmera e animações. O serviço local Windows sintetiza WAVs reais pela voz SAPI instalada, mede a duração, sincroniza cenas e legendas de cada trecho e abre tudo no editor para edição e MP4. Para trocar voz, velocidade ou pausa, use **Regenerar voz e sincronização**. Não se limita aos 50 presets.

O mesmo botão continua aceitando `project.json` v2 e pacotes `.darkstudio` com mídia já pronta. Se o TTS falhar, nenhum vídeo silencioso é criado como se fosse completo.

B-roll descrito no JSON fica planejado e sinalizado enquanto a filmagem e licença não forem aprovadas; a composição procedural pode continuar na prévia. O TTS fornece sincronização por **blocos de narração**, não timestamps fonéticos por palavra. Consulte [a especificação e limitações v0.18](docs/AI_PRODUCTION_018.md) e [um JSON de exemplo para ChatGPT](docs/examples/PRODUCAO_018.example.json).

## v0.17 — Intelligent Production

**OCR português offline:** os frames estratégicos são renderizados localmente e analisados com Tesseract.js e modelo de português instalado via npm. O relatório mostra tempo (segundos), palavras reconhecidas, possíveis cortes, sobreposições, riscos de contraste e recomendações. Continua sendo uma análise amostral, não uma garantia editorial.

**Projeto audiovisual grande:** `.darkstudio` ZIP64 v2 usa arquivos temporários e leitura/escrita em streaming, suporta até **64 GiB / 12.000 mídias** (limite individual de 16 GiB), hashes SHA-256 e bloqueios de ZIP malicioso. Download HTTP Range e upload em blocos retomáveis após interrupção. Pacotes v1 menores continuam aceitos.

**Fontes portáteis:** importe WOFF2/WOFF/TTF/OTF como mídia e selecione no editor; o mesmo arquivo é usado na prévia e no MP4. Só fontes com declaração explícita de redistribuição e nome de licença são incluídas no pacote.

[Documentação, contratos e limites da v0.17](docs/INTELLIGENT_PRODUCTION_017.md).

## v0.16 — Cinco frentes agora integradas

- **Rigs articulados:** poses independentes para braços/pernas/cabeça/olhos e sorriso por quadro-chave, editáveis em camada de personagem.
- **Gráficos econômicos:** fluxo de dinheiro, waterfall/cascata, contador e valores que evoluem por frames, sempre com evidência para números factuais.
- **B-roll guiado por IA:** `mediaPlan` documenta intenção, busca e licença pretendida; imagens/vídeos **já importados** podem ser reenquadrados com foco e zoom. A biblioteca registra origem e licença; não verifica direitos automaticamente.
- **QA raster:** botão no editor renderiza amostras PNG reais e analisa movimento brusco, bordas, contrastes aproximados e riscos de sobreposição/corte. Alertas, não uma garantia de qualidade; sem OCR.
- **`.darkstudio`:** arquivo ZIP único com projeto JSON, mídia, narração, SFX, músicas, legendas e evidências, manifesto com hashes SHA-256. Importação cria IDs de mídia novos e não sobrescreve arquivos locais. Até 512 MB / 250 mídias. Botões no app e comandos locais `pack`/`unpack`.

[Detalhes, limites e fluxo para IA da v0.16](docs/MOTION_ENGINE_016.md). A v0.15 e os 50 presets continuam compatíveis. **A direção da IA segue sendo um `direction.json` revisável, mas o transporte audiovisual completo passa a ser um `.darkstudio`.**

## v0.15 — Motion Engine: criatividade autoral e planos editáveis

O primeiro incremento v0.15 expande os **50 presets existentes** com tipografia avançada (fontes instaladas, contorno, gradiente, alinhamento e revelação por palavra), grupos hierárquicos, máscaras simples, sombras/desfoque, vetores SVG controlados, trajetórias de câmera por pontos e transições de entrada entre planos contíguos. As novas propriedades existem no `direction.json`, no projeto v2, no inspetor e nos mesmos componentes de preview e MP4 — **não são somente promessas de JSON**. Veja [o contrato e os limites do Motion Engine](docs/MOTION_ENGINE_015.md) e [uma direção autoral de 12 segundos](docs/examples/MOTION_ENGINE_015.direction.example.json).

**Ainda pendentes:** pacote único `.darkstudio`, importação direta de direção pelo dashboard, fontes portáteis, personagens com articulações independentes, tracking, B-roll/licenças automáticos e análise raster real de frames. O Codex continua externo, e projetos/arquivos pessoais permanecem fora do GitHub.

## Guia Diretor por JSON — comece aqui

**[Abrir o Guia Diretor por JSON](docs/GUIA_DIRETOR_POR_JSON.md)** — manual vivo das v0.14–v0.15, com os **3 tipos de JSON**, comandos reais, 50 composições, 7 visuais investigativos, personagens, camadas, movimentos, SFX, voz, legendas, evidências, propostas, exportação, limites e **20 tutoriais/seções**. Inclui [direção completa de 12 segundos](docs/examples/GUIA_DIRECAO_12S.example.json) e [operações de identidade](docs/examples/GUIA_OPERACOES.example.json), verificadas automaticamente em testes. **Toda próxima versão deve atualizar o guia e o teste de manutenção**; leia-o antes de pedir direção audiovisual à IA.

## Piloto de montagem dinâmica de 30 segundos (v0.11)

**Novo:** na página inicial clique em **▶ Criar piloto audiovisual 30s**. O serviço local usa uma voz TTS instalada no Windows (System.Speech, sem geração de voz por IA) para montar uma locução WAV de 30s, cria um novo projeto com oito planos animados independentes e respectivas legendas, sem modificar seus projetos atuais.

Na timeline do novo projeto, arraste um plano ou as alças laterais para alterar início/duração; no inspetor edite os keyframes de posição, zoom, rotação, opacidade e easing. Clique em uma legenda para alterar texto/tempo. A narração permanece fixa se você alterar apenas um plano. O render e a prévia usam `src/video/Documentary.tsx`.

A voz precisa realmente estar instalada no Windows; caso contrário o sistema apresenta uma falha clara. Para detalhes do teste e suas limitações veja [docs/PILOT_30S.md](docs/PILOT_30S.md). O diagnóstico da arquitetura e próximas fases está em [docs/VIDEO_ARCHITECTURE.md](docs/VIDEO_ARCHITECTURE.md).

## Windows: dois BATs separados — ATUALIZAR e INICIAR

Os BATs oficiais ficam na raiz do clone (copias identicas em `windows/`):

- **[ATUALIZAR.bat](ATUALIZAR.bat)**: acesse quando quiser **trazer somente a `main` do GitHub** para o codigo local. Executa `git fetch origin main` e `git merge --ff-only origin/main`, sem `reset --hard`, `clean`, `rebase` ou troca para branches alternativas. Instala/ajusta as dependencias com `npm install --no-package-lock` apos atualizar o codigo. Se o clone ainda nao existir, permite clonar somente a `main`.
- **[INICIAR.bat](INICIAR.bat)**: **abre a versao ja instalada no computador**, mesmo que esteja desatualizada em relacao ao GitHub. **Nao faz Git fetch/pull, nao instala atualizacoes nem dependencias automaticamente.** Verifica Node, Cargo e dependencias locais, inicia/confere o servico compativel com **esta versao local** e executa `npm run dev:desktop` (Tauri). Se faltarem dependencias, informa como executar `npm install --no-package-lock --no-audit --no-fund` manualmente, sem atualizar o repositorio.

**Arquivos extras nao bloqueiam mais o ATUALIZAR:** JSONs de direcao, projetos, SRT, roteiros, renders e outros arquivos **nao rastreados pelo Git** ficam onde estao e nao entram no status impeditivo. A lista de diretorios e alguns nomes de dados gerados pelo aplicativo foi adicionada ao `.gitignore` para evitar inclusao acidental. O atualizador **continua bloqueando alteracoes em arquivos ja versionados**, inclusive staged e commits locais divergentes, e o Git **recusa sobrescrever um arquivo novo local se o mesmo caminho chegar na main**. Nenhum arquivo de usuario e apagado para conseguir atualizar.

**Onde ficam os projetos reais:** por padrao, `%USERPROFILE%\DarkStudio\projects` (e a midia fica fora do clone). **Nao salve documentos pessoais dentro do repositorio se puder evitar**: um `git add -f` pode incluir ate arquivos ignorados. O editor nao envia arquivos pessoais ao GitHub.

Os dois BATs procuram o clone na pasta do script (raiz ou `windows/`), na variavel `DARK_STUDIO_REPO_DIR`, em caminho anteriormente salvo em `%LOCALAPPDATA%\DarkStudio\code-path.txt`, em `D-E-V1` ao lado do BAT ou em caminho informado manualmente. O `INICIAR.bat` nao exige internet **para buscar versao nova**; a primeira compilacao nativa pode requerer recursos ja instalados no Windows. Mantenha a janela aberta para ver eventuais erros.

Para trocar os BATs antigos (`01-INSTALAR-ATUALIZAR.bat` / `02-ABRIR-DARK-STUDIO.bat`) pelos novos pela primeira vez, dentro de um clone sem arquivos **versionados** modificados, rode `git fetch origin main` e `git merge --ff-only origin/main`. Depois use exclusivamente `ATUALIZAR.bat` e `INICIAR.bat`. Em clones com codigo modificado, concilie primeiro as mudancas sem apagar trabalho do Codex.

Os testes do GitHub Actions Windows exercitam atualizacao com arquivos locais extras, bloqueio de codigo modificado/staged, conflito de nomes e integridade das copias dos BATs; nao substituem a verificacao da janela no seu computador.

## Preparar o Windows

- Node.js 22+, Git e npm.
- Para executar o Tauri: Rust/rustup, Visual Studio Build Tools (C++) e WebView2. Instruções oficiais: https://v2.tauri.app/start/prerequisites/
- Hardware de referência: Ryzen 5 4600G, RX 7600, RAM 16 GB, 1080p/30 FPS; render concorrência 1.

No PowerShell:

~~~powershell
git clone https://github.com/nestarasup-sys/D-E-V1.git
cd D-E-V1
npm install
npm run dev:service
~~~

Em outro terminal da mesma pasta:

~~~powershell
npm run dev:desktop
~~~

O serviço local gerencia os projetos, a biblioteca de mídia e o render. O Tauri nesta versão ainda não instala/inicia o serviço sozinho. Para testar apenas a interface em desenvolvimento, use npm run dev no segundo terminal e abra http://127.0.0.1:1420.

## Página inicial e projetos

Ao abrir o Dark Studio, você verá os projetos recentes. É possível criar, abrir, duplicar, arquivar e importar projetos JSON. Cada projeto fica em uma pasta no Windows:

~~~text
%USERPROFILE%\DarkStudio\projects\<UUID>\project.json
~~~

A biblioteca de mídia fica em outra pasta local, gerenciada pelo serviço. O projeto é salvo automaticamente quando você edita a timeline; cópias anteriores ficam em project.previous.json. A página inicial permite copiar o caminho da pasta de projetos e, para cada projeto, clicar **Copiar instrução Codex**.

## Usar Codex pelo ChatGPT Desktop

1. No ChatGPT Desktop para Windows, selecione **Codex** e escolha **Local / Este computador**, não Cloud. Abra o repositório de código \`D-E-V1\` como workspace.
2. Conceda ao Codex acesso à pasta dos projetos locais, caso o ambiente de segurança solicite. Ela fica fora do repositório de código. Sem essa permissão, o Codex não consegue modificar arquivos do Dark Studio.
3. No Dark Studio, crie o projeto e clique **Copiar instrução Codex**. Cole a instrução na conversa do Codex junto com seu roteiro e as alterações desejadas.
4. O Codex usa \`npm run project --\` para ler, validar e editar arquivos de projeto. Quando o arquivo mudar, o Dark Studio atualizará a timeline automaticamente (~3,5 segundos) se não houver trabalho manual pendente.
5. Para solicitar a exportação de vídeo no Codex, use \`npm run project -- render <UUID>\` com o serviço local aberto.

**Não é necessário instalar ou autenticar GitHub CLI. Não crie um repositório privado de projetos.** O antigo módulo de sincronização GitHub foi retirado do produto.

O Codex local trabalha sobre arquivos da sua máquina, mas o **conteúdo fornecido à IA ainda pode ser processado pelos serviços OpenAI** conforme seu modo de execução, conta e configurações. Local não significa modelo offline.

## Comandos de integração local

~~~powershell
npm run project -- path
npm run project -- list
npm run project -- create "Novo documentário"
npm run project -- info SEU-UUID
npm run project -- show SEU-UUID
npm run project -- validate SEU-UUID
npm run project -- apply SEU-UUID .\edicoes.json REVISAO
npm run project -- replace SEU-UUID .\projeto-novo.json REVISAO
npm run project -- import .\projeto-gerado.json
npm run project -- render SEU-UUID
~~~

O comando \`info\` exibe a **revisão SHA-256 atual** do projeto. \`apply\` e \`replace\` podem exigir que a revisão permaneça igual, evitando editar em cima de mudanças concorrentes. \`apply\` valida todas as operações e grava em transação; \`replace\` exige revisão explicitamente. \`render\` manda o projeto para o serviço local e acompanha o MP4, sem GitHub.

Leia o passo a passo, regras para o Codex e exemplos em [CODEX_WORKFLOW.md](CODEX_WORKFLOW.md) e [AGENTS.md](AGENTS.md).

## Recursos implementados

- Biblioteca de projetos locais e autosave em arquivos JSON.
- Editor de cenas com controles manuais e histórico desfazer/refazer.
- Importação de imagens/vídeos/narração e timeline de cenas, visual, narração e música.
- Preview no Remotion Player e exportação MP4 local.
- Detecção de alterações externas (Codex) e proteção contra sobrescrita por revisão.
- CLI local de automação: criar, importar, editar, validar e exportar.
- Sem chat interno e **sem transporte por repositório GitHub de dados do usuário**.

## Limitações

- O serviço local 127.0.0.1:4317 ainda não oferece autenticação forte por sessão; esta versão é experimental e não deve ser exposta na rede.
- O render depende de Chromium/Remotion; alguns codecs do WebView2 não são suportados. 16 GB RAM exige cautela em vídeos longos.
- Não há proxies, waveform, ripple-edit, arrastar clipes ou sincronização automática de narração.
- A edição do JSON pelo Codex altera a **composição/projeto**. Para criar um arquivo MP4, use Exportar MP4 no editor ou o comando CLI \`render\`.
- O Codex local não necessariamente tem acesso irrestrito ao computador: respeite as permissões/sandbox. Worktrees e Cloud podem ter arquivos separados do workspace local.
- Resultados CI (TypeScript, testes, build e smoke MP4 Windows) **não** são teste manual no seu computador.
- Revise fatos, fontes e direitos de mídia antes de publicar o vídeo.
- Verifique a licença do Remotion antes de comercializar o editor.

## Testar

~~~powershell
npm run check
npm test
npm run build
npm run smoke:render
~~~

Roadmap único: [ROADMAP.md](ROADMAP.md).

## Cinco etapas de estrutura (v0.6–v0.10)

O [ROADMAP.md](ROADMAP.md) descreve o escopo, o status e os limites de cada etapa. A interface mantém o chat de IA **fora do editor**, no Codex local do ChatGPT.

### 1. Versões anteriores / recuperação

Cada salvamento preserva uma cópia anterior em \`projects/<UUID>/history/<revisão>.json\` (até 30 snapshots). Na página inicial, abra **Versões** e restaure uma versão com confirmação. Restaurar registra também a versão substituída. O comando CLI \`history <UUID>\` lista versões; \`restore <UUID> <snapshot-sha> <revision-atual>\` restaura a selecionada.

### 2. Propostas do Codex, sem alterações silenciosas

No terminal que o Codex controla (você continua conversando apenas pelo chat do ChatGPT), dentro do repositório:

~~~powershell
npm run project -- info SEU-UUID
npm run project -- preview SEU-UUID .\edicoes.json REVISAO
npm run project -- propose SEU-UUID .\edicoes.json REVISAO
~~~

No cartão do projeto, clique **Revisar Codex**. As propostas mostram cenas criadas, alteradas e removidas, e podem ser aprovadas ou descartadas. O comando \`propose\` só grava um arquivo local na pasta \`proposals\`; **não modifica o projeto até você aprovar**. Em caso de alteração concorrente, a revisão obsoleta bloqueia aplicação. \`apply\` e \`replace\` continuam disponíveis para automação intencional, sempre com revisão explícita.

### 3. Legendas SRT sincronizadas com narração

Na biblioteca do editor, clique **Importar SRT**. O arquivo é validado e convertido em frames a 30 FPS. Você verá uma trilha de legendas na timeline e os textos no preview/render MP4. Também pode **Exportar SRT**. Codex local pode produzir um SRT com timestamps para importar. **O Dark Studio ainda não reconhece fala automaticamente**; gerar/transcrever áudio é tarefa de um sintetizador/transcritor externo.

### 4. Registro de fontes e evidências

Cada cena tem um painel **Fontes e evidências**: afirmação, documento/origem, URL HTTPS opcional, notas e status (\`pendente\`, \`verificada por mim\`, \`rejeitada\`). O Codex pode preparar fontes como registros pendentes, e você confirma manualmente. Apagar uma cena não apaga a evidência: ela permanece desvinculada.

### 5. Diagnóstico local

No cartão do projeto, clique **Diagnóstico**. Verifica se as mídias cadastradas estão no disco, alerta sobre cenas factuais sem fonte, fontes pendentes/rejeitadas e ausência de narração/legendas. Comando local:

~~~powershell
npm run project -- doctor
npm run project -- doctor SEU-UUID
~~~

O relatório também mostra o sistema, memória RAM livre e versão Node. Não substitui uma validação de fatos nem garante que todos os codecs do arquivo exportem corretamente.


## v0.12 · Direção investigativa pelo Codex (o editor continua local)

O Dark Studio tem composições nativas editáveis de **dossiê, documento destacado, cadeia de evidências, gráfico com valores cadastrados, comparação, mapa esquemático e identificação (lower third)**. Textos, números, tempos, cor, fontes de dados, movimentos e quadros-chave continuam no JSON do projeto e no inspetor do editor — não são fundos JPEG achatados.

O Codex pelo **chat do ChatGPT Desktop em modo Local** pode analisar o roteiro e criar o storyboard do episódio. A automação não precisa de chat dentro do editor. Use `npm run project -- direction-template <UUID> <direcao.json>` para gerar um primeiro esboço, `npm run project -- direct <UUID> <direcao.json> <revisao>` para criar uma **proposta completa, sem aplicar**, ou `npm run project -- auto-direct <UUID> <revisao>` para um primeiro passe automático e declaradamente ilustrativo. No Dark Studio, clique **Revisar Codex** para aprovar. A narração e as legendas não são deslocadas na troca visual. Confira as fontes e licenças antes de publicar.

**Comece por:** [Bíblia visual e fundamentos pesquisados](docs/VISUAL_IDENTITY.md), [Como comandar pelo chat do Codex](docs/CODEX_DIRECTOR.md) e [Exemplo seguro de direção](docs/INVESTIGATION_BRIEF.example.json).

Nenhuma mídia real é buscada, licenciada ou enviada ao GitHub automaticamente. O programa pode montar gráficos e fundos vetoriais por código, mas não deve inventar fatos: valores de gráficos com dados precisam estar ligados a uma evidência cadastrada. Mesmo fontes marcadas como conferidas exigem revisão humana antes de publicar.

## v0.13 — Compatibilidade do serviço Windows e revisão do episódio

O **BAT de abertura na raiz** agora usa \`scripts/ensure-service.ps1\`. O supervisor verifica a versão/API/build, a pasta do repositório e a identidade do serviço que ocupa \`127.0.0.1:4317\`. Se for um serviço Dark Studio antigo iniciado pelo mesmo usuário, com processo Node reconhecível, pode reiniciá-lo; nunca encerra um processo desconhecido. Se não conseguir identificar com segurança, **interrompe com orientação**, sem mexer em seus projetos.

\`GET /health\` e \`GET /v1/health\` retornam appVersion, apiProtocol, build, projectSchemaVersion, capabilities, pid, startedAt, workspace e projectsDirectory. O frontend só aceita as rotas depois de confirmar o contrato, impedindo o erro real em que \`ready\` vinha de um servidor antigo sem rotas de propostas.

A tela inicial mostra a versão do serviço e **o número de propostas que aguardam decisão**, além de avisar sobre JSON inválido ou de outra versão que antes sumia silenciosamente. A prévia de proposta diferencia **planos salvos** e **planos ainda não aprovados**. Não clique em aprovar sem inspecionar fontes e mídia.

**Aviso para quem usa o Codex Local:** o commit \`eeb6c37\` descrito no relatório do Codex pode existir apenas no seu clone Windows, não neste GitHub. Faça backup e preserve essas alterações antes de atualizar; não execute \`git reset --hard\` ou \`git clean -fdx\` para forçar a sincronização. O supervisor atual foi implementado separadamente no GitHub e precisa ser testado no Windows real.


### Estado de produção por episódio (sem refazer trabalho do Codex)

Em vez de recriar uma proposta se o serviço não a exibe, confira o handshake e a pasta local. \`npm run project -- service-info\` mostra a versão do serviço em execução; erro de compatibilidade deve ser corrigido ANTES de aprovar qualquer mudança.

- \`npm run project -- production <UUID> status\`: mostra o estado real de pesquisa, roteiro, narração, legendas, propostas visuais, QA e exportações.
- \`npm run project -- production <UUID> checkpoint\`: salva \`production/checkpoint.json\` dentro da pasta local do projeto, sem enviar nada ao GitHub.
- \`npm run project -- production <UUID> continue\`: somente quando há roteiro, voz local e legendas, prepara uma proposta ilustrativa não destrutiva. Se uma proposta já existir, **não duplica**.
- Na tela inicial, botão **Produção** mostra as etapas, checkpoint e exportações concluídas/interrompidas. **Revisar Codex** é onde você aprova os planos.

O registro de renders agora permanece em \`%USERPROFILE%\\DarkStudio\\jobs\`. O serviço distingue processos ativos de exportações interrompidas depois do reinício; não há retomada de render por frame ainda. Consulte [ROADMAP.md](ROADMAP.md) para o que realmente está implementado e o que falta validar.

### Metadados de evidência para investigações

Cada fonte pode registrar, sem obrigar antigos arquivos a mudar: trecho que sustenta a alegação, data de publicação, data da consulta, região/população, unidade usada em números e situação de direitos/licenciamento. A tela **Fontes e evidências** agora edita esses campos, sempre com revisão humana explícita. Um gráfico sem trecho, data ou região de referência recebe alerta editorial; um campo preenchido **não significa prova verificada**.


## v0.14 · Motion Studio com 50 composições + camadas do Codex

Além dos sete modelos investigativos, **50 novas composições ilustrativas** estão disponíveis em seis bibliotecas: personagens (10), cenários (8), dados (10), narrativa (8), explicações (8) e YouTube/identidade (6).

O novo modelo de \`shots[].layers[]\` inclui personagens vetoriais 2D, cenários, objetos, texto cinético, formas, gráficos, conexões, partículas e imagens locais. Cada camada é independente, tem início/duração, cor, x/y, escala, rotação, opacidade, comportamentos animados e keyframes. Pode sincronizar a entrada com o início de uma legenda existente usando \`cueCaptionId\` e offset. Os projetos v2 antigos continuam legíveis via defaults.

Na interface: selecione um plano, abra **50 COMPOSIÇÕES · GALERIA**, aplique uma receita e use **OBJETOS E CAMADAS** e a **TIMELINE DE ELEMENTOS** para personalizar. O Codex Local pode pedir \`npm run project -- presets\`, escolher \`presetId\` em \`direction.json\` ou criar suas próprias \`layers[]\` (nenhum código arbitrário do Codex é executado no render).

**Guia:** [docs/ANIMATION_STUDIO.md](docs/ANIMATION_STUDIO.md) · [Storyboard de seis bibliotecas](docs/MOTION_STORYBOARD.example.json).

Testes: \`npm run smoke:motion\` renderiza seis modelos a 640x360 num MP4 curto; \`npm run smoke:pilot\` continua cobrindo voz/legendas do Windows. O Codex pode gerar **amostras em cache local** com \`npm run preview:frames -- UUID 0,75,150\`. Esses resultados não garantem 1080p de cinco minutos no seu PC nem substituem revisão editorial.

Sem captura automática de atores reais, licenciamento de B-roll, alinhamento fonético por palavra, geração de imagem com IA ou render segmentado nesta fase. Esses passos estão no [ROADMAP.md](ROADMAP.md).


### Sonoplastia procedural e destaques por palavra

O Codex Local pode executar \`npm run project -- sfx list\` ou \`npm run project -- sfx soft-whoosh UUID REVISAO FRAME 0.18\` para gerar um WAV simples sem direitos de terceiros e preparar uma proposta de efeito na pista SFX. O áudio, a mídia e a proposta ficam somente no Windows. Não é uma biblioteca de gravações profissionais.

O schema \`captions[].words[]\` opcional permite destacar palavras no vídeo por timestamp ABSOLUTO em frames, desde que o Codex obtenha dados de alinhamento de áudio real. Sem \`words[]\`, legendas continuam comuns. O Dark Studio não inventa os timestamps da voz; alterar o texto ou início/fim de uma legenda elimina o alinhamento prévio para evitar sincronismo enganoso.

**Aceitação ainda pendente**: testar audivelmente os efeitos e o sincronismo de palavra em um episódio real e comparar preview/MP4 no PC do usuário. Consulte [docs/ANIMATION_STUDIO.md](docs/ANIMATION_STUDIO.md).
