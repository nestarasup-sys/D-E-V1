# Dark Studio v0.13 -- supervisor seguro do serviço LOCAL.
# Nunca recebe um caminho de projeto com barra final entre aspas.
# Só reinicia um processo com assinatura reconhecida do Dark Studio, do mesmo usuário.
param()
$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\','/')
$expectedBuild = 'dark-studio-v0.13-service-contract-3'
$expectedProtocol = 3
$healthUrl = 'http://127.0.0.1:4317/health'

function Get-ServiceHealth {
  try { return Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 -ErrorAction Stop }
  catch { return $null }
}
function Normalize-Path([string]$path) {
  if (-not $path) { return '' }
  try { return [System.IO.Path]::GetFullPath($path).TrimEnd('\','/').ToLowerInvariant() }
  catch { return '' }
}
function Test-Expected([object]$health) {
  return ($null -ne $health -and $health.status -eq 'ready' -and
    $health.service -eq 'dark-studio-local' -and
    $health.apiProtocol -eq $expectedProtocol -and
    $health.build -eq $expectedBuild -and
    (Normalize-Path ([string]$health.workspace)) -eq (Normalize-Path $repo))
}
function Find-Listener {
  try {
    $items = @(Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction Stop |
      Where-Object { $_.LocalAddress -eq '127.0.0.1' -or $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' })
    if ($items.Count -eq 0) { return $null }
    return $items[0]
  } catch { return $null }
}
function Test-OurProcess([int]$processId,[object]$health) {
  try {
    $p = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId = $processId" -ErrorAction Stop
    if ($null -eq $p -or $p.Name -notmatch '^node(\.exe)?$') { return $false }
    $commandLine = [string]$p.CommandLine
    if ($commandLine -notmatch 'apps[\\/]agent[\\/]src[\\/]index\.ts') { return $false }
    $owner = Invoke-CimMethod -InputObject $p -MethodName GetOwner -ErrorAction Stop
    if ([string]$owner.User -ine [string]$env:USERNAME) { return $false }
    # Se o processo novo declara outro workspace, não é desta instalação.
    if ($null -ne $health -and $health.service -eq 'dark-studio-local' -and
        (Normalize-Path ([string]$health.workspace)) -ne (Normalize-Path $repo)) { return $false }
    return $true
  } catch { return $false }
}

$health = Get-ServiceHealth
if (Test-Expected $health) {
  Write-Host ('[OK] Servico ' + $health.appVersion + ' compativel. PID ' + $health.pid)
  exit 0
}
$listener = Find-Listener
if ($null -ne $listener) {
  $knownService = ($null -ne $health -and $health.status -eq 'ready' -and
    ($health.mode -eq 'local-project-service' -or $health.service -eq 'dark-studio-local'))
  if (-not $knownService -or -not (Test-OurProcess ([int]$listener.OwningProcess) $health)) {
    Write-Host '[ERRO] A porta 4317 esta ocupada por um processo que nao pode ser identificado com seguranca.'
    Write-Host 'Nao vou encerrar outro programa. Feche o servico antigo manualmente e execute o BAT de novo.'
    exit 2
  }
  Write-Host ('[INFO] Servico Dark Studio antigo/incompativel detectado (PID ' + $listener.OwningProcess + ').')
  Write-Host '       Reiniciando somente o processo identificado como nosso.'
  try { Stop-Process -Id ([int]$listener.OwningProcess) -Force -ErrorAction Stop }
  catch {
    Write-Host ('[ERRO] Nao foi possivel encerrar o servico antigo: ' + $_.Exception.Message)
    exit 3
  }
  $released = $false
  for ($i=0; $i -lt 25; $i++) {
    Start-Sleep -Milliseconds 300
    if ($null -eq (Find-Listener)) { $released = $true; break }
  }
  if (-not $released) {
    Write-Host '[ERRO] A porta 4317 permaneceu ocupada. Feche o processo manualmente.'
    exit 4
  }
}
elseif ($null -ne $health) {
  # Uma resposta HTTP em 4317 mas sem ownership confirmado não pode ser encerrada.
  Write-Host '[ERRO] A porta 4317 responde com uma versao incompatível ou desconhecida.'
  Write-Host 'Feche a janela do servico anterior, depois tente novamente.'
  exit 5
}

Write-Host '[INFO] Iniciando servico local a partir deste repositorio...'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k npm run dev:service' -WorkingDirectory $repo
for ($i=0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 350
  $current = Get-ServiceHealth
  if (Test-Expected $current) {
    Write-Host ('[OK] Servico atualizado ativo: ' + $current.appVersion + ' (PID ' + $current.pid + ')')
    exit 0
  }
  if ($null -ne $current -and $current.status -eq 'ready' -and -not (Test-Expected $current)) {
    Write-Host '[ERRO] Um servico diferente respondeu na porta 4317. Verifique a janela aberta.'
    exit 6
  }
}
Write-Host '[ERRO] O servico nao ficou compativel. Verifique a janela do Node e eventuais erros.'
exit 7
