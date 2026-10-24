# Dark Studio — instruções para Codex Local

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
