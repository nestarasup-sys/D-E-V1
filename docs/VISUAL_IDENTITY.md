# Dark Studio · Bíblia visual do canal investigativo (v0.12)

**Identidade proposta:** ARQUIVO INVESTIGATIVO + GRÁFICOS EDITORIAIS. Não é identidade de veículos de notícias reais, nem imitação de sua marca. Codex no chat externo dirige e organiza; Dark Studio monta, permite revisar e exporta o mesmo material do preview.

## Princípios pesquisados e traduzidos em regras

1. **Prova não é decoração.** Registrar origem e verificação antes de mostrar material como evidência. A Reuters exige atribuição e alerta contra qualquer alteração que fabrique realidade nas imagens; a orientação de visualização Reuters Graphics recomenda rótulos claros e menos decoração. https://reutersagency.com/about/standards-values/ · https://reuters-graphics.github.io/newsroom-datawrapper-guide/next-steps/dos-and-donts/
2. **Narrativa verificável.** Se uma captura, foto, documento ou dado não puder ser conferido, o plano precisa estar visivelmente identificado como ilustração/reconstrução ou deixar a fonte pendente. O processo de investigação visual precisa registrar checagem e corroborar material, como no manual da Bellingcat: https://www.bellingcat.com/app/uploads/2022/12/JA-Manual-for-PUBLICATION.pdf
3. **Movimento tem propósito.** Revele trechos enquanto a narração explica, não ponha zoom aleatório em toda a tela. Orientações do Nielsen Norman Group: https://www.nngroup.com/articles/animation-purpose-ux/ · https://www.nngroup.com/articles/animation-duration/
4. **Anotar para entender.** Gráficos com rótulos diretos e uma comparação central facilitam leitura, sem sobrecarregar a memória: https://journals.sagepub.com/doi/10.1177/15291006211051956
5. **Imagem gerada não é testemunho.** Uma cena procedimental/ilustrativa gerada por código, por IA, por composição ou reconstrução NÃO é registro do evento. Fotos reais e dados só entram por importação local com fonte, direitos e conferência editorial.

## Paleta e tipografia

| Papel | Hex | Uso |
| --- | --- | --- |
| Base arquivo noturno | \`#0B1724\` | fundos, camadas de arquivo, legibilidade |
| Superfície editorial | \`#172B33\` | fichas, overlays e divisões |
| Âmbar de pista | \`#F0BB66\` | evidência em foco, linhas e marcador |
| Ciano de dado conferido | \`#82C7DA\` | dados vinculados a origem verificada |
| Alerta editorial | \`#E4A1AD\` | fonte pendente, conflito ou reconstrução |
| Papel claro | \`#EBE6D9\` | cartões/documentos reconstruídos, nunca captura “oficial” |

Fonte de sistema sem serifa para fatos; serifada para trecho documental; monoespaçada para números/datas. Evitar copiar fontes de marca de terceiros. Letras grandes, contraste forte e margens seguras; legendas nunca encobrem os dados principais. **A legibilidade do dispositivo móvel deve vencer a decoração.**

## Gramática da edição

**Ritmo inicial:** considerar 2–5 s por plano, mas usar 6–12 s quando há leitura longa, análise séria ou pausa. Cada mudança precisa acrescentar informação; deixar a mesma imagem parada por 30 s é exceção, não padrão. Uma cena de 30 s pode ter oito planos, sem cortar a narração.

| Intenção | Composição | Movimento recomendado | Atenção editorial |
| --- | --- | --- | --- |
| Gancho/pergunta | Dossiê de arquivo | revelar ficha + leve aproximação | título instigante, sem afirmar conclusão |
| Contextualização | Headline, split, timeline | pan lento, entrada de texto | situar o espectador |
| Apresentação de prova | Documento e trecho destacado | marca-texto progressivo | evidência original, fonte, data, direitos |
| Corroboração | Cadeia de evidências | nós e linhas surgem por etapas | distinção entre hipótese e verificado |
| Dados | Gráfico editorial | barras crescendo do zero | valores reais e origem verificável |
| Relações espaciais | Mapa ESQUEMÁTICO | traçado da relação | não representar posições geográficas falsas |
| Contraponto | Comparação A/B | revelação discreta em duas colunas | igualdade de escalas e períodos |
| Identificação | Lower third | entrada curta, pouca distração | não confundir quem fala/quem é |
| Conclusão | Síntese + fonte | saída discreta | mostrar lacunas de informação |

**Kit visual por projeto:** nome da marca, fonte de sistema, cor de destaque e legenda. No primeiro corte, os templates usam CSS/SVG dentro do Remotion e são editáveis; nenhuma fonte/imagem externa é baixada automaticamente. O Codex pode importar B-roll real autorizado e composições próprias no Windows depois.

## Política de gráficos/documentos

- Gráfico **não inventa números**: \`investigation.points[]\` só é aceito pelo compilador de direção quando há \`sourceEvidenceId\` de evidência existente. Se ainda estiver pendente, a peça continua identificada como não verificada e gera alerta.
- Documento fictício, trecho reconstruído e dossiê estilizado sempre recebem etiqueta de **ilustração** ou **reconstrução editorial**. O status de verificado vem exclusivamente do cadastro de evidências editado pelo usuário, nunca de decisão automática do Codex.
- O mapa existente é um **diagrama de relações**, não um serviço cartográfico. Para localização real, usar um mapa autorizado com coordenadas, escala, fonte e data verificadas, importado como mídia local.
- Reprodução de manchete, logo, foto de pessoa e documento original requer conferência de autenticidade, direitos e contexto. O Dark Studio não busca nem licencia material de terceiros automaticamente.
- Enquanto houver pendências, o diagnóstico não é um aval de publicação. Mesmo sem erros técnicos, revisar a reportagem é obrigatório.

## Direção automática: os “95%”

A meta é **Codex montar quase todo o material técnico**, não delegar automaticamente o julgamento jornalístico. Ele deve:
1. extrair argumentos, ritmo e capítulos de roteiro/narração existente;
2. propor fontes e trazer IDs de evidências, ainda \`pending\`, sem marcá-las como \`verified\`;
3. criar lista de planos em JSON com visual, duração, início, propósito, animação, B-roll e destaque;
4. usar compilações determinísticas para planos editáveis;
5. produzir/corrigir legendas a partir de áudio REAL, usando ferramenta local apropriada;
6. rodar diagnósticos e render de ensaio;
7. pedir aprovação editorial no Dark Studio.

O restante é sua revisão: **verdade e contexto**, fonte, corte final, direitos de imagem, impacto emocional, som e publicação.

Leia [CODEX_DIRECTOR.md](CODEX_DIRECTOR.md) para passos reproduzíveis no chat do Codex e [INVESTIGATION_BRIEF.example.json](INVESTIGATION_BRIEF.example.json) para um exemplo.
