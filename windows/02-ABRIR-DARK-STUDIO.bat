@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Dark Studio - Abrir editor local
color 0B

rem Adaptado do ABRIR_DESENVOLVIMENTO.bat do Native-gacha.
rem O Dark Studio usa Tauri 2, Vite e servico Node local, NAO Electron.
set "BASE=%~dp0"
set "PROJECT_DIR="

echo.
echo =====================================================
echo           DARK STUDIO - ABRIR LOCAL
echo =====================================================
echo.
call :MAIN
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
  echo.
  echo [ERRO] O editor nao iniciou corretamente.
  echo Nenhum projeto pessoal ou arquivo de midia foi removido.
  pause
)
exit /b %RESULT%

:MAIN
call :LOCATE_REPO
if not defined PROJECT_DIR (
  echo [ERRO] Clone Dark Studio nao localizado.
  echo Execute 01-INSTALAR-ATUALIZAR.bat ou informe a pasta correta.
  exit /b 1
)
cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo [ERRO] Nao consegui abrir a pasta do codigo.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Instale Node.js 22+ e npm: https://nodejs.org/
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao foi encontrado.
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js 22 ou superior e necessario.
  exit /b 1
)
where cargo >nul 2>&1
if errorlevel 1 if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
where cargo >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Rust/Cargo nao encontrado para compilar o app Tauri.
  echo Consulte https://v2.tauri.app/start/prerequisites/
  exit /b 1
)

rem Tal como no Native Gacha: instalar automaticamente so quando falta o binario.
if not exist "node_modules\.bin\tauri.cmd" (
  echo [1/3] Instalando dependencias na pasta local...
  call npm install --no-package-lock --no-audit --no-fund
  if errorlevel 1 (
    echo [ERRO] Nao consegui preparar node_modules.
    exit /b 1
  )
)
if not exist "node_modules\.bin\tauri.cmd" (
  echo [ERRO] CLI Tauri nao encontrada. Execute 01-INSTALAR-ATUALIZAR.bat.
  exit /b 1
)
if not exist "scripts\ensure-service.ps1" (
  echo [ERRO] Supervisor do servico local ausente. Atualize o codigo.
  exit /b 1
)

call :SAVE_LOCATION
echo Projeto: %PROJECT_DIR%
echo Dados pessoais: %%USERPROFILE%%\DarkStudio\projects
echo.
echo [2/3] Verificando a versao do servico local 127.0.0.1:4317...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\ensure-service.ps1"
if errorlevel 1 (
  echo [ERRO] Servico incompativel ou porta 4317 ocupada por outro programa.
  echo Feche apenas o servico antigo conhecido e tente novamente.
  exit /b 1
)

echo.
echo [3/3] Abrindo a janela Dark Studio (Tauri)...
echo Pode demorar na primeira compilacao. Mantenha esta janela aberta.
echo Para encerrar, feche o editor e esta janela.
echo.
rem Executar no terminal atual mostra erros em vez de fechar em silencio.
call npm run dev:desktop
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERRO] O Tauri retornou codigo %EXIT_CODE%.
  echo Verifique instalacao MSVC/C++ e a porta Vite 1420.
  exit /b %EXIT_CODE%
)
exit /b 0

:LOCATE_REPO
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
echo O codigo pode estar em qualquer pasta do computador.
set "MANUAL_REPO="
set /p "MANUAL_REPO=Digite o caminho do clone Dark Studio (Enter para cancelar): "
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
exit /b 0
