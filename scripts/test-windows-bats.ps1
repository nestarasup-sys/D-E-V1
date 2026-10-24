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

  Copy-Item (Join-Path $repo '01-INSTALAR-ATUALIZAR.bat') (Join-Path $detached '01-INSTALAR-ATUALIZAR.bat')
  $script=Join-Path $detached '01-INSTALAR-ATUALIZAR.bat'
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

  Write-Host '[CI BAT] Verificando bloqueio de alteracao local...'
  Set-Content -Path (Join-Path $clone 'codex-notes.txt') -Value 'NAO APAGAR' -Encoding ASCII
  Set-Content -Path (Join-Path $src 'edition.txt') -Value 'rev-3' -Encoding ASCII
  Invoke-Git $src @('add','edition.txt')
  Invoke-Git $src @('commit','-m','rev 3')
  Invoke-Git $src @('push','origin','main')
  Invoke-Updater $script 1
  if((Get-Content (Join-Path $clone 'edition.txt')).Trim() -ne 'rev-2') {
    throw 'Updater alterou clone com trabalho do Codex.'
  }
  if((Get-Content (Join-Path $clone 'codex-notes.txt')).Trim() -ne 'NAO APAGAR') {
    throw 'Updater excluiu trabalho local.'
  }

  $opener=Get-Content (Join-Path $repo '02-ABRIR-DARK-STUDIO.bat') -Raw
  if(-not $opener.Contains('npm run dev:desktop') -or
     -not $opener.Contains('scripts\ensure-service.ps1') -or
      $opener.Contains('electron-vite')){
    throw 'Launcher nao esta adaptado a Tauri/servico local.'
  }
  Write-Host '[CI BAT] OK: main, diretorio arbitrario, persistencia e protecao de modificacoes.'
}
finally {
  $env:LOCALAPPDATA=$originalLocalAppData
  $env:DARK_STUDIO_REPO_DIR=$originalRepoVar
  $env:GIT_CONFIG_COUNT=$originalGitCount
  $env:GIT_CONFIG_KEY_0=$originalGitKey
  $env:GIT_CONFIG_VALUE_0=$originalGitValue
  Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
}
