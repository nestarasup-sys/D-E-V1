# Dark Studio v0.16 — Cinco fundamentos adicionais

Esta versão amplia o Motion Engine v0.15, mantendo o formato `project.version = 2` e `direction.version = 1`. Os 50 presets e todos os projetos antigos continuam sendo lidos. Nenhum arquivo pessoal vai ao GitHub.

## 1. Personagens articulados

Em uma camada `kind:"character"`, use `rig` com `leftArm`, `rightArm` (-150° a 150°), `leftLeg`, `rightLeg` (-80° a 80°), `head` (-55° a 55°), `eyeX` (-15 a 15), `eyeY` (-12 a 12) e `smile` (-1 a 1). `rigKeys` aceita até 40 poses: `[{frame,pose,easing}]`. Os valores interpolam entre frames, no mesmo SVG da prévia/MP4. O inspetor permite editar os controles e as poses. Os movimentos procedurais existentes podem se somar às articulações. Isto é um rig 2D estilizado, **não** captura de movimento humana nem lip-sync de voz.

## 2. Gráficos econômicos

`chartType` agora inclui `waterfall` (saldo cumulativo), `cashflow` (fluxos positivos e negativos) e `counter` (total progressivo). `chartStages` permite até 12 etapas `[{frame,values,easing}]` para interpolar os valores durante um plano, conservando o comprimento de `values`. Gráficos com números **sempre exigem** `sourceEvidenceId` de evidência registrada: a licença da mídia não substitui a verificação de dados; uma fonte pendente gera aviso de revisão humana. Não são dados coletados automaticamente da internet.

## 3. Mídia e B-roll, direção inteligente com licença

A IA escreve `mediaPlan:{query,intendedUse,licenseNote}` em beats de `direction.json` para justificar o B-roll, mas precisa associar `assetId` de arquivo que o usuário importou antes de compilar uma direção de mídia. `framing:{fit,focusX,focusY,zoom,trimStartFrames}` permite enquadrar vídeo/imagem de plano inteiro ou imagens de camadas: foco X/Y em 0…100%, zoom 1…4 e `cover/contain`. A licença/atribuição fica em `assets[].rights` (`status` = `unknown`, `cleared`, `restricted`; `sourceUrl`, `creator`, `licenseName`, `attribution`, `notes`). O inspetor edita o crop; a biblioteca edita o status e os créditos; o relatório visual avisa quando não há confirmação.

**Não** há busca online, download ou identificação automática de direitos: a IA recomenda e combina arquivos **já importados**, e é o usuário quem confirma se pode publicar.

## 4. QA de frames reais (local)

Botão **Revisar frames renderizados (QA)** no editor, API local `POST /v1/qa/frames` e CLI `npm run project -- raster-qa UUID`. O serviço renderiza até oito intervalos do projeto, em PNG 480×270, capturando também frames adjacentes. Calcula diferenças entre pixels consecutivos, atividade nas bordas, variação da luminância, contraste aproximado em regiões de texto e geometria das caixas de camadas. Sinaliza riscos de mudança brusca, texto fora da tela, sobreposição e excesso de elementos.

**Limites:** amostragem parcial; sem OCR, sem detecção semântica de objetos nem promessa de detectar todo texto cortado. As medições são rastreáveis aos pixels renderizados, mas alguns alertas usam geometria. O MP4 e a revisão humana continuam essenciais.

## 5. Projeto audiovisual em um único `.darkstudio`

O formato é um **ZIP v1** com `manifest.json`, `project.json` e `media/<UUID>.<ext>` para todas as mídias cadastradas (imagens, vídeos, narração, músicas e SFX). Legendas temporizadas, evidências, fontes, direitos e demais dados estruturados já fazem parte de `project.json`. O manifesto guarda SHA-256, tamanho e tipo de cada mídia. O limite deste primeiro formato é **512 MB e 250 mídias** por pacote para evitar exceder memória ao compactar/descompactar.

O botão **Exportar .darkstudio** no editor empacota os bytes **locais** do projeto aberto. No dashboard, **Importar JSON / .darkstudio** importa um pacote; a API cria IDs novos para as mídias e reconecta clipes, imagens de cena, planos e camadas. Arquivos existentes não são sobrescritos; falhas descartam mídias de uma importação parcial. A importação rejeita arquivos de ZIP fora da estrutura, mídia ausente, dados com hash divergente, referências incompletas e conteúdo descompactado excessivo.

Também há comandos: `npm run project -- pack UUID caminho.darkstudio` e `npm run project -- unpack caminho.darkstudio` (o `unpack` usa o serviço local, que deve estar iniciado). Sem internet, sem upload e sem acesso direto a caminhos do usuário vindos do ZIP.

**Atenção:** referências de fontes instaladas no Windows continuam dependentes da máquina de destino; o pacote não contém arquivos de fonte licenciados. Imagens de cena fora da biblioteca local podem depender de links externos: substitua por mídias importadas para um pacote totalmente autossuficiente.

## Fluxo completo com outra IA

1. Consulte o [Guia Studio Dark atualizado à v0.18](GUIA_STUDIO_DARK.md), fontes e mídias já importadas.
2. A IA prepara **um `direction.json`** com rigs, gráficos vinculados a evidências e escolhas de B-roll com `assetId` e licença a conferir.
3. Com a revisão do projeto, execute `npm run project -- direct UUID direcao.json REVISAO` e **Revisar Codex**. A direção nunca troca narração/legendas silenciosamente.
4. Veja a composição no editor; rode QA raster, corrija e confirme licenças/dados.
5. Exporte MP4 ou `.darkstudio`, este último incluindo projeto e mídias do computador em um só arquivo.

Os limites aqui são intencionais: um arquivo com todos os assets não equivale a uma fonte legal para publicar B-roll, nem a QA automática certificada por visão computacional.
