# Dark Studio — Plano oficial de desenvolvimento

> Este é o **único roadmap vigente**. Substitui os marcos provisórios descritos anteriormente. Mantemos somente a branch `main`; cada mudança é testada e registrada em commits pequenos. Última revisão: 23 de outubro de 2026.

## Visão do produto

Aplicativo desktop para documentários investigativos sem aparecer em câmera. Um editor visual manual e um **agente Codex externo** trabalham sobre o mesmo modelo de projeto. O agente propõe edições; a interface valida, apresenta diferenças e exige aprovação. Nenhum prompt pode inventar fatos ou se transformar em uma edição silenciosa.

### Computador-alvo: Windows 11

- CPU: AMD Ryzen 5 4600G, GPU: AMD Radeon RX 7600, memória: 16 GB RAM.
- Base de projeto: 1920 × 1080, 30 FPS; não usar 4K como padrão.
- Render Remotion inicialmente com **concorrência 1**, para limitar consumo de RAM. Avaliar 2 após benchmark real.
- Preview leve, caching e proxies de 540p/720p planejados antes de vídeos grandes.
- A RX 7600 pode ajudar onde codecs e frameworks forem compatíveis; **aceleração por GPU não está prometida nem habilitada no render MVP**. Medir CPU, RAM e GPU antes de decidir por encoding AMD AMF.
- Projetos de 20 a 40 minutos exigem segmentação, cache e controle de memória; ainda não validados.

## Fases, critérios de aceite e estado

| Etapa | Estado | Entrega/critério |
| --- | --- | --- |
| v0.1 — Núcleo | Implementada; sem validação pessoal | Editor React/Remotion e operações reversíveis |
| v0.2 — Mídia e exportação | Código implementado; testes locais no Windows pendentes | Importar mídia local, timeline multitrilha, MP4 via worker |
| v0.2.1 — Confiabilidade | Em andamento | CI em Windows compilando Tauri e smoke real de MP4; diagnóstico de falhas |
| **v0.3 — Diretor IA** | **Primeira integração em desenvolvimento** | Roteiro → storyboard; proposta multicena (máx. 8); revisão e aplicação atômica; histórico |
| v0.4 — Narração | Planejada | Transcrição com timestamps, waveform e sincronização das cenas |
| v0.5 — Evidências e pesquisa | Planejada | Busca autorizada, origem/licença de mídia, referências e auditoria editorial |
| v0.6 — Motion graphics | Planejada | Biblioteca de templates, gráficos e mapas, estilos reutilizáveis |
| v0.7 — Desempenho | Planejada | Proxies, cache, render por segmentos, métricas em projetos longos |
| v1.0 — Uso produtivo | Dependente de testes | Instalador Windows, persistência robusta, backups, QA e segurança do serviço local |

## Ordem de trabalho do próximo marco

1. Corrigir e validar o pipeline de Windows antes de declarar exportação MP4 operacional.
2. Gerar storyboard com até 10 cenas somente a partir do roteiro fornecido.
3. Gerar proposta para até 8 cenas existentes por vez, sem modificar assets, mídia ou IDs.
4. Mostrar cada proposta antes de aplicar; permitir selecionar apenas algumas alterações, desfazer e refazer.
5. Guardar direção visual e evidências pendentes como notas de produção nas cenas.
6. Proteger a integração do Codex com validação de saída, limites e sandbox somente-leitura.
7. Testar os fluxos em máquina Windows 11 com os vídeos/áudios reais do canal, ainda pendente.

## Regras arquiteturais

- UI Tauri + React/TypeScript; projeto validado com Zod e editado por operações reversíveis.
- Codex SDK fica em processo Node externo e não modifica arquivos do projeto diretamente.
- Remotion faz preview/motion graphics e export H.264, usando FFmpeg internamente; isolamento do renderizador.
- Arquivos de mídia locais não são enviados ao Codex; propostas trabalham sobre roteiro e metadados das cenas.
- Rotas locais `127.0.0.1` são **experimentais e sem autenticação de sessão**. Empacotamento exige token local, proteção CSRF e revisão de segurança.
- Estatísticas, documentos e imagens precisam de confirmação e fonte editorial. Nenhuma evidência será inventada.
- Licenciamento do Remotion precisa ser reavaliado antes de comercializar o editor.

## Definição de concluído

Funcionalidade só recebe o status **validada** quando testes automatizados aplicáveis passarem e o fluxo crítico tiver teste manual no Windows. Passar no frontend em Linux **não** equivale a compilar instalador Tauri nem a gerar MP4 real.
