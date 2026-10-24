# Piloto audiovisual de 30 segundos — Dark Studio v0.11

**Objetivo**: experimentar uma montagem verdadeira, com 8 planos independentes de 3,2 a 5 segundos, narração sintetizada por voz de sistema do Windows, 8 legendas no tempo da fala, quadro-chave para zoom, pan, rotação e opacidade, e um único renderizador para prévia e MP4. Isto é um **piloto de engenharia**, não uma sequência final para publicar.

## Pré-requisitos no PC do usuário

- Windows 11; serviço \`npm run dev:service\` aberto e editor desktop iniciado.
- Voz TTS instalada no Windows com motor \`System.Speech\` acessível pelo Windows PowerShell 5.1 (pode precisar instalar uma voz em Configurações > Hora e idioma > Fala).
- Ao abrir o Dark Studio, clique **▶ Criar piloto audiovisual 30s** na página inicial. Ele não altera ou converte outros projetos.
- Alternativamente peça ao Codex LOCAL no chat: "Execute \`npm run project -- pilot\` no diretório D-E-V1, com serviço local ativo, e abra o projeto gerado no Dark Studio".

**Se o Windows não tiver uma voz SAPI compatível, a geração interrompe e mostra o erro. Não cria um piloto fingindo ter locução.** Não requer API externa, Codex na nuvem nem serviços de geração de voz com IA. A síntese local usa somente a voz instalada no sistema; pode não ser português dependendo do Windows.

## Como o piloto foi construído

O gerador é \`src/model/pilot.ts\`. O serviço \`apps/agent/src/pilot-audio.ts\` executa \`scripts/pilot-voice.ps1\` para sintetizar oito frases curtas separadamente a 16 kHz/mono/PCM, mede suas durações reais e as posiciona no WAV final **exatamente nos quadros de cada plano**, preenchendo as pausas com silêncio. Se a fala excede o plano, tenta uma velocidade maior e, se ainda assim não couber, bloqueia a criação.

O WAV de 30s e o projeto são salvos **apenas no computador do usuário**. O projeto tem 3 cenas, 3 títulos de capítulos, 8 planos gráficos, 8 trechos de legenda sincronizados com a duração da fala, 1 clip de narração e um kit visual de exemplo ("ARQUIVO ABERTO"). Nenhuma estatística do piloto afirma ser um dado factual.

| Plano | Tempo | Composição |
| --- | --- | --- |
| 1 | 0,0–3,2 s | Gancho / capítulo |
| 2 | 3,2–6,7 s | Tela dividida |
| 3 | 6,7–10,3 s | Título / detalhe |
| 4 | 10,3–13,5 s | Número de referência de ritmo |
| 5 | 13,5–17,1 s | Linha visual temporal |
| 6 | 17,1–20,8 s | Citação / evidência |
| 7 | 20,8–25,0 s | Respiro / tela dividida |
| 8 | 25,0–30,0 s | Fechamento / capítulo |

## Critérios objetivos (gate)

- [ ] Abrir no **Windows do usuário** e escutar a voz inteligível em todo o trecho (CI sozinho NÃO testa a placa de áudio).
- [ ] Arrastar um plano no trilho PLANOS VISUAIS e ver o início mudar; arrastar as alças para ajustar a duração. Exemplo: deslocar o plano 2 sem mover WAV nem legendas (overlaps visuais são permitidos, com camadas zIndex; confira manualmente).
- [ ] No inspetor, editar início, duração e o **frame/valor/curva** de um keyframe; conferir zoom, posição, rotação e opacidade na prévia.
- [ ] Selecionar uma legenda na trilha LEGENDAS e alterar texto/início/fim, sem mover a narração. Observar a edição no preview.
- [ ] Exportar MP4 pelo editor e conferir visual+fala+legendas no arquivo final. Comparar os cortes e o timing com a prévia.
- [ ] Retornar à página de projetos e abrir um documentário anterior: o modo \`legacy\` mantém a composição antiga.
- [ ] Conferir uso de RAM e resposta ao arrastar no Ryzen 5 4600G, RX 7600, 16 GB. Caso haja travamento, coletar registros antes de ajustar concorrência/proxies.

## CI automatizada e limitações

- \`npm run check && npm test && npm run build\`: schema antigo vs novo, keyframes, operação de plano sem alterar áudio/legenda, validação, preview/props.
- \`npm run smoke:pilot\` (Windows): tenta sintetizar locução pelo mesmo motor SAPI, renderiza oito frames amostrais, verifica variação visual e exporta 900 frames em MP4 H.264 com trilha de áudio. O teste usa resolução reduzida 640×360 para proteger recursos da CI; a saída de produção continua 1920×1080.
- \`npm run smoke:render\`: continua garantindo retrocompatibilidade da composição antiga.
- CI só prova caminhos automatizados; **não há acesso ao projeto real ou à prévia interativa do usuário**, portanto esses requisitos permanecem pendentes até revisão manual.
- Sem render por segmentos, proxies, waveform, mapa completo, arrasto de áudio, editor de transições ou thumbnail automático nesta entrega. Veja o plano arquitetural [VIDEO_ARCHITECTURE.md](VIDEO_ARCHITECTURE.md).

## Segurança, migração e GitHub

Projeto existente fica em \`%USERPROFILE%\DarkStudio\projects\<UUID>\project.json\` e continua \`version:2, visualMode:'legacy'\` na leitura (campo novo tem default). Não usar reset/clean de Git em pastas de projetos. \`shots[]\`, \`chapters[]\`, \`channelKit\` e \`volumeKeyframes\` têm defaults; backups locais e revisão SHA256 continuam ativos.

O repositório GitHub contém **somente o código e o gerador**: não faz upload do WAV, MP4 ou dados de usuários. O Codex continua sendo um chat externo no aplicativo ChatGPT executando comandos locais autorizados.
