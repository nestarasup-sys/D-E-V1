@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Dark Studio - Instalar e atualizar
color 0B

echo.
echo =======================================================
echo           DARK STUDIO - INSTALAR / ATUALIZAR
echo =======================================================
echo.
call :MAIN
set "RESULT=%errorlevel%"
echo.
if "%RESULT%"=="0" (
    echo [OK] Instalacao e verificacoes concluidas.
    echo Para abrir, use 02-ABRIR-DARK-STUDIO.bat.
) else (
    echo [ERRO] Processo interrompido. Leia as mensagens acima.
    echo Nenhum git reset ou git clean foi executado.
)
echo.
pause
exit /b %RESULT%

:MAIN
set "BASE=%~dp0"
set "PROJECT_DIR="

where git >nul 2>&1
if errorlevel 1 (
    call :OFFER_TOOL "Git.Git" "Git for Windows"
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    call :OFFER_TOOL "OpenJS.NodeJS.LTS" "Node.js LTS"
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    call :OFFER_TOOL "OpenJS.NodeJS.LTS" "Node.js LTS e npm"
    exit /b 1
)
set "NODE_MAJOR="
for /f "delims=" %%V in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
    echo [ERRO] Nao foi possivel conferir a versao do Node.js.
    exit /b 1
)
if %NODE_MAJOR% LSS 22 (
    echo [AVISO] Node.js 22 ou superior e recomendado. Encontrado: %NODE_MAJOR%.
    call :OFFER_TOOL "OpenJS.NodeJS.LTS" "Node.js LTS atualizado"
    exit /b 1
)

rem O BAT pode estar: dentro do repo; em repo\windows; ou numa pasta nova.
if exist "%BASE%package.json" if exist "%BASE%.git" set "PROJECT_DIR=%BASE%"
if not defined PROJECT_DIR if exist "%BASE%..\package.json" if exist "%BASE%..\.git" set "PROJECT_DIR=%BASE%.."
if not defined PROJECT_DIR if exist "%BASE%D-E-V1\package.json" if exist "%BASE%D-E-V1\.git" set "PROJECT_DIR=%BASE%D-E-V1"

if not defined PROJECT_DIR (
    if exist "%BASE%D-E-V1" (
        echo [ERRO] A pasta D-E-V1 ja existe, mas nao parece ser um clone valido.
        echo Verifique essa pasta manualmente. Nao apagarei nada.
        exit /b 1
    )
    echo [1/5] Baixando o codigo na subpasta D-E-V1...
    git clone --branch main --single-branch "https://github.com/nestarasup-sys/D-E-V1.git" "%BASE%D-E-V1"
    if errorlevel 1 (
        echo [ERRO] Falha no clone. Confira internet, Git e pasta de destino.
        exit /b 1
    )
    set "PROJECT_DIR=%BASE%D-E-V1"
)

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo [ERRO] Nao consegui acessar a pasta do Dark Studio.
    exit /b 1
)
if not exist "package.json" (
    echo [ERRO] package.json nao encontrado. Pasta invalida.
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Esta pasta nao e um repositorio Git valido.
    exit /b 1
)
git remote get-url origin 2>nul | findstr /I /C:"nestarasup-sys/D-E-V1" >nul
if errorlevel 1 (
    echo [ERRO] O remote origin nao aponta para nestarasup-sys/D-E-V1.
    echo Nao farei atualizacoes em repositorios desconhecidos.
    exit /b 1
)
set "BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
    echo [ERRO] Branch atual: %BRANCH%. Use a branch main antes de atualizar.
    echo Nao criarei ou trocarei branches automaticamente.
    exit /b 1
)

git diff --quiet
if errorlevel 1 (
    echo [ATENCAO] Ha mudancas locais nao salvas em commit.
    echo O atualizador NAO vai sobrescrever seu trabalho.
    git status --short
    exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
    echo [ATENCAO] Ha mudancas preparadas para commit.
    echo O atualizador NAO vai sobrescrever seu trabalho.
    git status --short
    exit /b 1
)

echo.
echo [2/5] Atualizando o codigo pelo GitHub (sem apagar arquivos)...
git pull --ff-only origin main
if errorlevel 1 (
    echo [ERRO] Nao foi possivel atualizar. Nenhum reset/clean sera feito.
    echo Confira a conexao e rode "git status" para diagnostico.
    exit /b 1
)

echo.
echo [3/5] Instalando dependencias do projeto...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo [ERRO] npm install falhou. Confira Node, rede e logs acima.
    exit /b 1
)

echo.
echo [4/5] Conferindo TypeScript, testes e build...
call npm run check
if errorlevel 1 exit /b 1
call npm test
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1

echo.
echo [5/5] Verificando requisitos do editor desktop...
where cargo >nul 2>&1
if errorlevel 1 if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
where cargo >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Rust/Cargo nao foi encontrado.
    call :OFFER_TOOL "Rustlang.Rustup" "Rust para o Tauri"
    exit /b 1
)

rem Visual Studio C++ Build Tools pode estar instalado sem cl.exe no PATH.
powershell.exe -NoProfile -Command "$v=Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft Visual Studio\Installer\vswhere.exe'; if(Test-Path $v){ $p=(& $v -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath); if($p){exit 0} }; exit 1" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Microsoft C++ Build Tools nao foi detectado.
    echo O Tauri precisa do componente 'Desktop development with C++'.
    echo Guia oficial: https://v2.tauri.app/start/prerequisites/
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo.
        choice /C SN /N /M "Deseja instalar o C++ Build Tools agora (download grande)? [S/N] "
        if errorlevel 2 (
            echo [AVISO] Instalacao do C++ ignorada. O desktop pode nao compilar.
            exit /b 1
        )
        winget install --id Microsoft.VisualStudio.BuildTools -e --source winget --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-package-agreements --accept-source-agreements
        if errorlevel 1 (
            echo [ERRO] A instalacao do C++ falhou; confira o instalador da Microsoft.
            exit /b 1
        )
        echo [OK] Instalador do C++ executado. Reabra os terminais e rode este BAT de novo.
        exit /b 1
    )
    echo Instale manualmente pelo guia oficial acima.
    exit /b 1
)

echo.
echo Projeto instalado em: %PROJECT_DIR%
echo Projetos do usuario ficam FORA deste repo: %%USERPROFILE%%\DarkStudio\projects
echo GitHub e usado somente para atualizar o CODIGO, nunca os projetos pessoais.
exit /b 0

:OFFER_TOOL
set "APP_ID=%~1"
set "APP_NAME=%~2"
echo.
echo [FALTA] %APP_NAME% nao esta disponivel no terminal.
where winget >nul 2>&1
if errorlevel 1 (
    echo Instale %APP_NAME% manualmente e execute este BAT novamente.
    echo https://v2.tauri.app/start/prerequisites/
    exit /b 1
)
choice /C SN /N /M "Deseja instalar %APP_NAME% via winget? [S/N] "
if errorlevel 2 (
    echo Instalacao cancelada pelo usuario.
    exit /b 1
)
winget install --id "%APP_ID%" -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo [ERRO] Falha instalando %APP_NAME%. Tente manualmente.
    exit /b 1
)
echo [OK] Instalador executado. Feche e reabra o terminal, depois rode este BAT novamente.
exit /b 0
