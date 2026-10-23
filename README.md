# Dark Studio v0.5 — projetos locais e sincronização privada opcional com Codex Cloud

O Dark Studio é um editor desktop Windows desenvolvido com **Tauri 2 + React + TypeScript + Remotion**. **Não há chat com IA dentro do editor.** O Codex deve ser usado no ChatGPT/ambiente Codex externo. O Dark Studio recebe as edições por arquivos JSON estruturados em disco ou pela importação manual de JSON.

## Como funciona a integração

1. Abra o Dark Studio: a **página inicial de projetos** permite criar, abrir, duplicar, arquivar e importar projetos JSON.
2. Projetos ficam, por padrão, em **%USERPROFILE%\DarkStudio\projects\<UUID>\project.json**. Na página inicial, clique em "Copiar pasta de projetos".
3. Para usar o **Codex com acesso aos arquivos locais do seu computador**, abra essa pasta no ambiente de desenvolvimento local ao qual o Codex tem acesso. Peça para analisar o arquivo do projeto e gerar edições estruturadas. No Dark Studio aberto, atualizações salvas no disco são detectadas automaticamente (~3,5 s), desde que não existam alterações manuais pendentes.
4. O caminho preferencial para alterações seguras é o CLI **npm run project -- apply <UUID> edicoes.json**. Ele valida todas as operações, exige revisão atual e cria backup antes de salvar. Consulte [CODEX_WORKFLOW.md](CODEX_WORKFLOW.md).

**IMPORTANTE:** o Codex executando remotamente nos servidores do ChatGPT **não tem acesso automático ao disco do Windows**. Nesse caso, forneça ao Codex o JSON exportado ou use uma sincronização intencional que você controle. O Codex pode gerar outro projeto JSON para importar na página inicial. **Não envie projetos investigativos sensíveis para um repositório público sem revisar o conteúdo.** A partir da v0.5 é possível **habilitar explicitamente** uma ponte bidirecional via repositório GitHub privado separado, com compartilhamento por projeto. Consulte [PRIVATE_SYNC.md](PRIVATE_SYNC.md).

## Ponte privada opcional (v0.5)

A página inicial contém **Sincronização privada**. Um repositório GitHub privado separado e o GitHub CLI autenticado permitem transferir JSON de projetos para um ambiente Codex Cloud que você tenha conectado e autorizado. **Nenhum projeto local é enviado automaticamente ao ativar a conexão**: selecione cada projeto explicitamente. Projetos novos criados/publicados pelo Codex no privado podem ser recebidos.

A sincronização não transmite vídeos, imagens e áudio. Mudanças conflitantes são preservadas sem sobrescrita automática. Para conhecer as etapas de conexão, restrições e segurança, leia [PRIVATE_SYNC.md](PRIVATE_SYNC.md).

## Preparação Windows 11

Recomendação inicial: Ryzen 5 4600G, Radeon RX 7600, 16 GB RAM, 1080p/30 FPS, renderização com concorrência 1.

- Instale Node.js 22+, npm e Git.
- Para a sincronização privada OPCIONAL, instale GitHub CLI (`winget install --id GitHub.cli --source winget`) e faça `gh auth login`.
- Para o desktop Tauri: Rust/rustup, Microsoft C++ Build Tools e WebView2 conforme https://v2.tauri.app/start/prerequisites/.
- Primeira renderização Remotion pode baixar Chromium. FFmpeg já é integrado ao Renderer no fluxo atual.

No PowerShell:

~~~powershell
git clone https://github.com/nestarasup-sys/D-E-V1.git
cd D-E-V1
npm install
npm run dev:service
~~~

Em **outro terminal**, dentro da pasta do projeto:

~~~powershell
npm run dev:desktop
~~~

Para testar somente a interface, rode npm run dev no segundo terminal e abra http://127.0.0.1:1420. O serviço local é necessário para projetos, importação de mídia e exportação MP4. **Este serviço ainda não vem empacotado como instalador autossuficiente.**

## Projetos e salvamento

- O serviço local gerencia projetos e mídia; o editor salva alterações automaticamente (debounce de 900 ms).
- Ao importar um JSON cujo ID já existe na página inicial, o editor pede confirmação para **atualizar o projeto existente**, fazendo backup do anterior. Um JSON com ID novo vira projeto novo.
- Ao tentar salvar uma revisão obsoleta, o serviço devolve HTTP 409. O editor não sobrescreve automaticamente a alteração externa e oferece "Recarregar projeto do disco". **Exporte o JSON local antes de recarregar** se desejar preservar alterações feitas na interface.
- O projeto anterior da v0.1/v0.2 ainda pode estar salvo no navegador. Use "Migrar projeto antigo" no dashboard ou importe um JSON exportado.
- Arquivar move a pasta do projeto para _archived; não apaga os arquivos da biblioteca de mídia.
- Cada gravação salva uma cópia anterior em project.previous.json na pasta. Isto é um backup pontual, não um histórico permanente.
- URLs dos arquivos de mídia usam o servidor local; mover o JSON para outro PC não transporta os arquivos.

## Edição e exportação

O editor de cenas mantém trilhas visuais, narração e música, com Remotion Player e exportação MP4 H.264 em worker separado. Ainda não há waveform, proxies, ripple-edit nem editor profissional completo. Reprodução de alguns codecs depende do WebView2/Chromium, e projetos longos devem ser testados cuidadosamente.

## Limitações de segurança e produto

- O serviço HTTP fica em 127.0.0.1:4317, mas **ainda não exige token de sessão**. Não exponha a porta na rede nem distribua o produto antes da revisão de segurança.
- Alterar project.json diretamente com Codex deve preservar o schema definido em src/model/project.ts. Para evitar arquivo parcial, o CLI é preferível.
- A ponte privada exige um repositório GitHub privado autorizado para Codex Cloud. **Não existe acesso automático às conversas do ChatGPT ou aos arquivos Windows**.
- O workflow Windows CI compila Tauri e faz smoke render curto de MP4. Isso não substitui teste na interface do seu Windows.
- Direitos e fontes de imagens, dados e afirmações investigativas precisam de verificação humana.
- Avalie a licença do Remotion antes de comercializar o editor.

## Comandos de teste

~~~powershell
npm run check
npm test
npm run build
npm run smoke:render
~~~

Veja o roadmap único em [ROADMAP.md](ROADMAP.md).
