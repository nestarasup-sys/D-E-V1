@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Dark Studio - Abrir editor
color 0B

echo.
echo =======================================================
echo                 DARK STUDIO - ABRIR
echo =======================================================
echo.
call :MAIN
set "RESULT=%errorlevel%"
if not "%RESULT%"=="0" (
    echo.
    echo [ERRO] Nao foi possivel abrir. Veja o aviso acima.
    pause
)
exit /b %RESULT%

:MAIN
set "BASE=%~dp0"
set "PROJECT_DIR="

rem Funciona na raiz do repo, em repo\windows, ou fora dele.
if exist "%BASE%package.json" if exist "%BASE%.git" set "PROJECT_DIR=%BASE%"
if not defined PROJECT_DIR if exist "%BASE%..\package.json" if exist "%BASE%..\.git" set "PROJECT_DIR=%BASE%.."
if not defined PROJECT_DIR if exist "%BASE%D-E-V1\package.json" if exist "%BASE%D-E-V1\.git" set "PROJECT_DIR=%BASE%D-E-V1"

if not defined PROJECT_DIR (
    echo Dark Studio nao encontrado nesta pasta.
    echo Execute primeiro 01-INSTALAR-ATUALIZAR.bat.
    exit /b 1
)
if not exist "%PROJECT_DIR%\node_modules\.bin\tauri.cmd" (
    echo As dependencias nao foram instaladas.
    echo Execute primeiro 01-INSTALAR-ATUALIZAR.bat.
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo Node.js/npm nao foram encontrados. Execute o instalador primeiro.
    exit /b 1
)
where cargo >nul 2>&1
if errorlevel 1 if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
where cargo >nul 2>&1
if errorlevel 1 (
    echo Rust/Cargo nao encontrado. Execute 01-INSTALAR-ATUALIZAR.bat.
    echo Requisitos: https://v2.tauri.app/start/prerequisites/
    exit /b 1
)

echo Pasta do app: %PROJECT_DIR%
echo.
echo [1/2] Iniciando servidor LOCAL de projetos e midia...
powershell.exe -NoProfile -Command "try {$r=Invoke-RestMethod 'http://127.0.0.1:4317/health' -TimeoutSec 2; if($r.status -eq 'ready'){exit 0}}catch{}; exit 1" >nul 2>&1
if errorlevel 1 (
    start "Dark Studio - Servico local" /D "%PROJECT_DIR%" cmd.exe /k "npm run dev:service"
    if errorlevel 1 (
        echo [ERRO] Nao consegui iniciar o servico local.
        exit /b 1
    )
    timeout /t 4 /nobreak >nul
) else (
    echo [OK] Servico local ja esta ativo na porta 4317.
)

echo [2/2] Iniciando janela desktop Tauri...
start "Dark Studio - Editor" /D "%PROJECT_DIR%" cmd.exe /k "npm run dev:desktop"
if errorlevel 1 (
    echo [ERRO] Nao consegui iniciar o processo do editor.
    exit /b 1
)

echo.
echo [OK] Abertura solicitada. Duas janelas podem ficar abertas:
echo      - Servico local (projetos, midia e render)
echo      - Tauri desktop (interface)
echo Na primeira inicializacao, o Rust pode precisar compilar dependencias.
echo Mantenha as janelas abertas enquanto usa o Dark Studio.
echo Projetos ficam no seu Windows; nao passam pelo GitHub.
exit /b 0
