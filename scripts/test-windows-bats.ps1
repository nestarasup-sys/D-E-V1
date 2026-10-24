# Windows-only CI. Tests a fake local Git main without any user files.
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dir=Join-Path $env:RUNNER_TEMP ("dark-studio-bat-"+[guid]::NewGuid().ToString('N'))
$originalLocalAppData=$env:LOCALAPPDATA
$originalRepoVar=$env:DARK_STUDIO_REPO_DIR
$originalGitCount=$env:GIT_CONFIG_COUNT
$originalGitKey=$env:GIT_CONFIG_KEY_0
$originalGitValue=$env:GIT_CONFIG_VALUE_0

function Invoke-Git([string]$folder,[string[]]$parameters) {
  & git -C $folder @parameters | Out-Null
  if($LASTEXITCODE -ne 0){throw "Git falhou em $folder - $($parameters -join ' ')"}
}
function Invoke-Updater([string]$script,[int]$expectedExit) {
  # BAT ends with pause: redirected NUL avoids interactive input.
  # Windows PowerShell 5 turns native STDERR into ErrorRecord; Git prints
  # harmless information there (e.g. "Already on 'main'"). Use real exit code.
  $previous=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  try {
    $result= & $env:ComSpec /d /c ('"' + $script + '" <nul') 2>&1
    $exit=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$previous
  }
  Write-Output ($result -join [Environment]::NewLine)
  if($exit -ne $expectedExit){throw "BAT terminou com $exit, esperado $expectedExit"}
}

try {
  New-Item -ItemType Directory -Force $dir | Out-Null
  $src=Join-Path $dir 'author'
  $bare=Join-Path $dir 'remote.git'
  $clone=Join-Path $dir 'clone - qualquer nome'
  $detached=Join-Path $dir 'atalhos fora do repo'
  New-Item -ItemType Directory -Force $src,$detached | Out-Null
  & git init -b main $src | Out-Null
  if($LASTEXITCODE -ne 0){throw 'git init source falhou'}
  Invoke-Git $src @('config','user.email','ci-bat@example.invalid')
  Invoke-Git $src @('config','user.name','Dark Studio CI')
  New-Item -ItemType Directory -Force (Join-Path $src 'src-tauri') | Out-Null
  Set-Content -Path (Join-Path $src 'src-tauri/tauri.conf.json') -Value '{}' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'package.json') -Value '{"name":"dark-studio","private":true,"version":"0.0.0"}' -Encoding ASCII
  Set-Content -Path (Join-Path $src '.gitignore') -Value 'node_modules/' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'edition.txt') -Value 'rev-1' -Encoding ASCII
  Invoke-Git $src @('add','.')
  Invoke-Git $src @('commit','-m','rev 1')
  & git init --bare --initial-branch=main $bare | Out-Null
  if($LASTEXITCODE -ne 0){throw 'git init bare falhou'}
  Invoke-Git $src @('remote','add','origin',$bare)
  Invoke-Git $src @('push','-u','origin','main')
  & git clone $bare $clone | Out-Null
  if($LASTEXITCODE -ne 0){throw 'clone inicial falhou'}
  Invoke-Git $clone @('remote','set-url','origin','https://github.com/nestarasup-sys/D-E-V1.git')
  Set-Content -Path (Join-Path $src 'edition.txt') -Value 'rev-2' -Encoding ASCII
  Invoke-Git $src @('add','edition.txt')
  Invoke-Git $src @('commit','-m','rev 2')
  Invoke-Git $src @('push','origin','main')

  Copy-Item (Join-Path $repo 'ATUALIZAR.bat') (Join-Path $detached 'ATUALIZAR.bat')
  $script=Join-Path $detached 'ATUALIZAR.bat'
  $env:DARK_STUDIO_REPO_DIR=$clone
  $env:LOCALAPPDATA=(Join-Path $dir 'user-local-data')
  # Process-scoped Git config rewrites canonical GitHub remote into local fixture.
  # Origin validation in the BAT remains enabled.
  $env:GIT_CONFIG_COUNT='1'
  $env:GIT_CONFIG_KEY_0='url.'+($bare -replace '\\','/')+'.insteadOf'
  $env:GIT_CONFIG_VALUE_0='https://github.com/nestarasup-sys/D-E-V1.git'
  Invoke-Git $clone @('fetch','origin','main')

  Write-Host '[CI BAT] Atualizando clone com nome arbitrario...'
  Invoke-Updater $script 0
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'rev-2') {
    throw 'Updater nao trouxe a versao da main.'
  }
  if(((& git -C $clone status --porcelain) -join [Environment]::NewLine).Trim()){
    throw 'Updater gerou arquivo local nao rastreado ou modificou fontes.'
  }
  $saved=Get-Content (Join-Path $env:LOCALAPPDATA 'DarkStudio/code-path.txt')
  if($saved -ne $clone){throw 'Pasta persistida nao corresponde ao clone local.'}

  # Re-run updater from a detached directory using only cached path.
  $env:DARK_STUDIO_REPO_DIR=''
  Write-Host '[CI BAT] Localizando clone pela ultima pasta salva...'
  Invoke-Updater $script 0

  Write-Host '[CI BAT] Aceitar dados extras locais e preservar seus bytes...'
  Set-Content -Path (Join-Path $clone 'codex-notes.txt') -Value 'NAO APAGAR' -Encoding ASCII
  Set-Content -Path (Join-Path $clone 'direction.json') -Value '{"local":true}' -Encoding ASCII
  New-Item -ItemType Directory -Force (Join-Path $clone 'meus-videos') | Out-Null
  Set-Content -Path (Join-Path $clone 'meus-videos/roteiro.srt') -Value 'LEGENDA LOCAL' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'edition.txt') -Value 'rev-3' -Encoding ASCII
  Invoke-Git $src @('add','edition.txt')
  Invoke-Git $src @('commit','-m','rev 3')
  Invoke-Git $src @('push','origin','main')
  Invoke-Updater $script 0
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'rev-3') {
    throw 'Updater nao trouxe rev-3 com arquivos extras nao rastreados.'
  }
  if((Get-Content (Join-Path $clone 'codex-notes.txt')).Trim() -ne 'NAO APAGAR' -or
     (Get-Content (Join-Path $clone 'direction.json') -Raw) -notmatch '"local":true' -or
     (Get-Content (Join-Path $clone 'meus-videos/roteiro.srt')).Trim() -ne 'LEGENDA LOCAL') {
    throw 'Dados do usuario foram alterados pelo updater.'
  }

  Write-Host '[CI BAT] Bloquear modificacao de codigo rastreado...'
  Set-Content -Path (Join-Path $clone 'edition.txt') -Value 'EDICAO LOCAL DO CODEX' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'edition.txt') -Value 'rev-4' -Encoding ASCII
  Invoke-Git $src @('add','edition.txt')
  Invoke-Git $src @('commit','-m','rev 4')
  Invoke-Git $src @('push','origin','main')
  Invoke-Updater $script 1
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'EDICAO LOCAL DO CODEX') {
    throw 'Updater sobrescreveu arquivo versionado modificado.'
  }
  Write-Host '[CI BAT] Bloquear alteracao de codigo staged...'
  Invoke-Git $clone @('add','edition.txt')
  Invoke-Updater $script 1
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'EDICAO LOCAL DO CODEX') {
    throw 'Updater sobrescreveu arquivo staged.'
  }
  Invoke-Git $clone @('restore','--staged','edition.txt')
  Invoke-Git $clone @('restore','edition.txt')
  Invoke-Updater $script 0
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'rev-4') {
    throw 'Updater nao retomou apos restaurar somente o teste de codigo.'
  }

  Write-Host '[CI BAT] Git recusa sobrescrever um arquivo novo em conflito...'
  Set-Content -Path (Join-Path $clone 'novo-do-github.txt') -Value 'MEU ARQUIVO' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'novo-do-github.txt') -Value 'ARQUIVO REMOTO' -Encoding ASCII
  Invoke-Git $src @('add','novo-do-github.txt')
  Invoke-Git $src @('commit','-m','rev 5 conflito')
  Invoke-Git $src @('push','origin','main')
  Invoke-Updater $script 1
  if((Get-Content (Join-Path $clone 'novo-do-github.txt')).Trim() -ne 'MEU ARQUIVO') {
    throw 'Updater sobrescreveu arquivo local nao versionado em conflito.'
  }
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'rev-4') {
    throw 'Updater alterou o clone apesar do conflito.'
  }

  $opener=Get-Content (Join-Path $repo 'INICIAR.bat') -Raw
  if(-not $opener.Contains('npm run dev:desktop') -or
     -not $opener.Contains('scripts\ensure-service.ps1') -or
      $opener.Contains('electron-vite') -or
      $opener.Contains('call npm install') -or
      $opener -match '(?im)^\s*(call\s+)?git\s+(fetch|pull|merge|switch|clone)') {
    throw 'INICIAR nao deve atualizar a main nem instalar pacotes.'
  }
  foreach($file in @('ATUALIZAR.bat','INICIAR.bat')){
    $rootBat=[IO.File]::ReadAllBytes((Join-Path $repo $file))
    $windowsBat=[IO.File]::ReadAllBytes((Join-Path $repo "windows/$file"))
    if([Convert]::ToBase64String($rootBat) -ne [Convert]::ToBase64String($windowsBat)){
      throw "Copia em windows/ diferente do BAT raiz: $file"
    }
  }
  Write-Host '[CI BAT] OK: main com dados extras, bloqueio de codigo/conflitos e iniciar local.'
}
finally {
  $env:LOCALAPPDATA=$originalLocalAppData
  $env:DARK_STUDIO_REPO_DIR=$originalRepoVar
  $env:GIT_CONFIG_COUNT=$originalGitCount
  $env:GIT_CONFIG_KEY_0=$originalGitKey
  $env:GIT_CONFIG_VALUE_0=$originalGitValue
  Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
}

# A dirty-tree refusal is an EXPECTED exit 1. Do not propagate that native
# process exit code to the overall PowerShell CI step after all assertions pass.
exit 0
