# Dark Studio — Roadmap oficial

Atualizado em 23/10/2026. Branch única: **main**. Projetos de usuários ficam no Windows, não no repositório do código.

## Visão

Editor de documentários investigativos, com controle manual da timeline e **Codex no chat do aplicativo ChatGPT em modo Local** (fora da interface Dark Studio). O Codex acessa a pasta do projeto somente com permissão do usuário. O editor detecta alterações de arquivo no Windows; o aplicativo não possui chat embutido nem sincroniza projetos por GitHub.

Hardware de referência: Windows 11, Ryzen 5 4600G, RX 7600, 16 GB RAM. 1080p/30 FPS, render Remotion com concorrência 1, proxies e render por segmentos planejados. A RX 7600 não é presumida aceleradora do pipeline atual.

## Cinco etapas estruturais implementadas nesta rodada

| Marco | Estrutura entregue | O que ainda precisa de validação |
| --- | --- | --- |
| v0.6 — Recuperação | Snapshots locais imutáveis dos salvamentos, histórico de até 30 versões anteriores, restauração com backup, API, CLI e tela inicial | Restaurar projetos grandes e testar conflitos reais no Windows |
| v0.7 — Propostas do Codex | Codex gera proposta validada em arquivo local com revisão-base; prévia, aceitar/rejeitar pela tela inicial; transação com backup | Fluxo real ChatGPT Local → botão Revisar Codex; revisão detalhada de cada operação |
| v0.8 — Narração e legenda | Modelo de captions em frames, importação e exportação SRT, linha de legendas na timeline, sobreposição no Remotion, suporte a operações Codex | Reconhecimento automático de voz, waveform e ajuste de cenas à duração da narração |
| v0.9 — Evidências | Fontes por cena (afirmação, título, URL HTTPS, notas, status pendente/verificada/rejeitada); operações locais reversíveis | Pesquisa/licenciamento automático e confirmação factual por pessoa |
| v0.10 — Diagnóstico | Check de referências de mídia no disco, cenas factuais sem fonte, evidências não verificadas, áudio/legendas ausentes, resumo de ambiente Windows, API, CLI e painel | Ensaios de codecs, integridade do arquivo original, instalador autossuficiente |

Estas cinco etapas compõem a **base de produto**, não um editor finalizado. Evitamos novos efeitos/transições para priorizar consistência de dados, rastreabilidade e controle de alterações.

## Pipeline de trabalho esperado

1. Abra o Dark Studio e crie o projeto na tela inicial.
2. Use o Codex no ChatGPT Desktop em **Local** com permissão explícita ao diretório \`%USERPROFILE%\DarkStudio\projects\`.
3. O Codex lê o esquema, cria operações e usa \`npm run project -- propose <id> operacoes.json <revision>\`. O JSON do projeto não é alterado nesta etapa.
4. No Dark Studio, clique em **Revisar Codex**, confira a proposta e aprove ou descarte. Aprovação faz backup da versão anterior e aplica mudanças atômicas.
5. Para recuperar edições, use **Versões** no cartão do projeto. Para verificar arquivos e fontes, clique em **Diagnóstico**.
6. Para legendas, importe um SRT sincronizado no editor. A narração já pode ser inserida como mídia local, gerada por qualquer sintetizador offline/sem IA.
7. Gere MP4 pelo editor ou \`npm run project -- render <id>\`.

## Regras e limites

- Nunca publicar roteiro, áudio ou projeto pessoal no GitHub do código sem instrução explícita.
- Eventos de um SRT possuem timestamps, mas importar legendas **não transcreve áudio**.
- Fonte com status \`verified\` reflete declaração humana; o software não verifica sua veracidade automaticamente.
- Diagnóstico não garante exportação bem-sucedida nem integridade de todos os codecs.
- Propostas com revisão antiga não podem ser aprovadas por cima de alterações novas.
- Snapshots (até 30) são históricos locais pontuais, não backup geograficamente redundante.
- Arquivos de mídia continuam na biblioteca de mídia local, não embutidos no JSON.
- WebView2/Tauri, inicialização e renderização em vídeos longos ainda precisam ser testados no PC do usuário.
- Serviço 127.0.0.1 ainda experimental e sem autenticação forte de sessão; não expor na rede.
- Checar licenciamento Remotion antes de comercialização.

## Próximas etapas após esta base

- v0.11: transcrição realmente automática e waveform, preferencialmente com motor local opt-in.
- v0.12: proxies, cache e render por segmentos para longos documentários e 16 GB RAM.
- v0.13: instalador e serviço embarcado/gerenciado, controle de permissões, autenticação local e atualização segura.
- v0.14: investigação editorial com fontes auditáveis, importação de materiais e revisão de direitos.
- Somente depois: biblioteca de motion graphics, refinamento cinematográfico e UX de edição profissional.

Critério de concluído: testes unitários + verificação TypeScript + build frontend + CI Windows com smoke MP4 **e teste real no Windows do usuário**. A CI não substitui a última etapa.
