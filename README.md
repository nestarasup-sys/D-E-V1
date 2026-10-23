# Dark Studio v0.2 — editor investigativo desktop, com agente externo

Editor experimental para documentários em Windows, com **Tauri 2 + React + TypeScript + Remotion + FFmpeg (via Remotion Renderer) + Codex SDK**. A interface e os clipes são editáveis manualmente; o agente Codex roda em um serviço Node separado em loopback e retorna apenas propostas validadas, que você aprova.

## Requisitos

- Windows 10/11, Node.js **22+**, Git e npm.
- Desktop: Rust/rustup, Microsoft C++ Build Tools com **Desktop development with C++** e WebView2. Consulte https://v2.tauri.app/start/prerequisites/.
- Renderização: Chromium pode ser baixado automaticamente pelo Remotion na primeira exportação. FFmpeg é usado internamente pelo Remotion Renderer; não é necessário instalar o FFmpeg separadamente para o fluxo de exportação deste MVP.
- Codex SDK requer sessão autenticada/credenciais configuradas no computador para gerar propostas.

## Rodar localmente

```powershell
git clone https://github.com/nestarasup-sys/D-E-V1.git
cd D-E-V1
npm install
npm run dev:agent
```

Em outro terminal:

```powershell
npm run dev:desktop
```

Para usar só a UI no navegador durante desenvolvimento, substitua o segundo comando por `npm run dev` e abra `http://127.0.0.1:1420`. **Importação de mídia e exportação MP4 exigem que `npm run dev:agent` esteja executando.** O agente não é iniciado automaticamente pelo instalador Tauri.

## Recursos v0.2

1. Importação de PNG/JPEG/WebP, MP4/WebM/MOV, MP3/WAV/M4A/OGG pela interface. Os arquivos são transmitidos em streaming para `~/DarkStudio/media` no Windows, sem incluir binários grandes no JSON ou no repositório. **Limite por arquivo: 512 MB**.
2. Biblioteca de mídia com identificação e metadados básicos. Arquivos são servidos por uma URL local com Range HTTP (necessário para buscar trechos de áudio/vídeo).
3. Timeline com trilhas **Cenas, Visual, Narração e Música**. Selecione clipes para ajustar início, duração, trim inicial e volume; clipes podem ser removidos. O projeto usa 30 FPS.
4. Preview com Remotion e sobreposição de imagens/vídeos. A trilha visual é exibida como fundo dos títulos de cena.
5. Exportação MP4 H.264 com Remotion Bundler/Renderer em **processo Node separado**, com progresso via painel do editor. Arquivos vão para `%USERPROFILE%/Videos/DarkStudio/`.
6. Histórico desfazer/refazer, importação/exportação de projeto JSON e migração de projetos `version:1` para `version:2` (inclui `assets` e `clips`).
7. Serviço Codex externo mantido: altera somente a cena selecionada após sua aprovação. Não possui autonomia para buscar imagens, editar arquivos ou modificar várias cenas.

### Fluxo sugerido de teste

1. Abra `npm run dev:agent` e confirme `http://127.0.0.1:4317/health`.
2. Abra o editor, clique em **Importar mídia**, escolha uma imagem JPG/PNG ou uma narração MP3.
3. Na biblioteca, escolha **+ Visual** ou **+ Narração**. Clique no clipe adicionado à timeline e ajuste início e duração no painel direito.
4. Verifique preview e áudio, depois clique em **Exportar MP4**. O serviço salvará um arquivo em Vídeos/DarkStudio; na primeira exportação pode precisar baixar Chromium.

## Persistência e segurança

- O JSON do projeto é salvo em `localStorage` e pode ser exportado. **Faça backup do JSON e da pasta `~/DarkStudio/media`**; apenas o JSON não carrega os arquivos originais para outro computador. Um projeto antigo v1 é migrado automaticamente ao abrir.
- O servidor abre só em `127.0.0.1:4317`, restringe Host/Origin, evita caminhos fornecidos pelo cliente ao servir assets, gera IDs UUID, impõe limite de 512 MB e valida projetos com Zod.
- Media URLs incluem IDs gerados pelo servidor; **não há autenticação por token**. A versão 0.2 é para uso local, não exponha essa porta na rede. Antes de distribuir comercialmente, adicionar tokens de sessão, proteção CSRF, verificação real de assinatura de arquivo, quotas totais, limpeza de cache e instalação segura do worker.
- O renderizador rejeita URLs externas no campo `scene.imageUrl` para reduzir requisições arbitrárias no processo de exportação. Não interprete as estatísticas de demonstração como fatos verificáveis.

## Limitações

- Ainda não há drag-and-drop de clipes, waveform, ripple-edit ou múltiplos clipes visuais com controle de z-index. A reordenação de cenas é bloqueada quando há clipes para preservar timestamps.
- O preview de alguns formatos MOV e codecs específicos depende do WebView2/Chromium; a importação do arquivo não garante decodificação. Os clipes importados podem falhar no render se o codec não for compatível.
- Vídeos inseridos na trilha Visual são reproduzidos **sem áudio**; narração e música estão em trilhas separadas.
- `durationFrames` de mídia é estimado pelo navegador quando possível. Ajuste o corte manualmente e revise o resultado.
- Render MP4 usa Remotion e Chromium num processo separado, com FFmpeg integrado. A exportação em Windows precisa de teste manual real: CI valida TypeScript, testes e build frontend, mas não faz render final nem compila instalador Tauri.
- Arquivos de mídia não são empacotados automaticamente no instalador Tauri; o Node e o agente precisam continuar executando em separado. Não é produto pronto para distribuição.

## Testes

```powershell
npm run check
npm test
npm run build
```

Documentação Remotion: https://www.remotion.dev/docs/renderer/render-media

> Verifique as condições de licença do Remotion para editores/automação antes de distribuir ou comercializar o Dark Studio.
