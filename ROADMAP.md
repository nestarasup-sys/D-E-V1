# Dark Studio — Roadmap oficial

> Documento único de planejamento, atualizado em 23 de outubro de 2026. **Somente branch main.**

## Visão ajustada conforme o criador

O Dark Studio é o **editor**, com página inicial de projetos, timeline, biblioteca de mídia e exportação. O Codex/ChatGPT é o **diretor externo**: recebe roteiros e instruções no ChatGPT, e modifica o arquivo de projeto (quando tem acesso explícito ao workspace) ou entrega JSON para importação. **O Dark Studio não tem chat de IA embutido.**

### PC de referência

Windows 11, Ryzen 5 4600G, AMD RX 7600, 16 GB RAM. Preview 1080p/30 FPS, concurrency 1 no render H.264, proxies planejados. Aceleração RX 7600 ainda não validada.

## Marcos

| Marco | Estado | Objetivo |
| --- | --- | --- |
| v0.1 | Base implementada; sem teste pessoal | Cenas, timeline simples e Remotion |
| v0.2 | Implementada; teste pessoal pendente | Biblioteca de mídia, multitrilha, export MP4 |
| v0.2.1 | CI Windows e MP4 smoke aprovados | Compilação Tauri + renderização curta real |
| v0.3 | Substituída na UX | Propostas multicena em chat embutido descartadas conforme nova preferência |
| **v0.4** | **Em validação** | Página inicial, projetos em disco, CLI de operações para Codex externo, import/export e detecção de mudanças |
| **v0.5** | **Implementada, validação com GitHub pessoal pendente** | Ponte de sincronização GitHub privado; opt-in por projeto; validação de privacidade; pull/push JSON; conflitos sem sobrescrever |
| v0.6 | Planejada | Transcrição/timestamps, waveform, sincronização de cenas; transporte privado de mídia via consentimento futuro |
| v0.7 | Planejada | Evidências, pesquisa visual e licenças; previews/proxies |
| v1.0 | Dependente de testes reais | Instalador, segurança local, backups, robustez em vídeos longos |

## Princípios

- O Codex só acessa projetos locais se tiver acesso concedido ao filesystem Windows; a instância remota no ChatGPT depende de exportação/importação ou sincronização explicitamente configurada.
- JSON de projeto segue src/model/project.ts; ações validadas em src/model/operations.ts.
- Alteração externa detectada no editor sem apagar trabalho manual pendente; HTTP 409 em versão obsoleta.
- **Nenhum dado investigativo vai ao repositório público de código.** JSON só vai ao repositório privado após conexão autorizada e opt-in explícito por projeto; mídia nunca é sincronizada na v0.5.
- Antes de declarar uso produtivo, testar o aplicativo no Windows 11 do criador com material real, desempenho e mídia.
- Remotion/FFmpeg no serviço local; futuramente distribuir o worker com autenticação local e instalador.
- Não inventar fatos, documentos ou direitos de mídia.
- Conflitos entre Codex e editor não fazem merge automático. O usuário revisa e resolve separadamente.
