# Codex local ↔ Dark Studio

**Todo o projeto do usuário fica no filesystem Windows.** Não use GitHub como transporte. O Codex é usado na interface **Codex do ChatGPT Desktop**, em modo **Local / Este computador**. Não há chat no Dark Studio.

## Primeira configuração

1. Instale e execute o Dark Studio conforme [README.md](README.md).
2. No aplicativo ChatGPT Desktop, abra **Codex → Local** e selecione como workspace a pasta do código \`D-E-V1\`. Evite modo Cloud.
3. Permita, quando solicitado, o acesso à pasta \`%USERPROFILE%\DarkStudio\projects\` que o serviço local usa para armazenar projetos. O sandbox pode exigir autorização específica pois a pasta é externa ao repositório.
4. No Dark Studio crie um documentário. Na página inicial, em seu cartão, clique em **Copiar instrução Codex** e cole-a no Codex com seu roteiro.
5. O Codex pode analisar schema, preparar cenas, salvar operações e executar as ferramentas locais. O editor detecta as alterações de um \`project.json\` válido e as mostra.

Se o ambiente Codex for isolado e não conseguir gravar na pasta de projetos, é necessário conceder essa permissão ou trabalhar com um diretório autorizado por meio de \`DARK_STUDIO_PROJECTS_DIR\` (configure a mesma variável no serviço e no terminal do Codex). Não há sincronização remota como alternativa automática.

## Comandos de trabalho

No terminal integrado do Codex, a partir do repositório \`D-E-V1\`:

~~~powershell
npm run project -- path
npm run project -- list
npm run project -- create "Investigação — roteiro piloto"
npm run project -- info UUID-DO-PROJETO
npm run project -- show UUID-DO-PROJETO
npm run project -- validate UUID-DO-PROJETO
npm run project -- apply UUID-DO-PROJETO .\operacoes.json REVISAO
npm run project -- replace UUID-DO-PROJETO .\novo-projeto.json REVISAO
npm run project -- import .\documentario-gerado.json
npm run project -- render UUID-DO-PROJETO
~~~

\`create\` e \`import\` criam um documentário que aparece no dashboard local. O \`apply\` valida operações e cria cópia de segurança do JSON anterior. \`replace\` é para alterações extensas e **exige** a revisão atual mostrada por \`info\`. \`render\` requer o serviço \`npm run dev:service\` e produz MP4 em \`%USERPROFILE%\Videos\DarkStudio\`.

## Exemplo de pedido de edição

> No projeto Dark Studio UUID-DO-PROJETO, utilize o arquivo local de projeto e o roteiro abaixo. Leia \`src/model/project.ts\` e \`src/model/operations.ts\`; preserve IDs, sincronização de mídia e fatos. Gere um arquivo temporário \`operacoes.json\` com operações válidas de até 40 ações e use \`npm run project -- apply UUID-DO-PROJETO operacoes.json REVISAO\`. Valide em seguida. Não altere ou publique arquivos do usuário no GitHub. Não invente estatísticas ou fontes. **Roteiro:** ...

Modelo simples de operações (substitua o identificador real lido no projeto):

~~~json
[
  {
    "type": "updateScene",
    "sceneId": "scene-1",
    "changes": {
      "title": "DOCUMENTOS REVELADOS",
      "kicker": "CAPÍTULO 02",
      "productionNotes": "Destacar somente trechos verificados."
    }
  }
]
~~~

Para um novo vídeo, peça ao Codex para criar um projeto com \`npm run project -- create "Nome"\`, gerar cenas via \`addScene\` ou um JSON inteiro validado e usar \`import\`. Cada projeto tem \`fps:30\`, \`width:1920\`, \`height:1080\`, \`version:2\`, e os campos do esquema \`src/model/project.ts\`. O limite de operações por lote é 40, com no máximo 200 cenas no projeto.

## Edições concorrentes

- Sempre execute \`info\` e use a revisão atual para evitar que o Codex aplique operações obsoletas.
- Se o editor tiver edições manuais não salvas, ele não substituirá automaticamente esse estado por um arquivo externo alterado.
- Em caso de conflito, o servidor retorna 409. O editor pede recarregamento; salve/exporte uma cópia antes de descartar suas alterações.
- O \`project.previous.json\` é um backup pontual por gravação; não é um sistema de versionamento completo.
- O Codex deve preferir o CLI em vez de sobrescrever o arquivo \`project.json\` diretamente.

## Privacidade

- O repositório GitHub \`D-E-V1\` contém apenas o **código da aplicação**.
- Roteiros, projetos e mídias ficam fora do repositório, por padrão em \`%USERPROFILE%\DarkStudio\`.
- Codex Local executa comandos no seu computador, mas o conteúdo que a IA lê ou recebe pode ser processado pela OpenAI. Não interprete \`Local\` como \`sem envio de contexto a servidores\`.
- O Dark Studio não precisa de acesso ao GitHub CLI, conta GitHub ou token para criar/editar/exportar projetos.

## Fluxo recomendado para novos pedidos (a partir da v0.7)

**Use o chat do Codex como sempre**. O agente pode executar os comandos abaixo por você:

~~~powershell
npm run project -- info UUID-DO-PROJETO
npm run project -- preview UUID-DO-PROJETO .\edicoes.json REVISAO
npm run project -- propose UUID-DO-PROJETO .\edicoes.json REVISAO
~~~

Diga ao Codex: **"Faça uma proposta, não aplique; vou revisar no editor."**

Na tela inicial, abra **Revisar Codex**. O botão **Aprovar** salva a alteração e cria um snapshot anterior. **Descartar** remove só a proposta. A revisão da proposta é verificada novamente na hora da aplicação.

Para diagnóstico \`npm run project -- doctor UUID-DO-PROJETO\`. Para recuperação \`npm run project -- history UUID\` seguido de \`restore UUID SNAPSHOT REVISAO_ATUAL\`. Para legenda SRT, peça ao Codex um arquivo com timestamps precisos e depois importe na biblioteca do editor. Para evidências, a IA pode cadastrar *pendente*, mas só uma conferência humana pode mudar o status.

## Direção investigativa do episódio inteiro (v0.12)

Veja o procedimento passo a passo em [docs/CODEX_DIRECTOR.md](docs/CODEX_DIRECTOR.md). O Codex fica **neste chat externo**, com a pasta de projetos autorizada.

No workspace local `D-E-V1`:
~~~powershell
npm run project -- info UUID-DO-PROJETO
npm run project -- direction-template UUID-DO-PROJETO "$env:TEMP\dark-studio-direction.json"
# Codex edita o storyboard como diretor visual, consulta as fontes e a voz reais.
npm run project -- direct UUID-DO-PROJETO "$env:TEMP\dark-studio-direction.json" REVISAO_SHA
~~~

Ou `npm run project -- auto-direct UUID-DO-PROJETO REVISAO_SHA` para um passe ilustrativo de ritmo, sem inventar fotos/dados. **Revisar Codex** aprova os planos no editor; o áudio e as legendas continuam onde estavam. Após aprovar: `npm run project -- direction-report UUID` e `npm run project -- doctor UUID`. Nunca declarar fatos como verificados automaticamente.


## v0.14 — Codex como diretor de animação (50 presets + cenas novas)

Antes de criar os planos, leia \`docs/ANIMATION_STUDIO.md\`, \`docs/VISUAL_IDENTITY.md\`, \`src/model/layers.ts\`, \`src/model/presets.ts\` e \`src/model/direction.ts\`.

Com o seu acesso local, peça ao Codex para executar:
\`\`\`powershell
npm run project -- presets
npm run project -- composition-example person-family "$env:TEMP\personagens.json"
npm run project -- info UUID
npm run project -- direction-template UUID "$env:TEMP\storyboard.json"
\`\`\`
O Codex então edita os beats; use \`presetId\` para uma das 50 composições ou \`layers[]\` para objetos/gestos/animadores originais. Nenhuma linha JavaScript arbitrária pode entrar nos beats. \`cueCaptionId\` é ID da legenda no projeto, nunca palavra inferida automaticamente. Um gráfico com números precisa citar evidência cadastrada, mantendo revisão humana pendente.

\`\`\`powershell
npm run project -- direct UUID "$env:TEMP\storyboard.json" REVISAO_SHA
npm run project -- direction-report UUID
npm run project -- doctor UUID
npm run preview:frames -- UUID 0,75,150
\`\`\`

\`direct\` cria **proposta**, não sobrescreve o projeto, e os comandos \`direction-report\`/\`doctor\` devem ser repetidos sobre a versão aprovada. O usuário abre **Revisar Codex** e valida o resultado no Dark Studio. Fatos, licenças e origem dos números permanecem sob supervisão humana. Imagens do projeto nunca devem ser publicadas no GitHub.
