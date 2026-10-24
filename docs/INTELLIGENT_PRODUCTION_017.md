# Dark Studio v0.17 — Intelligent Production

Mantém projeto JSON v2, direção JSON v1, revisões Codex e os 50 presets anteriores. Não executa scripts enviados pela IA. Tudo permanece no computador do usuário.

## OCR local em português e revisão visual

O botão **Revisar frames renderizados (QA)** aciona o mesmo Remotion usado pela prévia/MP4. A amostragem agora privilegia inícios/fins de planos, transições, pontos da câmera, keyframes de elementos e intervalos médios, até 96 PNGs reduzidos (480×270). Até 24 frames estratégicos passam pelo **Tesseract.js com português (por.traineddata.gz) incluído como dependência NPM local**, sem API externa, CDN nem download na hora de analisar. Os frames restantes recebem métricas reais de luminância, diferença entre pixels e atividade nas bordas.

O OCR reconhece texto e caixas de palavras. Os alertas indicam o segundo com precisão de frame (`frame/30`) e **sugestão de correção**, incluindo palavras possivelmente cortadas na borda, baixa confiança, regiões de texto não reconhecidas, palavras sobrepostas, contrastes fracos, excesso de informação e saltos visuais. Algumas verificações continuam geométricas (posição da camada e intersecção de caixas) porque pixels não garantem interpretação editorial correta.

**Limites técnicos honestos:** o OCR pode errar, especialmente com animações, fontes especiais, texto curvo, imagens pouco nítidas e legendas que mudam dentro do frame. Não inspeciona necessariamente todos os frames de vídeos longos e não certifica ausência de erro. O relatório inclui `ocr.status`, `framesAnalyzed`, texto/caixas reconhecidas e eventuais falhas do motor, sem disfarçar indisponibilidade.

## .darkstudio ZIP64 grande, streaming e retomável

Novo formato **ZIP v2**, com `project.json`, `manifest.json` e `media/<id>.<ext>` para narração, música, SFX, B-roll e fontes autorizadas. O manifesto inclui SHA-256, tamanho, MIME, tipo e ID de cada arquivo. O writer **yazl** transmite os arquivos diretamente do disco ao ZIP temporário (sem agrupar os vídeos em RAM); o leitor **yauzl** percorre um arquivo de cada vez com validação de tamanho, hash e caminho.

**Limites de segurança v2:** até **64 GiB por pacote**, **16 GiB por mídia** e **12.000 mídias**, limitados também pelo espaço em disco. Esses são limites deliberados, bem maiores que os anteriores 512 MB / 250 mídias. O servidor impede caminhos como `../`, entradas inesperadas, duplicatas, conteúdo inflado excessivo, mídia ausente e hashes inválidos. A importação é preparada em diretório temporário e, só após validação, recebe IDs novos. Em falhas, entradas temporárias e mídias importadas parcialmente são descartadas; projetos existentes não são sobrescritos.

No editor, **Exportar .darkstudio** prepara o ZIP em disco e oferece URL de download local com **HTTP Range** para retomar um download interrompido. O dashboard importa o pacote em blocos de até **8 MiB** usando `POST /v1/archive/uploads`, `PUT /v1/archive/uploads/:id` com offset e `POST /v1/archive/uploads/:id/complete`. Se a transmissão cair, selecione novamente o mesmo arquivo e o cliente consulta o byte salvo para continuar. As sessões parciais sobrevivem a reinícios do app e expiram em **sete dias**. Esses mecanismos não equivalem a salvar parcialmente um projeto corrompido: a importação só é aceita depois de hash/manifesto validados.

Rotas locais: `POST /v1/archive/prepare`, `GET /v1/archive/download/:id`, `POST /v1/archive/import` (arquivo inteiro em streaming), rotas de uploads descritas acima. CLI: `npm run project -- pack UUID caminho.darkstudio` e `npm run project -- unpack caminho.darkstudio`. Pacotes ZIP v1 existentes continuam aceitos na importação de até 512 MB. Para portátil completo, imagens de cena devem estar na biblioteca de mídia, não apontar para URL externa.

## Fontes incorporadas (quando autorizadas)

A biblioteca agora aceita **WOFF2, WOFF, TTF e OTF**, identificados como `kind:"font"`. O upload verifica a assinatura binária da fonte e armazena os bytes localmente. No editor, em **Tipografia**, selecione a fonte importada em vez de digitar o nome. O projeto usa família determinística `DSFont-<UUID>`; a prévia e o MP4 injetam a mesma regra `@font-face` com URL do serviço local e aguardam o carregamento da fonte via Remotion antes de renderizar.

É possível utilizar uma fonte importada **localmente**, mesmo quando não pode ser redistribuída. Para incluí-la no `.darkstudio`, o usuário precisa registrar **nome da licença** e marcar explicitamente **Tenho autorização para redistribuir esta fonte**. A exportação bloqueia a inclusão se não houver essas informações; nunca marca a permissão automaticamente. Após a importação em outro computador, o ID da fonte muda e o projeto reconecta as referências `DSFont-<UUID>` nos elementos de texto. Caso queira usar fonte de sistema sem empacotá-la, pode manter o nome manualmente, mas a aparência poderá diferir em outra máquina.

**Nunca baixar ou distribuir fontes comerciais protegidas automaticamente.** Um checkbox registra declaração humana, não substitui consulta à licença legal.

## Como testar

1. `npm run check` e `npm test`.
2. `npm run smoke:advanced` para renderização/inspeção de frames em Windows; o motor OCR português usa arquivos empacotados via npm.
3. Use uma fonte própria WOFF2/TTF e um projeto com mídia grande; exporte/importa `.darkstudio`, confirme o hash e as referências na nova máquina.
4. Interrompa um upload no meio e reenvie o mesmo arquivo; o dashboard deve retomar do offset salvo.
5. Inspecione o MP4 final e corrija alertas OCR/visuais quando procedentes.
