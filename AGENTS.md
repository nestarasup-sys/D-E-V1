# Dark Studio — instruções para Codex Local

> **Leitura obrigatória para qualquer produção audiovisual ou direção visual:** [Guia Studio Dark](docs/GUIA_STUDIO_DARK.md). Antes de produzir `darkstudio-production`, `project.json`, `direction.json` ou `operacoes.json`, consulte o guia **e os schemas atuais**. Depois execute `npm run project -- presets` e use `direct`/`propose` para entregar uma **proposta revisável**, não mudanças destrutivas. Nunca ignore as 50 composições ou invente campos da API.
>
> **Manutenção:** toda alteração de `src/model/direction.ts`, `project.ts`, `shots.ts`, `layers.ts`, `presets.ts`, `operations.ts`, comandos da CLI, voz/mídia/legendas ou renderização exige revisão correspondente do guia, dos exemplos e de `src/model/director-json-guide.test.ts` **no mesmo commit**. Não enfraquecer os testes para ocultar recursos não documentados. Link de atualização: seção 19 do guia.

## Manual mestre v0.18 — nome estável e manutenção por versão

- **Caminho canônico do guia:** `docs/GUIA_STUDIO_DARK.md`. O nome do arquivo permanece estável; a versão mais recente (`0.18.0` agora) fica **no título e cabeçalho**, não no filename.
- A documentação **v0.18** deve começar por `darkstudio-production` no dashboard, com SAPI real, `SpeakProgress` condicional, som procedural, Pexels assistido/automático conservador, QA com OCR e ZIP64/fontes. Direção CLI por Codex é alternativa avançada, não pré-requisito.
- Atualize o manual, exemplos, links `README.md` e teste `src/model/director-json-guide.test.ts` no mesmo commit de qualquer mudança funcional. A seção 0 é o estado atual; as seções 1–20 preservam instruções detalhadas com contexto histórico.
- Versionamento atual: app `0.18.0`, protocolo local `10`, `project.version=2`, `direction.version=1`, `darkstudio-production.version=1`. Verifique em `src/model/service-contract.ts` na próxima release.

## Intenção
- Dark Studio é um editor desktop de vídeo; ChatGPT Desktop/Codex é o ambiente **externo** onde o usuário pede montagens e alterações.
- Usar **Codex Local / This computer**, sem Cloud e sem Worktree para edições compartilhadas ao vivo, a menos que o usuário configure acesso ao mesmo diretório.
- **Nunca crie chat de IA dentro do Dark Studio.** Não adicione sincronização GitHub para dados de usuários.
- GitHub \`nestarasup-sys/D-E-V1\` hospeda apenas código. Não envie projetos, roteiros, mídias ou tokens ao repositório.

## Projetos no computador
- Por padrão \`%USERPROFILE%\DarkStudio\projects\<UUID>\project.json\`, mídia local fora do repositório.
- Schema \`src/model/project.ts\`; operações \`src/model/operations.ts\`.
- CLI \`npm run project -- path | list | create | info | show | validate | import | apply | replace | render\`.
- Prefira \`apply <id> <ops.json> <revision>\`; para projeto inteiro use \`replace <id> <json> <revision>\`.
- Releia a revisão se houver conflito, em vez de sobrescrever a edição do usuário. Salve e valide projetos em transações.
- Um novo documentário deve aparecer no dashboard quando criado pelo CLI. Uma edição em disco deve ser detectada automaticamente pelo editor.
- Preserve IDs existentes e dados factuais, use quadros a 30 FPS. Sem inventar licenças, fontes, dados ou assets não importados.

## Segurança e qualidade
- O Codex local precisa ter permissão explícita para acessar o diretório de projetos. Não tentar burlar o sandbox.
- Projeto/arquivos no computador não significam inferência de IA totalmente offline: evite afirmações de privacidade absolutas.
- Exportação MP4 por \`npm run project -- render <id>\` exige serviço local ativo.
- Serviço Node em \`apps/agent\` gerencia disco/mídia/render; UI React/Tauri em \`src/\`.
- Verificar TypeScript, testes, build frontend e CI Windows/MP4 antes de marcar pronto.
- Trabalhar somente na \`main\` conforme preferência do usuário.

## Regras novas: v0.6–v0.10

- Use **proposta em vez de edição direta por padrão**: \`npm run project -- info <id>\`, depois \`npm run project -- propose <id> <ops.json> <revision>\`. Oriente o usuário a abrir **Revisar Codex** no dashboard; não execute \`accept\` sem pedido claro.
- Ao pedir alteração de storyboard/roteiro, mantenha evidências com estado \`pending\`. Nunca assinale \`verified\` por decisão da IA.
- Schema adicional no projeto: \`captions\` (startFrame,endFrame,text,UUID) e \`evidence\` (id,sceneId?,claim,sourceTitle,sourceUrl HTTPS opcional,notes,reviewStatus). Campos existem no JSON v2 com defaults para compatibilidade.
- Arquivos \`.srt\` são legendas importáveis pelo editor, **não transcrição automática**.
- Ferramentas locais: \`history\`, \`restore\`, \`preview\`, \`propose\`, \`pending\`, \`accept\`, \`reject\`, \`doctor\`. Nenhuma delas usa GitHub para dados de usuário.
- Snapshots históricos em \`history\` (até 30) e propostas em \`proposals\` ficam no diretório privado de cada projeto. Não publique esses arquivos.

## Montagem vNext / piloto 30s

- Antes de reconstruir o modelo veja `docs/VIDEO_ARCHITECTURE.md`. Preservar `version:2` com `visualMode:'legacy'` para projetos antigos.
- `shots[]`: planos visuais editáveis em frames absolutos, com `startFrame`, `durationFrames`, `motion` (keyframes relativos ao plano), `zIndex`, `kind` e `style`. `chapters[]` organiza cenas sem alterar a duração; `channelKit` compartilha identidade visual.
- Preferir operações `addShot`, `updateShot`, `removeShot`, `replaceChapters` e `updateChannelKit` via proposta validada. Não deslocar automaticamente a narração e as legendas quando o usuário mover um plano.
- O piloto (`npm run project -- pilot`) requer serviço local e voz SAPI do Windows; gera WAV e JSON apenas em `%USERPROFILE%\DarkStudio`, sem GitHub nem mídia no repositório.
- A mesma composição `Documentary` serve para Player e render MP4; não criar dois motores separados. Alterações de keyframes precisam de testes determinísticos.
- Verificar `npm run smoke:pilot` (Windows) e `npm run smoke:render` (legacy) antes de declarar o piloto automatizado validado. Testes reais do usuário continuam necessários para validar UI, desempenho e escuta.

## Direção visual e autonomia do Codex (v0.12)

- Leia `docs/VISUAL_IDENTITY.md` e `docs/CODEX_DIRECTOR.md`. O Codex é diretor técnico/editorial no chat externo; o Dark Studio não recebe IA incorporada.
- Para episódios grandes, prefira `npm run project -- direction-template <id> <saida.json>` e `npm run project -- direct <id> <direcao.json> <revision>` em vez de dezenas de `addShot`. O resultado é proposta, não alteração imediata. `auto-direct` é fallback ilustrativo baseado nas cenas e captions existentes, NÃO pesquisa factual.
- `src/model/direction.ts` exige cobertura integral do tempo em frames e preserva `clips` (voz, música, SFX), `captions`, `evidence`, `assets` e `scenes`.
- Estilos investigativos em `src/video/InvestigationVisual.tsx` são SVG/HTML editáveis: dossier, document, evidence, chart, map, comparison, lower-third. Mapa é ESQUEMA sem geolocalização; arte reconstruída deve aparecer como ilustrativa.
- Gráficos com valores no `direction.json` exigem `investigation.sourceEvidenceId` existente. Uma fonte cadastrada não equivale a fonte verificada: mantenha `pending`; o editor exige revisão humana.
- Para mídia real, importar arquivo autorizado na biblioteca do Windows. Não apresentar imagens geradas, fotografias ilustrativas nem pseudo-documentos como registro factual. Não publicar roteiros, mídias ou projetos de usuários no GitHub.
- Para QA: `direction-report` e `doctor` devem apontar lacunas, ritmo, fontes pendentes, mapa esquemático e áudio/legenda ausentes; ouvir render e comparar preview com MP4 antes de declarar pronto.

## Confiabilidade v0.13 — primeiro verifique o serviço e o projeto real

- \`npm run project -- service-info\`: exige a mesma versão de serviço que o editor. \`ready\` isolado NÃO significa compatibilidade. O BAT da raiz chama \`scripts/ensure-service.ps1\` e não deve encerrar processo desconhecido.
- A CLI pode criar projeto e proposta com acesso direto ao disco mesmo que o serviço anterior esteja velho. Se a proposta não aparecer na UI, **não a recrie**: verifique o handshake, caminho do projeto e existência em \`projects/<UUID>/proposals\`.
- \`npm run project -- production <UUID> status\`: inspeciona estado REAL: fontes, roteiro, voz, legenda, proposta, QA e exportações. \`production <UUID> checkpoint\` salva checkpoint local. \`production <UUID> continue\` prepara no máximo UMA proposta visual ilustrativa, se há roteiro, voz e legendas disponíveis; não gera fatos, voz nem imagens sintéticas apresentadas como reais.
- No editor, **Produção** mostra checkpoints, pendências e renders. **Revisar Codex** mostra os planos da proposta, não os confunda com os planos do projeto-base ainda não aprovado.
- O render deixa \`jobs/<id>.status.json\` no disco; após reinício, um worker morto é classificado como \`interrupted\`. Isso não significa render resumível pelo frame: para esse recurso precisamos pipeline segmentado.
- Pesquisa e validação editorial humana permanecem necessárias. Nenhum estado técnico \`completed\` representa publicação ou veracidade aprovada.
- **Nunca** executar reset hard/clean -fdx para descartar o trabalho local do Codex sem permissão explícita, sobretudo se o commit \`eeb6c37\` não estiver no GitHub. Não enviar \`project.json\`, \`jobs\`, \`production\`, fontes ou WAV para a main.

### Campos jornalísticos opcionais

Em \`evidence[]\`, o Codex pode preencher \`sourceExcerpt\`, \`publicationDate\` e \`accessedAt\` (\`YYYY-MM-DD\`), \`region\`, \`unit\` e \`rights\`. Deixe em branco/ausente se não verificar; não invente datas ou autorização de imagem. \`reviewStatus\` permanece \`pending\` até revisão humana. Projetos v2 anteriores continuam válidos sem esses campos.


## Motion Studio v0.14 — elementos combináveis e Codex first

- Ver \`docs/ANIMATION_STUDIO.md\`: são **50 presets** e um scene graph nativo (\`src/model/layers.ts\`, \`src/model/presets.ts\`). Preservar compatibilidade \`version:2\`; \`shots[].layers\` tem default \`[]\`.
- Direção do Codex: \`direction.beats[].presetId\` para uma receita ou \`direction.beats[].layers\` para uma composição autoral sem JS arbitrário. O compilador gera UUIDs, valida durações/assetIds/evidências e preserva áudio, captions e cenas existentes.
- A mesma composição \`Documentary\` renderiza os \`AnimatedLayer\` com personagens SVG, gráficos e texto nos mesmos frames usados no Player e MP4.
- Ao alterar duração de um plano, retimar \`motion\` e \`layers\`. Cada elemento tem \`startFrame\`/ \`durationFrames\` relativo ao plano, comportamentos, keyframes e opcional \`cueCaptionId\`; o vínculo usa timestamps REAIS já fornecidos no projeto, não força transcrição.
- Segurança jornalística: qualquer \`chart.values\` precisa de \`sourceEvidenceId\` presente no projeto; revisão humana continua indispensável. Cenas procedurais são ilustrações, nunca filmagens reais. Camada \`image\` só referencia asset local importado.
- Desempenho e testes: no máximo 48 camadas por plano; evitar filtros 3D e DOM gigante. Rodar \`npm run check\`, \`npm test\`, \`npm run smoke:motion\` e \`npm run smoke:pilot\`. O render de produção tem concurrency 1.
- \`npm run preview:frames -- UUID 0,75,150\` permite auditar visual rapidamente com PNGs em cache local por SHA do projeto. Não confundir com render integral e áudio.
- Não criar branch; código somente na \`main\` com fast-forward. Nunca subir mídia, WAV, project.json, thumbnail do usuário ou renders para o repositório. Preservar patches locais do Codex, inclusive commits não enviados.


### SFX e palavra ativa v0.14

- \`npm run project -- sfx list\` retorna nove efeitos sintetizados localmente; \`sfx <tipo> <UUID> <REVISAO> <frame> <volume>\` cria WAV apenas no computador e proposta de \`addAsset\` + \`addClip\`. Não aplicar ou mixar sem prévia auditiva.
- \`captions[].words\` aceita \`[{text,startFrame,endFrame}]\` em frames ABSOLUTOS do projeto; o editor destaca a palavra ativa, mas nenhum alinhador fonético automático está incorporado. Nunca inferir esses valores apenas pelo texto; usar ferramenta de alinhamento real e verificar.
- Alterar manualmente texto/tempos de uma legenda invalida seus \`words[]\`; regenerar a sincronização a partir do áudio, não copiá-la cegamente.


## AI Production v0.18 — contrato audiovisual
- O caminho principal da v0.18 é `ChatGPT -> arquivo darkstudio-production JSON -> importação no dashboard -> voz SAPI real -> duração medida -> cenas/planos/captions -> preview -> MP4`, sem Codex/terminal. Voz sem arquivo real deve resultar em erro, nunca vídeo silencioso disfarçado.
- `productionSchema` v1, `projectSchema` v2 com `productionPlan` opcional; não mover dados dos usuários, não reescrever vozes antigas, não apagar WAVs locais. Revisão da narração deve preservar cenas e IDs quando possível.
- - V0.18: `SpeakProgress` é a fonte de timestamps por palavra; nunca inventar tempos se a voz não fornecer eventos confiáveis. `wordCue` em camadas deve suprimir a animação quando não houver tempo de palavra. Som `soundDesign:auto|explicit|off` usa WAVs procedurais e ducking, não licenças externas.
- Seleção B-roll em lote exige consentimento explícito do usuário, API Pexels oficial, escore >=0,77, autor, resolução e duração; metadados insuficientes => fallback procedural. B-roll automaticamente selecionado permanece direitos pendentes até revisão humana.
- B-roll não é gerado a partir de palavras. Requisições sem material permanecem pendentes com fallback procedural. A integração com Pexels deve usar apenas API oficial, HTTPS e origens de download verificadas, chave da sessão ou ambiente, sem alegar conferência automática de licença; downloads precisam de aprovação humana e registrar autor, página e atribuição.
- Compatibilidade com todos os projetos v0.17 e pacotes .darkstudio obrigatória; cada mudança deve atualizar testes e guia.
- Somente branch `main`, sem reset/clean destrutivo, com `ATUALIZAR.bat` e `INICIAR.bat` preservados.

## Intelligent Production v0.17 — OCR, ZIP64 e licenças de fonte

- Nenhum dado do usuário deve entrar na main. Projetos continuam `version:2` e direções `version:1`.
- OCR offline em português via `tesseract.js` com modelo local do npm; indicar segundos exatos, alertas e correções. Não prometer OCR infalível nem inspecionar todos os frames se a rotina é amostral.
- `.darkstudio` formato ZIP v2 e ZIP64: somente entradas previstas, 64 GiB totais / 16 GiB por item / 12 mil mídias, verificar SHA-256, sem ler vídeos inteiros na RAM, temporários isolados com limpeza após erros. Uploads em blocos podem ser retomados por offset; exportação gera arquivo de disco e HTTP Range. Preservar importador v1.
- Fontes importadas têm `kind:"font"` e MIME WOFF2/WOFF/TTF/OTF, assinatura mágica checada; família `DSFont-UUID` no texto, CSS @font-face carregado tanto no Player como MP4. Para exportar em .darkstudio: `rights.redistributionAllowed===true` e `licenseName` não vazio obrigatórios. Remapear IDs e referências de fonte ao importar.
- Manter `ATUALIZAR.bat` buscando apenas origin/main e `INICIAR.bat` abrindo exclusivamente o local.
- Atualizar `docs/INTELLIGENT_PRODUCTION_017.md`, guia, testes e smoke de Windows no mesmo commit.

## Motion Engine v0.16 — regras para as cinco novas frentes

- Preservar formato `project.version:2` e `direction.version:1`. Rigs (`rig`, `rigKeys`), estágios de gráficos (`chartStages`), B-roll (`framing`, `mediaPlan`) e `assets[].rights` usam validação estrita/defaults para projetos antigos. Os 50 presets continuam válidos.
- Gráficos com números exigem `sourceEvidenceId`. B-roll externo deve ser **importado** e ter licença revisada pelo usuário; `status:"cleared"` só é registrado por ação editorial, nunca inventado como automaticamente verificado.
- QA raster executa somente em `127.0.0.1`, renderiza amostras e combina métricas dos pixels com geometria; **não** alegar OCR ou avaliação semântica se não existem.
- Pacote `.darkstudio` deve conter todos os assets cadastrados com manifesto e SHA-256; validar IDs, MIME, nomes e limites antes de importar, sem extração de caminhos e sem sobrescrever mídia ou projeto do usuário. Limite 512 MB e 250 mídias neste primeiro formato.
- `docs/MOTION_ENGINE_016.md` e `docs/GUIA_STUDIO_DARK.md` fazem parte do contrato de manutenção do JSON/render/editor/serviço; atualize também os testes de integridade.
- `ATUALIZAR.bat` baixa a main; `INICIAR.bat` apenas a versão local. Não mexer nesse contrato.

## Motion Engine v0.15 — contrato de composição autoral

- Manter `project.version:2` e `direction.version:1`; os 50 presets v0.14 continuam válidos. Não substituir dados de usuário nem migrar projetos silenciosamente.
- Contrato: `layers` com `group`/`vector`, `parentId` no projeto e `key`/`parentKey` somente na direção, efeitos restritos, tipografia, `cameraPath` e `transitionIn`. Valide ausência de ciclos em grupos e limites de duração. Nenhum HTML, JS, CSS arbitrário ou arquivo de fonte externo no JSON.
- O render `Documentary`/`ShotVisual`/`AnimatedLayer` é compartilhado por Player e MP4. Modificar JSON, render ou controles exige atualizar `docs/GUIA_STUDIO_DARK.md`, `docs/MOTION_ENGINE_015.md`, exemplos e testes no mesmo commit.
- Recurso liberado neste incremento: tipografia configurável, grupos+efeitos+SVG, câmera por pontos e transições 2D. **Não** afirmar que temos personagens com rigs articulados, física, rastreamento automático, B-roll licenciado, análise raster ou pacote `.darkstudio`; ficam no roadmap.
- `INICIAR.bat` continua abrindo apenas o código local, e `ATUALIZAR.bat` continua seguindo apenas `origin/main` sem apagar dados.

## Inicializadores Windows e atualizacao Git (2026-10)

- BATs oficiais: `ATUALIZAR.bat` e `INICIAR.bat` na raiz, copias byte-a-byte em `windows/`. Os nomes antigos nao sao mais usados.
- `ATUALIZAR.bat` busca **somente origin/main** e faz **fast-forward** (`git fetch`, `git merge --ff-only`) sem `reset --hard`, `clean`, rebase ou merge automatico. Apos atualizar o codigo, executa `npm install --no-package-lock` (sem testes pesados).
- Arquivos **nao versionados** — incluindo dados locais/JSONs/rascunhos do usuario — **nao bloqueiam o atualizador** e devem permanecer intactos. Arquivos versionados modificados/staged, commits locais divergentes e arquivos untracked em conflito com novos caminhos da main **continuam bloqueados**. Nunca desabilitar as protecoes do Git para fazer update.
- `INICIAR.bat` **nunca atualiza o codigo nem baixa pacotes por conta propria**, mesmo se a main remota mudou. Deve iniciar Tauri da versao instalada, conferir/iniciar apenas o servico local compativel com ela via `scripts/ensure-service.ps1`, e orientar `npm install --no-package-lock` **manual** se faltar dependencias. Nao matar processos desconhecidos na porta 4317.
- Ambos funcionam com repo renomeado, na raiz, em `windows/`, ou fora do repo usando `DARK_STUDIO_REPO_DIR`, caminho persistido em `%LOCALAPPDATA%\DarkStudio\code-path.txt`, ou pasta informada. Scripts nao dependem do diretorio atual.
- Projetos/midias do usuario vivem preferencialmente fora do repo em `%USERPROFILE%\DarkStudio`. O atualizador nao deve enviar, limpar, reescrever ou ocultar os projetos do app.
- Rodar `scripts/test-windows-bats.ps1` na CI Windows para verificar fast-forward, dados nao versionados preservados, bloqueios de codigo tracked/staged, recusa de untracked em colisao e isolamento do `INICIAR`.
