# Dark Studio — Roadmap oficial

Atualizado em 23/10/2026. Branch única: **main**. Projetos de usuários ficam no Windows, não no repositório do código.

## Visão

Editor de documentários investigativos, com controle manual da timeline e **Codex no chat do aplicativo ChatGPT em modo Local** (fora da interface Dark Studio). O Codex acessa a pasta do projeto somente com permissão do usuário. O editor detecta alterações de arquivo no Windows; o aplicativo não possui chat embutido nem sincroniza projetos por GitHub.

Hardware de referência: Windows 11, Ryzen 5 4600G, RX 7600, 16 GB RAM. 1080p/30 FPS, render Remotion com concorrência 1, proxies e render por segmentos planejados. A RX 7600 não é presumida aceleradora do pipeline atual.

## Cinco etapas estruturais implementadas nesta rodada

| Marco | Estrutura entregue | O que ainda precisa de validação |
| --- | --- | --- |
| v0.6 — Recuperação | Snapshots locais imutáveis dos salvamentos, histórico de até 30 versões anteriores, restauração com backup, API, CLI e tela inicial | Restaurar projetos grandes e testar conflitos reais no Windows |
| v0.7 — Propostas do Codex | Codex gera proposta validada em arquivo local com revisão-base; prévia, aceitar/rejeitar pela tela inicial; transação com backup | Fluxo real ChatGPT Local → botão Revisar Codex; revisão detalhada de cada operação |
| v0.8 — Narração e legenda | Modelo de captions em frames, importação e exportação SRT, linha de legendas na timeline, sobreposição no Remotion, suporte a operações Codex | Reconhecimento automático de voz, waveform e ajuste de cenas à duração da narração |
| v0.9 — Evidências | Fontes por cena (afirmação, título, URL HTTPS, notas, status pendente/verificada/rejeitada); operações locais reversíveis | Pesquisa/licenciamento automático e confirmação factual por pessoa |
| v0.10 — Diagnóstico | Check de referências de mídia no disco, cenas factuais sem fonte, evidências não verificadas, áudio/legendas ausentes, resumo de ambiente Windows, API, CLI e painel | Ensaios de codecs, integridade do arquivo original, instalador autossuficiente |

Estas cinco etapas compõem a **base de produto**, não um editor finalizado. Evitamos novos efeitos/transições para priorizar consistência de dados, rastreabilidade e controle de alterações.

## Pipeline de trabalho esperado

1. Abra o Dark Studio e crie o projeto na tela inicial.
2. Use o Codex no ChatGPT Desktop em **Local** com permissão explícita ao diretório \`%USERPROFILE%\DarkStudio\projects\`.
3. O Codex lê o esquema, cria operações e usa \`npm run project -- propose <id> operacoes.json <revision>\`. O JSON do projeto não é alterado nesta etapa.
4. No Dark Studio, clique em **Revisar Codex**, confira a proposta e aprove ou descarte. Aprovação faz backup da versão anterior e aplica mudanças atômicas.
5. Para recuperar edições, use **Versões** no cartão do projeto. Para verificar arquivos e fontes, clique em **Diagnóstico**.
6. Para legendas, importe um SRT sincronizado no editor. A narração já pode ser inserida como mídia local, gerada por qualquer sintetizador offline/sem IA.
7. Gere MP4 pelo editor ou \`npm run project -- render <id>\`.

## Regras e limites

- Nunca publicar roteiro, áudio ou projeto pessoal no GitHub do código sem instrução explícita.
- Eventos de um SRT possuem timestamps, mas importar legendas **não transcreve áudio**.
- Fonte com status \`verified\` reflete declaração humana; o software não verifica sua veracidade automaticamente.
- Diagnóstico não garante exportação bem-sucedida nem integridade de todos os codecs.
- Propostas com revisão antiga não podem ser aprovadas por cima de alterações novas.
- Snapshots (até 30) são históricos locais pontuais, não backup geograficamente redundante.
- Arquivos de mídia continuam na biblioteca de mídia local, não embutidos no JSON.
- WebView2/Tauri, inicialização e renderização em vídeos longos ainda precisam ser testados no PC do usuário.
- Serviço 127.0.0.1 ainda experimental e sem autenticação forte de sessão; não expor na rede.
- Checar licenciamento Remotion antes de comercialização.


## v0.11 — piloto de montagem dinâmica (vertical slice, NÃO release profissional)

- **Compatibilidade**: Project v2 recebe \`visualMode: legacy|shots\`, \`shots\`, \`chapters\`, \`channelKit\` e \`clips[].volumeKeyframes\` com defaults. Documentários antigos continuam no modo cartões. Novos assets ficam somente no PC.
- **Motor visual**: novo \`ShotVisual\` com seis composições de demonstração, keyframes relativos ao plano (posição X/Y, escala, rotação, opacidade; easing) e mídia importada localmente (imagem/vídeo). Mesmo \`Documentary\` utilizado no Remotion Player e na exportação MP4.
- **Timeline editável**: trilho de planos com arrastar e bordas de corte, inspetor de tempos/keyframes/curvas, edição de legendas por texto/tempo, áudio com fades, pista SFX básica. Arrastar um plano **não desloca** narração/legendas (sem ripple automático).
- **Piloto de 30 segundos**: gerador \`npm run project -- pilot\` ou botão na home. Oito planos (3,2 a 5 s), três capítulos, locução offline usando voz Windows SAPI (se instalada), áudio WAV local de 900 frames e legendas correspondentes. Não cria dados de usuários no repositório público.
- **Identidade inicial**: marca, fontes de sistema, cor-base, estilo de legendas por projeto; estilos gráficos reutilizáveis. Ainda sem logos externos, vinhetas, templates completos ou thumbnail.
- **Teste automático**: TypeScript, Vitest, Vite, cargo check Windows, render curto legacy e smoke do piloto 30s com locução Windows; aprovação audiovisual/interativa **ainda depende de teste no Windows do usuário**, incluindo comparação prévia vs MP4 e uso de RAM.

Leia [docs/VIDEO_ARCHITECTURE.md](docs/VIDEO_ARCHITECTURE.md) e [docs/PILOT_30S.md](docs/PILOT_30S.md).

### Próximas prioridades depois de aprovar a vertical slice

1. **P0 — fechar critérios de aceite com projeto real**: ajustes de UX do drag/trimming, legibilidade, sincronia e desempenho de 30 segundos em 1080p no Ryzen 5 4600G/RX 7600/16GB; corrigir regressões do editor de cartões.
2. **P1 — som e timeline profissionais**: trimming arrastável de áudio, waveform, scrubbing, slip/slide, snap, crossfades, transições controláveis e salvamento de seleção/playhead; capítulo/cena/plano em hierarquia editável.
3. **P1 — render sustentável**: proxies, pré-render/cache por cena, renderização por trechos, validação de codecs, métricas reais de memória e sincronização A/V para 10–30 minutos.
4. **P1/P2 — biblioteca de composições e kit de canal**: presets nomeados, movimento de câmera em imagem/B-roll, parallax verdadeiro por camadas, gráficos baseados em fontes, mapas com dados locais, lower thirds, vinheta, encerramento e estilos de legenda por palavra.
5. **P2 — pipeline YouTube e distribuição**: arquivo de créditos/fonte/licença, biblioteca de assets reutilizáveis, editor de thumbnail, exportações 1080p/4K quando sustentáveis, capítulos e metadata para upload; Tauri com serviço embutido e instalador assinado.

**Não declarar estas cinco prioridades concluídas só porque a fatia piloto compila.**

## v0.12 — Automatização da direção investigativa (corte implementado no código, validação real pendente)

- Compila storyboard JSON de episódios para `replaceShots` em uma operação revisável, sem mover ou substituir áudio, legenda ou evidências.
- Fallback `auto-direct` fatia cenas e aproveita texto das legendas para gerar planos ilustrativos em cadência variável, normalmente 2–5 s; NÃO inventa informações.
- Templates editoriais vetoriais para dossiê, documento reconstruído, cadeia de evidências, gráfico, comparação, diagrama espacial e identificação; com motion/keyframes e fontes de evidência vinculadas.
- O usuário ajusta composição, conteúdo, dados, fontes, tempos e movimento no inspetor visual.
- Diagnóstico inclui buracos de cobertura, longos períodos estáticos, excesso de repetição, gráfico vazio e prova sem verificação humana; relatório de direção disponível na CLI.
- Preservação: `Project v2` continua válido; `shot.investigation` possui default para planos antigos. Projeto/voz/mídia não trafegam pelo GitHub.
- **Ainda falta** escuta/avaliação de um episódio real e do layout completo no Windows do usuário. Também faltam coleta/licenciamento de B-roll automático, síntese/transcrição confiável, parallax em múltiplas camadas, mapas geográficos, thumbnails e render 4K sustentável. Nenhuma dessas etapas foi declarada concluída.


## v0.13 — resposta ao diagnóstico real do Codex (etapas verificáveis)

Relatório recebido: projeto local de ~4m50, cinco capítulos, 60 legendas, 60 planos **ainda em proposta**, zero erros de cobertura e 27 avisos. O vídeo completo não foi exportado ou conferido. O usuário mantém a revisão final.

1. **P0 — compatibilidade em serviço e frontend: implementado em código.** Novo handshake versionado \`GET /health\` (\`apiProtocol=4\`), build, schema, PID, diretório, capacidades e data de inicialização. O cliente recusa serviço velho antes de ler projetos; o BAT usa supervisor que só reinicia processos reconhecidos do mesmo usuário. TESTE NO WINDOWS REAL AINDA OBRIGATÓRIO, incluindo BAT previamente corrigido pelo Codex que talvez esteja só no clone.
2. **P0 — visibilidade correta de projetos/propostas: implementado em código.** Projetos incompatíveis aparecem como aviso em vez de sumirem. Cartão exibe contagem de propostas; modal distingue projeto salvo (0 planos) de proposta visual (60 planos).
3. **P1 — fluxo resumível: implementação parcial.** \`production status\`, \`checkpoint\`, \`continue\` e painel **Produção** geram/checkpointam o estado por episódio; criação ilustrativa de proposta só é feita com roteiro, narração e legendas presentes e sem proposta anterior. Pesquisa, voz, legendas e B-roll não são gerados de forma autônoma por esse comando, e a revisão editorial não é omitida.
4. **P1 — render: implementação parcial.** Jobs têm estado e progresso persistidos por arquivo, com registro de PID, detecção de interrupção e histórico por projeto; o render não retoma um MP4 no frame interrompido. Próximo passo: segments, cache e checkpoints de frames.
5. **P1 — prova jornalística e QA: implementação parcial.** O esquema de evidência agora aceita trecho, data da fonte/acesso, região, unidade e direitos; a interface permite editar e o diagnóstico sinaliza gráficos com metadados incompletos. Ainda faltam comparador fonte/alegação lado a lado, verificação visual automática de contrastes/safe areas, prévias sonoras representativas e escuta integral. Não alegar 95% automático até comprovar esse fluxo num episódio real.

**Gate de aprovação:** CI TypeScript + unit + Windows smoke, depois testar sincronismo, serviços e episódio real no Windows com projetos reais; a CI não tem acesso a \`%USERPROFILE%\\DarkStudio\` do usuário.


## v0.14 — Estúdio de composições e personagens (vertical slice)

**Implementado no código (CI + aceite manual ainda são gates distintos):**
- 50 presets em seis bibliotecas editoriais, todos serializáveis como camadas vetoriais editáveis; podem ser aplicados pela galeria.
- Personagens 2D estilizados com gestos/expressões, ambientes gráficos 2D, biblioteca SVG de objetos, desenhos e efeitos procedurais por frames.
- Modelo de camadas \`shots[].layers[]\` com keyframes de posição, escala, rotação e opacidade, curva easing, tempo local e cue sincronizado com legenda. Camadas e duração editáveis no inspetor e timeline.
- Codex pode produzir cenas inéditas com \`direction.beats[].layers\` ou \`presetId\` sem gerar JavaScript de execução. Compatibilidade com Project v2 e fluxo de propostas existente.
- \`smoke:motion\` e \`preview:frames\` para testes de render representativo e cache de imagens locais por revisão.
- Auditorias básicas de camada gráfica com dado não verificado, muitos objetos e elementos potencialmente cortados. Diagnóstico automático não garante legibilidade real, pronunciamento, licenciamento nem áudio integral.

**Pendências reais (não concluir só pela CI):**
1. Testar galeria, arraste, cortes e reprodução no Ryzen 5 4600G/RX 7600/16 GB, junto aos episódios antigos e à proposta da casa própria. Comparar prévia e MP4.
2. Implementar waveform, scrubbing de áudio, alinhamento de fala real/por palavra, timing fonético de personagens e edição de legendas por palavra.
3. Criar sonoplastia local reutilizável e mixagem contextual com licenças registradas; imagens reais/stock só após origem, licença e cópia local autorizadas.
4. Evoluir depth/parallax para fotos segmentadas (sem falsificar documentos), cache de segmentos, proxies, re-render parcial e benchmarks de episódios de 5–30 minutos.
5. QA visual com OCR/comparação perceptual e reconhecimento de cortes/textos, editor de thumbnails e pipeline de publicação para YouTube. Sem atestado automático de veracidade.

A v0.14 não é uma ferramenta final de animação 3D/fotorrealismo. O Codex continua responsável por roteirizar, pesquisar e dirigir; o Dark Studio interpreta o plano visual determinístico e você revisa e aprova.
