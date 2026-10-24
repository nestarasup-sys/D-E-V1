@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Dark Studio - Atualizar codigo main
color 0B

rem Adaptado do ATUALIZAR_DESENVOLVIMENTO.bat do Native-gacha.
rem Atualiza SOMENTE codigo-fonte; NUNCA faz reset, clean, rebase ou exclusao.
set "BRANCH=main"
set "REMOTE_REPO=https://github.com/nestarasup-sys/D-E-V1.git"
set "BASE=%~dp0"
set "PROJECT_DIR="

echo.
echo =====================================================
echo       DARK STUDIO - ATUALIZAR MAIN
echo =====================================================
echo.
call :MAIN
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo [OK] Codigo atualizado. Abra 02-ABRIR-DARK-STUDIO.bat.
) else (
  echo [ATENCAO] Atualizacao interrompida.
  echo Nenhum git reset, git clean ou rebase foi executado.
  echo Seus projetos em %%USERPROFILE%%\DarkStudio estao preservados.
)
echo.
pause
exit /b %RESULT%

:MAIN
where git >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Instale Git for Windows: https://git-scm.com/downloads/win
  exit /b 1
)

call :LOCATE_REPO
if not defined PROJECT_DIR (
  if exist "%BASE%D-E-V1" (
    echo [ERRO] D-E-V1 existe ao lado deste BAT, mas nao e um clone reconhecido.
    echo Nao vou sobrescrever essa pasta.
    exit /b 1
  )
  echo [1/3] Nao achei um clone local. Clonando a branch main...
  git clone --branch main --single-branch "%REMOTE_REPO%" "%BASE%D-E-V1"
  if errorlevel 1 (
    echo [ERRO] Clone falhou. Verifique internet, acesso ao GitHub e destino.
    exit /b 1
  )
  call :CHECK_REPO "%BASE%D-E-V1"
)

if not defined PROJECT_DIR (
  echo [ERRO] Repositorio Dark Studio nao encontrado.
  exit /b 1
)
cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo [ERRO] Nao consegui acessar a pasta do repositorio.
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Esta pasta nao e um clone Git valido.
  exit /b 1
)
git config --get remote.origin.url 2>nul | findstr /i /c:"nestarasup-sys/D-E-V1" >nul
if errorlevel 1 (
  echo [ERRO] O origin nao e nestarasup-sys/D-E-V1. Nao atualizarei outro repositorio.
  exit /b 1
)

echo Projeto local: %PROJECT_DIR%
echo Repositorio: %REMOTE_REPO%
echo Branch de atualizacao: %BRANCH%
echo.
rem Inclui modificacoes, staged e arquivos novos nao ignorados.
rem Usa arquivo temporario para nao depender de FOR /F sobre comando aninhado do CMD.
rem Nao destrua trabalho ainda nao commitado do Codex.
set "STATUS_FILE=%TEMP%\dark-studio-git-status-%RANDOM%-%RANDOM%.txt"
git status --porcelain --untracked-files=all > "%STATUS_FILE%"
if errorlevel 1 (
  if exist "%STATUS_FILE%" del /q "%STATUS_FILE%" >nul 2>&1
  echo [ERRO] Nao consegui verificar o estado do Git. Nada sera atualizado.
  exit /b 1
)
for %%F in ("%STATUS_FILE%") do if %%~zF GTR 0 goto :DIRTY
del /q "%STATUS_FILE%" >nul 2>&1

echo [2/3] Buscando a versao atual do GitHub...
git fetch origin "refs/heads/%BRANCH%:refs/remotes/origin/%BRANCH%"
if errorlevel 1 (
  echo [ERRO] Nao consegui buscar a branch main.
  exit /b 1
)

rem O Dark Studio so usa main. Nenhuma branch alternativa sera criada.
git show-ref --quiet --verify "refs/heads/%BRANCH%"
if errorlevel 1 (
  echo [ERRO] A branch main nao existe neste clone.
  echo Verifique o clone com o Codex antes de mudar branches.
  exit /b 1
)
git switch "%BRANCH%"
if errorlevel 1 (
  echo [ERRO] Nao consegui selecionar main de forma segura.
  exit /b 1
)
git branch --set-upstream-to="origin/%BRANCH%" "%BRANCH%" >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Nao consegui configurar upstream origin/main.
  exit /b 1
)

rem Fast-forward estrito: nunca apaga commits locais nem cria merge automatico.
git merge --ff-only "origin/%BRANCH%"
if errorlevel 1 (
  echo [ERRO] Historico local divergiu de origin/main.
  echo Os commits locais foram preservados. Peca ao Codex para conciliar.
  exit /b 1
)
echo.
echo [3/3] Preparando dependencias atualizadas...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js 22+ nao encontrado: https://nodejs.org/
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Reinstale Node.js.
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Dark Studio exige Node.js 22 ou superior.
  exit /b 1
)
rem --no-package-lock evita criar package-lock.json nao versionado (repo sem lock).
call npm install --no-package-lock --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] npm install falhou. Codigo atualizado, dependencias pendentes.
  exit /b 1
)

call :SAVE_LOCATION
echo.
echo [OK] Branch ativa:
git branch --show-current
echo [OK] Commit local:
git log -1 --format="%%h - %%s"
echo.
echo Feche as janelas antigas do editor ANTES de iniciar a versao nova.
exit /b 0

:DIRTY
if defined STATUS_FILE if exist "%STATUS_FILE%" del /q "%STATUS_FILE%" >nul 2>&1
echo [BLOQUEADO] Existem mudancas locais ou arquivos novos no clone:
git status --short
echo.
echo Nada foi descartado. Peca ao Codex para fazer commit ou guardar as alteracoes.
echo Se aparecer package-lock.json de instalacao antiga, mova-o para backup
echo SOMENTE apos conferir que nao ha trabalho importante nele.
exit /b 1

:LOCATE_REPO
rem Detecta: variavel opcional, pasta do BAT, subpasta windows, clone irmao,
rem diretorio de execucao e ultima localizacao salva. Funciona com pasta renomeada.
if defined DARK_STUDIO_REPO_DIR call :CHECK_REPO "%DARK_STUDIO_REPO_DIR%"
if not defined PROJECT_DIR call :CHECK_REPO "%BASE%"
if not defined PROJECT_DIR call :CHECK_REPO "%BASE%.."
if not defined PROJECT_DIR call :CHECK_REPO "%BASE%D-E-V1"
if not defined PROJECT_DIR if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\DarkStudio\code-path.txt" (
  for /f "usebackq delims=" %%R in ("%LOCALAPPDATA%\DarkStudio\code-path.txt") do if not defined PROJECT_DIR call :CHECK_REPO "%%R"
)
if not defined PROJECT_DIR call :CHECK_REPO "%CD%"
if not defined PROJECT_DIR call :PROMPT_PATH
exit /b 0

:PROMPT_PATH
echo Pasta local nao identificada automaticamente.
set "MANUAL_REPO="
set /p "MANUAL_REPO=Digite a pasta do clone, ou Enter para instalar em D-E-V1: "
if defined MANUAL_REPO call :CHECK_REPO "%MANUAL_REPO%"
exit /b 0

:CHECK_REPO
if not exist "%~1\package.json" exit /b 0
if not exist "%~1\src-tauri\tauri.conf.json" exit /b 0
if not exist "%~1\.git" exit /b 0
for %%I in ("%~1") do set "PROJECT_DIR=%%~fI"
exit /b 0

:SAVE_LOCATION
if not defined LOCALAPPDATA exit /b 0
powershell.exe -NoProfile -Command "try { $d=Join-Path $env:LOCALAPPDATA 'DarkStudio'; [IO.Directory]::CreateDirectory($d) | Out-Null; [IO.File]::WriteAllText((Join-Path $d 'code-path.txt'),$env:PROJECT_DIR,[Text.UTF8Encoding]::new($false)) } catch { exit 1 }" >nul 2>&1
if errorlevel 1 echo [AVISO] Nao consegui registrar o caminho. O BAT continua funcionando na pasta do repo.
exit /b 0
