@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Dark Studio - Abrir editor
color 0B
echo.
echo =======================================================
echo          DARK STUDIO - INICIALIZACAO SEGURA
echo =======================================================
echo.
call :MAIN
set "RESULT=%errorlevel%"
if not "%RESULT%"=="0" (
    echo.
    echo [ERRO] Falha ao abrir. O programa nao apagou projetos nem reiniciou processos desconhecidos.
    pause
)
exit /b %RESULT%

:MAIN
set "BASE=%~dp0"
set "PROJECT_DIR="
if exist "%BASE%package.json" if exist "%BASE%.git" set "PROJECT_DIR=%BASE%"
if not defined PROJECT_DIR if exist "%BASE%..\package.json" if exist "%BASE%..\.git" set "PROJECT_DIR=%BASE%.."
if not defined PROJECT_DIR if exist "%BASE%D-E-V1\package.json" if exist "%BASE%D-E-V1\.git" set "PROJECT_DIR=%BASE%D-E-V1"
if not defined PROJECT_DIR (
    echo Repositorio D-E-V1 nao encontrado. Execute 01-INSTALAR-ATUALIZAR.bat.
    exit /b 1
)
for %%I in ("%PROJECT_DIR%") do set "PROJECT_DIR=%%~fI"
if not exist "%PROJECT_DIR%\node_modules\.bin\tauri.cmd" (
    echo Dependencias nao instaladas. Execute 01-INSTALAR-ATUALIZAR.bat.
    exit /b 1
)
if not exist "%PROJECT_DIR%\scripts\ensure-service.ps1" (
    echo Supervisor local ausente. Atualize o codigo via GitHub antes de abrir.
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo Node.js/npm nao encontrados.
    exit /b 1
)
where cargo >nul 2>&1
if errorlevel 1 if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
where cargo >nul 2>&1
if errorlevel 1 (
    echo Rust/Cargo nao encontrado. Execute 01-INSTALAR-ATUALIZAR.bat.
    exit /b 1
)
echo Pasta do editor: %PROJECT_DIR%
echo.
echo [1/2] Verificando versao e processo do servico local...
rem O caminho enviado termina em .ps1, nao em barra invertida:
rem evita o bug de aspas com diretorios terminados em \.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\ensure-service.ps1"
if errorlevel 1 (
    echo [ERRO] Servico local antigo ou indisponivel. Veja o aviso acima.
    exit /b 1
)
echo.
echo [2/2] Abrindo a interface Tauri...
start "Dark Studio - Editor" /D "%PROJECT_DIR%" cmd.exe /k "npm run dev:desktop"
if errorlevel 1 (
    echo [ERRO] Nao consegui abrir a janela do editor.
    exit /b 1
)
echo.
echo [OK] Servico compativel e editor solicitado.
echo Seus projetos continuam em %%USERPROFILE%%\DarkStudio\projects.
exit /b 0
