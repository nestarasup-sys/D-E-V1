# Dark Studio v0.1 — editor investigativo com IA externa

Aplicativo desktop experimental (Tauri 2 + React + TypeScript + Remotion) com timeline básica e painel para solicitar **propostas de edição** ao Codex, executado em um processo Node local e separado da interface. O Codex **não** recebe acesso de escrita ao projeto: devolve uma proposta JSON, validada e aplicada pelo editor somente após aprovação.

## Requisitos (Windows)

- Node.js 22 LTS ou superior, npm e Git.
- Para o aplicativo desktop: Rust via rustup, Microsoft C++ Build Tools (Desktop development with C++) e WebView2, conforme os [pré-requisitos Tauri](https://v2.tauri.app/start/prerequisites/).
- Para os comandos de IA: acesso ao Codex autenticado no computador (consulte [Codex SDK](https://github.com/openai/codex/tree/main/sdk/typescript)). A execução pode ter custos ou exigir acesso à sua conta.

## Instalação e execução

```powershell
git clone https://github.com/nestarasup-sys/D-E-V1.git
cd D-E-V1
npm install
npm run dev:desktop
```

Abra **um segundo terminal** na mesma pasta e execute:

```powershell
npm run dev:agent
```

O editor abre em uma janela Windows via Tauri. No modo de desenvolvimento web, rode `npm run dev` e abra `http://127.0.0.1:1420`. O app continua editável sem serviço de IA. O serviço Codex atende somente em `127.0.0.1:4317`.

Se a autenticação do Codex não estiver pronta, abra o Codex CLI ou o aplicativo Codex e entre com sua conta. O serviço retorna um erro visível no editor quando não consegue executar a solicitação.

## O que funciona nesta versão

- Criar, selecionar, reorganizar e excluir cenas; editar título, texto, duração, tipo, cores e URL de imagem.
- Preview animado em 1920×1080/30 FPS com Remotion Player.
- Timeline visual simples (ainda sem drag-and-drop ou áudio).
- Desfazer/refazer, persistência no armazenamento local e importação/exportação de projetos JSON.
- Painel de edição por linguagem natural: envia a cena selecionada ao processo externo Codex, recebe uma **proposta** e só aplica após clique em **Aplicar mudança**.
- Operações validadas por Zod, com testes.

## Limitações honestas (v0.1)

- **Ainda não** exporta MP4; o pipeline FFmpeg e exportação serão implementados em um marco posterior.
- **Ainda não** coleta imagens, cria narração, sincroniza áudio, busca notícias ou verifica automaticamente fontes.
- O agente **não edita múltiplas cenas nem cria vídeos completos** ainda: produz alterações para a cena selecionada.
- O servidor de desenvolvimento do agente é iniciado em um terminal separado. Ele **não é empacotado** com o instalador Tauri nesta versão.
- Imagens de fundo são URLs públicas HTTPS; importar arquivos de mídia locais requer implementação adicional e uma biblioteca de assets.
- Não publique estatísticas de demonstração como fatos reais. Verifique fontes, direitos e licenças das imagens.

## Arquitetura

```text
src/             Interface React, schema, operações, Zustand e Remotion Player
apps/agent/src/  Processo Node local; Codex SDK em sandbox somente-leitura
src-tauri/       Shell desktop Tauri 2, permissões mínimas
```

O servidor só aceita conexões locais e origens de desenvolvimento/Tauri conhecidas. Isto é um esqueleto inicial, não uma solução completa de segurança para uma distribuição comercial. Antes de empacotar um agente local, implementar autenticação local, limites, atualização segura e tratamento de permissões.

## Testes

```powershell
npm run check
npm test
npm run build
```

Para testar o serviço sem Codex: `http://127.0.0.1:4317/health` deve retornar `{ "status": "ready", "mode": "external-codex" }`.

## Próximos marcos

1. Cache, importação local de vídeos/imagens/narração e biblioteca de evidências.
2. Timeline multifaixa e sincronização precisa entre vídeo e áudio.
3. FFmpeg como processo independente e exportação MP4.
4. Ferramentas de agente multi-cena, propostas em lote, histórico e revisões automáticas.

> Atenção às condições da licença comercial do Remotion antes de comercializar ou distribuir amplamente este editor.