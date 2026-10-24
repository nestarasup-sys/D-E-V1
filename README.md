# Dark Studio v0.13 (serviço compatível) — Editor desktop com Codex local

O **Dark Studio** é um editor de documentários para Windows 11. A interface usa Tauri 2 + React + TypeScript, o preview utiliza Remotion e a exportação MP4 acontece via Remotion Renderer/FFmpeg em processo separado.

**Como a IA funciona:** você conversa com o **Codex no aplicativo ChatGPT Desktop, em modo Local / Este computador**. O Codex recebe permissão para trabalhar com arquivos locais do projeto Dark Studio, cria ou modifica projetos e opcionalmente solicita a exportação MP4. O editor detecta alterações no disco. **Não existe chat de IA dentro do Dark Studio; nenhum projeto é sincronizado via GitHub.**

GitHub serve apenas para hospedar o **código-fonte do aplicativo**, sem roteiros, mídia ou projetos reais de usuários.


## Piloto de montagem dinâmica de 30 segundos (v0.11)

**Novo:** na página inicial clique em **▶ Criar piloto audiovisual 30s**. O serviço local usa uma voz TTS instalada no Windows (System.Speech, sem geração de voz por IA) para montar uma locução WAV de 30s, cria um novo projeto com oito planos animados independentes e respectivas legendas, sem modificar seus projetos atuais.

Na timeline do novo projeto, arraste um plano ou as alças laterais para alterar início/duração; no inspetor edite os keyframes de posição, zoom, rotação, opacidade e easing. Clique em uma legenda para alterar texto/tempo. A narração permanece fixa se você alterar apenas um plano. O render e a prévia usam `src/video/Documentary.tsx`.

A voz precisa realmente estar instalada no Windows; caso contrário o sistema apresenta uma falha clara. Para detalhes do teste e suas limitações veja [docs/PILOT_30S.md](docs/PILOT_30S.md). O diagnóstico da arquitetura e próximas fases está em [docs/VIDEO_ARCHITECTURE.md](docs/VIDEO_ARCHITECTURE.md).

## Windows: instalar, atualizar e abrir com dois cliques (BAT)

**Os dois BATs estão na raiz do repositório**, junto ao `package.json`: [01-INSTALAR-ATUALIZAR.bat](01-INSTALAR-ATUALIZAR.bat) e [02-ABRIR-DARK-STUDIO.bat](02-ABRIR-DARK-STUDIO.bat). Também mantemos cópias na subpasta `windows` para quem já utilizava os caminhos antigos.

Se você baixou os dois BATs separadamente e os colocou em uma **pasta nova**, mantenha-os juntos:

1. Abra o **01-INSTALAR-ATUALIZAR.bat**. Ele detecta Git e Node.js; se faltarem, pergunta antes de instalar via winget. Baixa o repositório na subpasta **D-E-V1** se ainda não existir. Em execuções seguintes, atualiza a branch **main** com \`git pull --ff-only\`, instala as dependências, verifica TypeScript, testes e build, e confere Rust/MSVC. Pode oferecer instalação de Rust e C++ Build Tools com sua confirmação.
2. Se um instalador de Git, Node, Rust ou C++ foi executado, feche e reabra o terminal e rode o primeiro BAT de novo. O Microsoft C++ Build Tools é um download grande e pode requerer permissão de administrador; no Windows 11 o WebView2 normalmente já está instalado.
3. Abra o **02-ABRIR-DARK-STUDIO.bat**. Ele inicia o serviço de projetos/mídia e o aplicativo desktop Tauri em **janelas de terminal separadas**. Mantenha as janelas abertas enquanto trabalha.

Os BATs também funcionam dentro da pasta do repositório ou em sua subpasta \`windows\`. O atualizador não executa \`git reset\`, \`git clean\` ou trocas de branch; se houver alterações locais no código, ele avisa e para, em vez de sobrescrevê-las.

**Importante:** GitHub baixa/atualiza somente o **código-fonte**. Projetos, roteiros, narrações e mídias continuam em pastas locais fora do repositório, e o Codex é usado **pelo chat do aplicativo ChatGPT, em modo Local**.

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
