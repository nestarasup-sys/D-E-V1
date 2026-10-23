# Codex externo ↔ Dark Studio

O Codex não precisa de um chat no editor. Ele pode produzir e alterar arquivos compatíveis; o Dark Studio é quem exibe as cenas e renderiza o vídeo.

## 1. Usando Codex com acesso local no Windows

Crie um projeto na página inicial do editor. Copie a pasta de projetos, normalmente:

C:\Users\SEU_USUARIO\DarkStudio\projects

A pasta de cada projeto contém project.json, com propriedades version, id, name, fps, width, height, scenes, assets e clips.

Abra esse diretório em um ambiente local ao qual o Codex tenha realmente acesso a leitura/gravação. Dê ao Codex as instruções abaixo:

> Trabalhe no projeto Dark Studio indicado. Antes de editar, leia src/model/project.ts e src/model/operations.ts do repositório D-E-V1, confira o JSON atual e mantenha os IDs e os fatos fornecidos. Para alterações, gere um arquivo edicoes.json com uma lista de operações válidas e execute npm run project -- apply <UUID> edicoes.json dentro do repositório local. Não fabrique estatísticas, fontes nem licenças de imagens. Não apague cenas sem eu solicitar. Valide o projeto antes de finalizar.

O CLI faz todas as operações em uma única transação, valida com Zod e salva backup do arquivo anterior. O editor detecta o arquivo alterado quando não há trabalho local não salvo.

## 2. Exemplos de comandos (PowerShell)

~~~powershell
npm run project -- list
npm run project -- create "Investigação sobre tecnologia"
npm run project -- show SEU-UUID
npm run project -- validate SEU-UUID
npm run project -- apply SEU-UUID .\edicoes.json
npm run project -- import .\meu-projeto.json
~~~

Exemplo de arquivo edicoes.json (substitua o ID de cena pelo existente):

~~~json
[
  {
    "type": "updateScene",
    "sceneId": "scene-EXISTENTE",
    "changes": {
      "title": "DOCUMENTOS REVELADOS",
      "kicker": "CAPÍTULO 02",
      "productionNotes": "Destacar somente trechos confirmados nas fontes."
    }
  }
]
~~~

Estas operações editam a composição do vídeo, não executam diretamente uma renderização. Para MP4, use "Exportar MP4" no editor.

## 3. Codex dentro do ChatGPT, rodando remotamente

Se você estiver usando **Codex na nuvem pelo ChatGPT**, o processo remoto não enxerga automaticamente C:\Users\...\DarkStudio. Duas opções explícitas:

- Compartilhe apenas um JSON do projeto (sem mídia sensível) com o Codex, receba o JSON atualizado e use "Importar JSON" na página inicial. Se o ID estiver preservado, o Dark Studio identifica o projeto existente, pede confirmação e o atualiza com backup; se for um ID novo, cria outro projeto.
- Use um diretório de trabalho sincronizado por conta própria, com controle de acesso e versionamento. Nesse caso configure a variável DARK_STUDIO_PROJECTS_DIR antes de abrir o serviço, apontando para a pasta local sincronizada. **Não faça isso usando um repositório público para investigações confidenciais**.

Exemplo para uma sessão de PowerShell (opcional, somente se configurou sincronização):

~~~powershell
$env:DARK_STUDIO_PROJECTS_DIR="D:\Projetos\DarkStudioCompartilhado"
npm run dev:service
~~~

A infraestrutura de sincronização externa e um app Codex com acesso à máquina são recursos distintos; este repositório não provisiona nenhum dos dois. O app usa polling e revisões por hash para evitar sobregravações óbvias, mas não faz merge automático de conflitos.

## 4. Privacidade e segurança

Não compartilhe arquivos de mídia sem autorização nem publique um projeto investigativo em repositório público. Confirme licença, origem e dados apresentados em qualquer imagem ou gráfico.
