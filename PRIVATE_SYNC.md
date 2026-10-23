# Dark Studio v0.5 — Sincronização privada com Codex Cloud

## O que sincroniza

Este recurso é uma **ponte privada por repositório GitHub**. O Dark Studio continua sendo um editor local de vídeo, sem chat embutido. O Codex trabalha no ambiente ChatGPT (Codex Cloud) que você autorizar, com acesso ao repositório de **projetos**. Quando a alteração é publicada na branch main do repositório privado, o serviço local a obtém e o editor a mostra. O caminho inverso também existe para os projetos locais autorizados individualmente.

- SOMENTE arquivos JSON de projeto (roteiros, títulos, cenas, legendas, nomes/metadados de mídia).
- NÃO são enviados MP4, narrações, imagens, cache, tokens nem o projeto-fonte D-E-V1.
- Repositório GitHub precisa estar **private**, com branch principal **main**.
- GitHub privado não é criptografia ponta a ponta; seus colaboradores com acesso ao repo podem ver o conteúdo.
- Esta ponte **não** lê uma conversa do ChatGPT automaticamente. É necessário solicitar ao Codex a edição/publicação no repo privado e aprovar seu commit ou merge na main.

## Ativação no Windows 11

1. Instale o GitHub CLI no PowerShell: \`winget install --id GitHub.cli --source winget\`.
2. Abra um novo PowerShell e execute \`gh auth login\`; confira com \`gh auth status\`. Não cole tokens no Dark Studio.
3. Crie em https://github.com/new um **novo repositório privado**, por exemplo \`SEU-USUARIO/dark-studio-private-projects\`. Inicialize com README para estabelecer a branch main. **Não use o repositório público D-E-V1.**
4. No ChatGPT, configure um **ambiente Codex Cloud** que tenha acesso a esse repositório privado (e opcionalmente ao D-E-V1, para conhecer o schema). Conceda as permissões via o fluxo do produto, não enviando senhas ou tokens em prompts.
5. Abra o Dark Studio v0.5 com o serviço local \`npm run dev:service\` e o desktop \`npm run dev:desktop\`.
6. Na página inicial, em **Sincronização privada**, digite \`SEU-USUARIO/dark-studio-private-projects\` e clique em **Conectar**. O serviço confirma que o repo é privado, está na main e que a conta tem permissão.
7. Marque individualmente os projetos que podem ser compartilhados e pressione **Sincronizar agora**. Depois disso, o serviço tenta sincronizar automaticamente aproximadamente a cada 45 s enquanto estiver executando e online.

O serviço usa GitHub CLI autenticado na sua conta do Windows. Não coloca tokens no JSON, no repositório ou em uma configuração do Dark Studio.

## Fluxo de trabalho no ChatGPT

Com o ambiente Codex Cloud selecionado e autorizado para o repositório privado, peça por exemplo:

> No repositório privado dark-studio-private-projects, abra \`projects/ID-DO-PROJETO.json\`. Este JSON pertence ao Dark Studio. Use o schema em \`D-E-V1/src/model/project.ts\` e preserve o ID do projeto, as IDs de cenas e o formato 30 FPS. A partir do roteiro abaixo, proponha uma montagem respeitando somente os fatos fornecidos. Atualize o arquivo, valide o JSON, e apresente a mudança para minha revisão. Depois de aprovado, publique na branch main do repositório privado. Não modifique outros projetos ou mídia.

Quando o commit/merge chegar na **main** do repositório privado e a sincronização local rodar, a página inicial verá novos projetos. Um projeto aberto também detecta a revisão de disco e recarrega automaticamente **apenas se não há alterações manuais pendentes**.

Se o Codex criar um projeto novo, deve usar UUID v4 no campo \`id\` e nomear o arquivo \`projects/<UUID>.json\`. O \`version\` esperado é 2. Confira o schema atual para todos os campos de cenas, clipes e assets.

## Conflitos e controle de acesso

- Se o Codex e o editor alterarem o mesmo projeto desde o último sync, o serviço registra **conflito e não sobrescreve nenhum lado**.
- Se o mesmo ID já tiver duas versões iniciais diferentes, ele não as mescla.
- Remoções remotas não apagam arquivos locais. Arquivar localmente não apaga projetos no GitHub.
- Para resolver conflitos, compare/revise o JSON local e o remoto, escolha a versão desejada, salve explicitamente e restabeleça a base de sincronização conforme procedimento manual de revisão. A v0.5 **não** resolve conflitos automaticamente.
- Desmarcar um projeto impede sincronizações futuras desse projeto, **mas não apaga a cópia remota já publicada**.
- Desativar o sync impede novas transferências; também não apaga arquivos remotos.

## Limitações v0.5

- Não existe botão de conversa com Codex dentro do editor.
- Não existe conexão direta entre mensagens privadas de ChatGPT e a timeline sem publicação de projeto.
- O repositório privado precisa ser criado/conectado por você: o aplicativo não cria repositórios nem obtém autorização GitHub por conta própria.
- A publicação da IA depende de você revisar e integrar as alterações ao repositório privado; commits não publicados/PRs não mesclados não são sincronizados.
- GitHub Contents API limita o arquivo JSON sincronizável a **900 KB** neste MVP. Até 200 itens no diretório projects.
- Mídias referidas no JSON por URLs locais não funcionarão magicamente no ambiente Codex Cloud; os assets reais permanecem no PC.
- O serviço usa processo Node separado e ainda não é empacotado no instalador do Tauri; precisa rodar no Windows.
- A API local ainda não tem autenticação forte por sessão; é experimental para uso pessoal em loopback. Não exponha a porta.
- Há validação de repositório privado, opt-in individual, schema, hashes e revisão remota SHA, mas **não há auditoria de segurança completa**.
- Rodar testes na CI (incluindo smoke MP4 curto) não substitui validar a integração real em sua máquina e sua conta GitHub.

## Onde ficam os dados locais

Padrão: \`%USERPROFILE%\DarkStudio\projects\<UUID>\project.json\`. Configuração da sincronização e estados ficam em \`%USERPROFILE%\DarkStudio\private-sync.json\` e \`sync-state-*.json\` (sem tokens). Nada disso é publicado automaticamente no repositório público do código.

## Testes

\`\`\`powershell
npm install
npm run check
npm test
npm run build
npm run smoke:render
\`\`\`

Os testes unitários usam transporte GitHub simulado e **não acessam sua conta nem seu repo privado**. Só você pode executar o teste fim a fim autenticado, com os seus arquivos e permissões.
