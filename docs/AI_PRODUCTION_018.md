# Dark Studio v0.18 — AI Production Engine (primeira etapa integrada)

O objetivo do Dark Studio v0.18 é **receber um JSON escrito por ChatGPT, gerar voz real no próprio programa, organizar a timeline, abrir a prévia e exportar MP4** sem exigir Codex nem comandos no terminal. A arquitetura aproveita o renderizador, a biblioteca de mídia, a QA raster e os pacotes .darkstudio v0.17.

## Formatos reconhecidos pelo botão de importação

- **`darkstudio-production` v1:** novo JSON declarativo para uma produção IA, incluindo roteiro, direção visual e narração, sem UUIDs internos. Exemplo [PRODUCAO_018.example.json](examples/PRODUCAO_018.example.json). O servidor gera a voz real (SAPI instalado no Windows) **antes de salvar**, mede o WAV e monta cenas editáveis, planos, camadas e legendas no projeto v2.
- **`project.json` v2:** continua aceito, incluindo projetos antigos, mídia e clipes já cadastrados no computador.
- **`.darkstudio` ZIP:** contém projeto com bytes de narração, imagens e demais mídias, para mover ou fazer backup. Não depende de gerar voz novamente ao importar.

Se a produção JSON pedir voz e o Windows não fornecer motor/voz válida, a importação **falha com mensagem**; o aplicativo não cria um vídeo silencioso fingindo ter gerado narração.

## AI-friendly JSON

O objeto raiz aceita `format:"darkstudio-production"`, `version:1`, `title`, `voice`, `brand` e `beats[]`. Cada beat combina as propriedades de uma direção autoral v0.17, **sem precisar de `startFrame` e `durationFrames` absolutos**, mais:

- `narration`: texto real a ser sintetizado com até 1600 caracteres.
- `plannedFrames`: estimativa inicial de 15–1800 frames, que orienta a geometria, keyframes e duração relativa de camadas. **Não** controla a duração final.
- `broll` opcional: `{query,description,purpose,provider:"pexels"|"manual",licenseNote}` representa uma pesquisa pendente; **não** gera um vídeo real nem declara licença aprovada.

Os beats podem criar textos, personagens, gráficos com evidência, formas, SVG, câmera por pontos, efeitos, grupos e transições com os mesmos campos validados do Motion Engine. A montagem usa `compileDirection`, que opera sobre os componentes editáveis existentes. Limite inicial: 200 blocos, 60 segundos por bloco depois da voz. Blocos maiores devem ser divididos.

## TTS Windows e sincronização

`voice:{engine:"windows-sapi",voice:"",rate:1,pauseMs:350}` configura a voz. Nome vazio prefere uma voz instalada **pt-BR**; o painel oferece listar e escolher as vozes SAPI existentes. A velocidade varia de -10 a 10 e as pausas entre falas de 0–2500 ms.

A aplicação gera **um WAV PCM 16 kHz, 16 bits, mono por bloco**, obtém a duração em amostras reais e converte a frames (30 FPS). Em seguida cria um clipe real na trilha de narração, uma legenda com o texto do bloco e um plano visual na timeline, acrescentando a pausa entre cenas. Keyframes e camadas planejados são convertidos ao novo comprimento por bloco, evitando uma dilatação global indiscriminada. **Ainda não há alinhamento acústico por palavra:** as legendas são precisas por trecho, não por palavra; não se deve afirmar sincronização fonética perfeita.

No editor, **Regenerar voz e sincronização** oferece selecionar voz, velocidade e pausa, gera novos WAVs, preserva IDs de cenas e camadas ao ressincronizar e não sobrescreve arquivos locais antigos. O salvamento utiliza a revisão esperada para bloquear edições concorrentes. É necessário revisar visualmente cortes, movimentos e trilhas depois da troca de voz.

## Smart B-roll — etapa inicial

O JSON pode planejar B-roll vinculado a um bloco narrativo. **O pedido começa como pendência e usa a composição procedural fornecida como fallback.** No editor, painel **Smart B-roll**, informe a chave Pexels API (ou configure `PEXELS_API_KEY` no serviço local) e pesquise o assunto. O programa acessa apenas o endpoint oficial `GET https://api.pexels.com/v1/videos/search`, lista candidatos com autor, duração, prévia, página original e link de licença. Depois da **confirmação humana** da licença, o serviço verifica o ID na API oficial, baixa o MP4 selecionado via HTTPS autorizado (limite 256 MB) e cadastra origem/autor/atribuição. Com um plano selecionado, o vídeo é associado ao plano e as camadas animadas permanecem sobrepostas. Sem chave, resultados adequados ou autorização, **não** substitui a composição por filmagem arbitrária. Direitos continuam em `assets[].rights`, sem afirmar verificação jurídica automática.

## Diagnóstico e segurança

- `POST /v1/productions/validate`: valida o JSON e retorna erros com caminho (`beats.0.narration`, por exemplo), descrição e sugestão, sem criar projeto nem mídia.
- `GET /v1/productions/voices`: enumera as vozes SAPI do computador.
- `POST /v1/productions/import`: geração de voz e compilação de produção, criando **novo projeto** sem substituir um existente.
- `POST /v1/productions/:id/regenerate`: requer revisão HTTP `If-Match` para ressincronizar após nova voz.
- **Sem JavaScript, HTML, SSML arbitrário ou comandos do JSON**: apenas campos tipados pelo Zod, texto convertido em dados para o sintetizador SAPI e geração de arquivos no diretório local do Dark Studio.

## Estado honesto desta versão

Esta etapa resolve o bloqueio básico **JSON sem WAV → voz real → áudio na timeline**. Ainda não contempla seleção totalmente autônoma de todo B-roll, verificação jurídica de direitos por IA, precisão fonética por palavra, sincronização semanticamente inteligente de SFX/música por palavra, cache incremental de documentários extensos ou editor universal de todos os atributos do JSON. Os exemplos e o guia descrevem esses limites sem tratá-los como implementados.

Consulte também as [diretrizes da API Pexels](https://www.pexels.com/api/documentation/) e [licença Pexels](https://www.pexels.com/license/). Esta integração requer chave do usuário, usa os resultados oficiais e apresenta os créditos do fornecedor.
