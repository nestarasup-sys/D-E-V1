# Dark Studio — Arquitetura de montagem vNext (decisão técnica)

Data: 2026-10-23. Branch única: `main`. Status: diagnóstico do código concluído; implementação do piloto a validar em CI + Windows real.

## Diagnóstico do código atual (v0.10)

- `src/model/project.ts`: Project v2 usa `scenes[]` para definir TODA a duração; `clips[]` só têm visual/narration/music; `captions[]` usam frames; `evidence[]` armazena fontes.
- `src/video/Documentary.tsx`: cada cena gera `SceneVisual` de fundo e texto estático, com `interpolate` fixo. Clipes visuais são sobrepostos; render do áudio deriva da mesma composição.
- `src/Editor.tsx`: timeline tem botões e campos numéricos; não suporta edição direta no trilho de vários planos por arrastar ou redimensionar. Não há keyframes.
- `src/video/Root.tsx`, `apps/agent/src/render-worker.ts`, `src/Editor.tsx`: a composição `Documentary` é compartilhada entre Remotion Player e renderer. **Preservar esse contrato** é prioritário.
- `apps/agent/src/project-store.ts`: projeto em `%USERPROFILE%\DarkStudio\projects\<UUID>\project.json`, snapshots, revisão SHA256 e salvamento conservador.
- `apps/agent/src/media.ts`: mídia privada no disco, index local, HTTP loopback; sem upload GitHub. A biblioteca suporta foto, vídeo e áudio.
- Não foi possível ler a pasta de projetos real do usuário; só o schema e os testes versionados. Portanto NÃO marcar migração de um documentário real como validada.

## Modelo aprovado: evolução aditiva de Project v2

Manter `version: 2`, `scenes[]`, `clips[]`, `captions[]`, `evidence[]`; incluir campos opcionais com defaults para não quebrar arquivos existentes:

1. `chapters[]`: identificador, título, referência à primeira cena; apenas organização editorial no primeiro corte.
2. `shots[]`: id, tipo (composition, image, video), `startFrame`, `durationFrames`, layer/zIndex, campos de composição e referência à mídia local, propriedades de animação em keyframes.
3. `visualMode: 'legacy'|'shots'`: default `legacy`. Projetos antigos ficam INTACTOS visualmente e podem optar por conversão futura. `shots` coloca o ritmo visual nos planos.
4. `channelKit?`: paleta, fontes autorizadas de sistema, texto de marca, estilo de legenda. Sem baixar fontes/logos; identidade reutilizável poderá ser extraída posteriormente de uma biblioteca local.
5. A trilha de narração mantém `clips[].lane='narration'` e `captions[]` absolutos. `volumeKeyframes` opcionais para áudio; cortes visuais não alteram narração nem deslocam legendas por acidente.

Keyframe = `frame` relativo ao plano + `value` + `easing` (`linear | ease-in | ease-out | ease-in-out`). Propriedades iniciais: `x, y, scale, rotation, opacity` para planos; volume nos clipes de áudio. O avaliador de keyframes é uma função pura em `src/model`, testável sem GPU e compartilhada com preview/render via Remotion.

**Regra de compatibilidade**: parse de JSON antigo, sem `shots`, `chapters` ou `channelKit`, continua válido. Nenhuma operação altera projetos existentes silenciosamente. Ao salvar, o sistema mantém backup/snapshot anterior. Rejeitar plano que ultrapasse a duração total ou refira mídia inexistente; não usar URLs externas arbitrárias no render.

## Contrato de tempo e camadas

- FPS 30 fixos no primeiro corte; `900 frames = 30 segundos`.
- `chapters → scenes` são narrativa; `shots` são unidades visuais temporais em frames absolutos.
- Camadas iniciais: fundo da cena / mídia ou composição do plano / texto do plano / legendas / overlay de marca. Conflitos de `zIndex` devem ser determinísticos.
- Narration/music seguem trilhas existentes com posições absolutas. Não executar ripple-edit implícito quando usuário corta um plano.
- Vários planos, tipografia animada e movimento usam Remotion `Sequence`, `useCurrentFrame`, `interpolate`, `Easing`; um único `Documentary` é fornecido ao Player e ao render export.
- Interação da timeline: selecionar plano, mover início e alças de duração via arraste com snap de frame, manter clipes de áudio e legendas parados. Campos acessíveis por teclado para valores exatos.

## Plano priorizado / gates

### Etapa A — Compatibilidade e especificação (P0)
Implementar schema aditivo, parser retrocompatível, validações, testes de ida-e-volta e backup; documentar onde ficam arquivos. **Gate**: fixture antigo válido e renderização legacy sem alteração perceptível.

### Etapa B — Motor de planos e composição (P0)
Renderizar shot compositions/asset com posição e duração próprias, keyframes, easing e layers. Mesmo componente em Player e exportação. **Gate**: amostrar frames de 0 a 899 e conferir visuais diferentes de 2–5s.

### Etapa C — Timeline de verdade, fatia vertical (P0)
Trilha visual independente com arrastar/reajustar bordas, seleção, inspector de keyframes + reposição por formulário para precisão. Legendas clicáveis e áudio intacto. **Gate**: usuário pode mover plano do tempo 3s para 5s sem movimentar narração/legendas.

### Etapa D — Piloto audiovisual 30s (P0)
Gerador local de novo projeto, roteiro sintético não factual, 8–10 planos com 2–5s, narração WAV obtida localmente com TTS do Windows (sem API de IA, não enviada ao GitHub), legendas cronometradas conforme a duração efetiva da voz, animação e kit visual. Se TTS indisponível, explicar e bloquear aprovação audiovisual, sem fingir áudio. **Gate**: projeto privado em disco; duração 900f, plano editável, áudio + legendas alinhados.

### Etapa E — Avaliar e escalar (P1/P2)
CI TypeScript/Vitest/Tauri Windows; render MP4 piloto e amostras por frames; perfil de RAM/CPU; checklist manual de prévia, UX e narração no Ryzen 5 4600G / RX 7600 / 16GB. Depois: proxies/cache, capítulos mais longos, thumbnails/publicação, composição de mapas/gráficos, transições, arquitetura de templates e instalador. **Gate**: NÃO declarar prontidão profissional antes de teste manual do editor e render real de episódio longo.

## Proteção de dados e release

- GitHub contém apenas código, documentação, schema, testes e gerador do piloto. Áudio gerado, projeto real, evidências e mídias ficam no computador e fora do repositório.
- Codex via ChatGPT **Local**, fora do editor. Propostas revisáveis continuam disponíveis.
- Commits na `main` do repositório de código; não há acesso ao git do computador do usuário para criar commits locais nele.
- O primeiro piloto será um teste de conceito verificável, NÃO reconstrução completa de todas as trilhas, efeitos, ferramentas de mapa e publicação.
