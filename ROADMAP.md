# Dark Studio — Roadmap oficial (único)

Atualizado em 23 de outubro de 2026. **Branch única main**, sem branches paralelas.

## Arquitetura correta

**Codex Local no ChatGPT Desktop → projeto no Windows → Dark Studio Desktop.**

O usuário conversa com o Codex no app ChatGPT Desktop em modo Local e permite que ele manipule seus arquivos de projeto. O Dark Studio abre os mesmos arquivos, atualiza a timeline e exporta MP4. **Nenhum GitHub no caminho dos dados**. O GitHub público D-E-V1 continua apenas para o código-fonte.

Dados por padrão em \`%USERPROFILE%\DarkStudio\`; cenas/projetos JSON, biblioteca de mídia local. O conteúdo que o Codex enviar para processamento por IA não deve ser confundido com projeto sincronizado no GitHub.

### Hardware de referência
Windows 11, Ryzen 5 4600G, Radeon RX 7600, 16 GB RAM, 1920 × 1080, 30 FPS. Render Remotion/FFmpeg em processo separado com concorrência 1. Futuros proxies e otimização de memória. Aceleração de hardware da RX 7600 não validada.

## Marcos e critérios de aceite

| Marco | Estado | Entrega |
| --- | --- | --- |
| v0.1 | Base implementada, sem teste manual | Cenas, edição manual, preview Remotion |
| v0.2 | Código implementado, teste manual pendente | Biblioteca local, trilhas visual/narração/música e exportação MP4 |
| v0.2.1 | CI aprovada | Tauri Windows check e smoke de render MP4 |
| v0.3 | Painel de chat removido por mudança de requisitos | Esquemas de operação reversível, agora acionados externamente |
| v0.4 | Implementada, sem validação pessoal | Dashboard de projetos, armazenamento e autosave, detecção de mudanças de disco |
| **v0.5 (local)** | **Em validação** | Codex externo por CLI local, projeto por arquivo, aplicação com revisão e render via CLI; sem ponte GitHub |
| v0.6 | Planejada | Transcrição de narração, timestamps, waveform e sincronização automática |
| v0.7 | Planejada | Biblioteca de evidências, fontes/licenças, motion graphics e performance/proxies |
| v1.0 | Dependente de testes reais | Instalador Windows com serviço incluído, segurança, backups robustos, vídeos longos |

## Princípios que não devem ser quebrados

1. Projetos e mídia não são versionados/enviados ao GitHub do código.
2. Codex Local opera nos arquivos do PC somente dentro das permissões concedidas; não há chat de IA dentro do editor.
3. Todas as edições automáticas devem respeitar o schema e a revisão existente; conflitos nunca geram sobrescritas silenciosas.
4. Tempo em frames (30 FPS); media provenance e evidências devem ser verificadas antes da publicação.
5. Compilação Linux e CI Windows não substituem testes manuais no computador do usuário.
6. Licenciamento Remotion deve ser confirmado para eventual comercialização.

Veja [CODEX_WORKFLOW.md](CODEX_WORKFLOW.md) para executar o fluxo.
