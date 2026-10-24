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

A aplicação gera **um WAV PCM 16 kHz, 16 bits, mono por bloco**, obtém a duração em amostras reais e converte a frames (30 FPS). Em seguida cria um clipe real na trilha de narração, uma legenda com o texto do bloco e um plano visual na timeline, acrescentando a pausa entre cenas. Keyframes e camadas planejados são convertidos ao novo comprimento por bloco, evitando uma dilatação global indiscriminada. **O alinhamento por palavra utiliza eventos SAPI quando a voz suporta essa informação; em outros casos permanece por frase:** as legendas são precisas por trecho, não por palavra; não se deve afirmar sincronização fonética perfeita.

No editor, **Regenerar voz e sincronização** oferece selecionar voz, velocidade e pausa, gera novos WAVs, preserva IDs de cenas e camadas ao ressincronizar e não sobrescreve arquivos locais antigos. O salvamento utiliza a revisão esperada para bloquear edições concorrentes. É necessário revisar visualmente cortes, movimentos e trilhas depois da troca de voz.

## Smart B-roll — etapa inicial

O JSON pode planejar B-roll vinculado a um bloco narrativo. **O pedido começa como pendência e usa a composição procedural fornecida como fallback.** No editor, painel **Smart B-roll**, informe a chave Pexels API (ou configure `PEXELS_API_KEY` no serviço local) e pesquise o assunto. O programa acessa apenas o endpoint oficial `GET https://api.pexels.com/v1/videos/search`, lista candidatos com autor, duração, prévia, página original e link de licença. Depois da **confirmação humana** da licença, o serviço verifica o ID na API oficial, baixa o MP4 selecionado via HTTPS autorizado (limite 256 MB) e cadastra origem/autor/atribuição. Com um plano selecionado, o vídeo é associado ao plano e as camadas animadas permanecem sobrepostas. Sem chave, resultados adequados ou autorização, **não** substitui a composição por filmagem arbitrária. Direitos continuam em `assets[].rights`, sem afirmar verificação jurídica automática.

## Diagnóstico e segurança

- `POST /v1/productions/validate`: valida o JSON e retorna erros com caminho (`beats.0.narration`, por exemplo), descrição e sugestão, sem criar projeto nem mídia.
- `GET /v1/productions/voices`: enumera as vozes SAPI do computador.
- `POST /v1/productions/import`: geração de voz e compilação de produção, criando **novo projeto** sem substituir um existente.
- `POST /v1/productions/:id/regenerate`: requer revisão HTTP `If-Match` para ressincronizar após nova voz.
- **Sem JavaScript, HTML, SSML arbitrário ou comandos do JSON**: apenas campos tipados pelo Zod, texto convertido em dados para o sintetizador SAPI e geração de arquivos no diretório local do Dark Studio.


## Conclusão da trilha v0.18 — alinhamento real, som semântico e B-roll automático conservador

**Alinhamento acústico real:** `scripts/tts-production.ps1` utiliza os eventos nativos `SpeechSynthesizer.SpeakProgress`. A posição de cada palavra e o timestamp em milissegundos são gravados por WAV, convertidos para quadros de 30 FPS e colocados em `captions[].words[]`. A prévia e o MP4 realçam a palavra no quadro detectado. O JSON agora permite em cada camada `wordCue:{word,occurrence?,offsetFrames?}` para aparecer no instante da palavra. Ao trocar a voz, os timestamps e os gatilhos são recalculados. **Se a voz não entregar eventos completos, a frase continua legendada e o áudio continua correto, mas os gatilhos por palavra são omitidos e a situação fica registrada como `wordAlignment:"unavailable"`; não há sincronização inventada.** Nem todas as vozes SAPI fornecem eventos suficientemente precisos.

**Áudio semântico:** `soundDesign:"auto"|"explicit"|"off"` (padrão `auto`). O modo `auto` gera fundos musicais procedurais discretos por bloco e pode adicionar efeitos de um vocabulário limitado quando detecta palavras como "salário", "dinheiro" ou "contas" com tempo acústico real. `explicit` utiliza somente o `music:{mood,volume,ducking}` e `soundEffects:[{sound,word,occurrence?,offsetFrames?,volume?}]` fornecidos no JSON. `off` desliga síntese. Moods: `documentary`, `tension`, `hope`, `calm`. Sons: `soft-whoosh`, `page-turn`, `document-click`, `ambient-pulse`, `positive-chime`, `keyboard-tap`, `transition-sweep`, `notification-soft`, `impact-low`. Músicas e efeitos são WAVs **originais locais**, editáveis nas trilhas `music` e `sfx`, incorporáveis ao `.darkstudio`; a trilha automaticamente baixa o volume na presença de locução. Ao regenerar a voz, a trilha procedural é reconstruída e os efeitos são reposicionados na nova palavra; outros clipes do usuário continuam separados.

**B-roll automático com consentimento:** o painel **Smart B-roll** pode pesquisar até 10 pedidos pendentes por lote com a chave da API Pexels. O usuário deve marcar a autorização explícita de uso do catálogo. A classificação conservadora usa coincidência lexical no **título/slug fornecido pelo Pexels**, duração suficiente, resolução 16:9, dados do autor e termos oficiais do fornecedor. Só seleciona quando a confiança supera **0,77**, baixa via HTTPS permitido, guarda página, criador, licença, atribuição e revisão pendente e vincula o MP4 à cena, mantendo as camadas animadas. Se os metadados não sustentarem a relevância, mantém a **animação procedural** sem inventar um resultado. Filmagens selecionadas automaticamente permanecem com status de direitos **desconhecidos/pendentes** até revisão editorial, pois metadados de catálogo não comprovam retratos, marcas, terceiros ou adequação visual. Não há inferência visual por visão computacional neste seletor: o escore é conservador e explicitamente baseado em metadados.

Rotas adicionais: `POST /v1/broll/auto` requer `query`, `expectedSeconds`, `allowAutomaticSelection:true`, `licenseConfirmed:true`; pode retornar `status:"pending"` com justificativa, sem importar nada. `POST /v1/broll/import` continua para escolha manual. `POST /v1/productions/import` e `.../regenerate` retornam `alignment[]` e `soundtrackWarnings[]`.

### Limites remanescentes de qualidade

Alinhamento por fala real não é uma transcrição/forced aligner para vídeos pré-gravados nem equivale a reconhecimento fonético de qualquer voz externa. O som procedural não equivale a uma biblioteca licenciada de música orquestral e o dicionário semântico deve ser ampliado editorialmente. A verificação da Pexels continua condicionada aos termos atuais do fornecedor e à inspeção humana quando necessário. A pesquisa automática não assegura que os pixels mostrem realmente a cena desejada, por isso usa um limiar rígido e mantém o fallback.

## Estado honesto desta versão

Esta etapa resolve o bloqueio básico **JSON sem WAV → voz real → áudio na timeline**. Ainda não garante seleção perfeita de todo B-roll, verificação jurídica de direitos por IA, precisão fonética universal em vozes não-SAPI ou material pré-gravado, cache incremental de documentários extensos ou editor universal de todos os atributos do JSON. Os exemplos e o guia descrevem esses limites sem tratá-los como implementados.

Consulte também as [diretrizes da API Pexels](https://www.pexels.com/api/documentation/) e [licença Pexels](https://www.pexels.com/license/). Esta integração requer chave do usuário, usa os resultados oficiais e apresenta os créditos do fornecedor.

**Empacotamento responsável:** filmagens vindas do Pexels com licença ainda pendente são impedidas de entrar no novo arquivo `.darkstudio` de exportação. Uma revisão humana precisa alterar explicitamente `rights.status` para `cleared`. Pacotes anteriores ainda podem ser importados sem mudar automaticamente os direitos. O teste Windows v0.18 agora exporta um MP4 real do projeto recém-montado com WAV, SFX e música, além de conferir o cabeçalho do arquivo produzido.
