@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Suite de Aplicacoes - Iniciando...
echo ============================================================
echo.

:: Verifica se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado. Instale em python.org
    pause
    exit /b 1
)

:: Cria venv do Hub/Tray se nao existir
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Criando ambiente virtual...
    python -m venv .venv
    if errorlevel 1 ( echo ERRO ao criar venv & pause & exit /b 1 )
)

:: Instala dependencias do hub
echo [2/3] Verificando dependencias...
.venv\Scripts\pip install -q flask pystray pillow 2>nul
if errorlevel 1 (
    echo Tentando instalacao sem -q...
    .venv\Scripts\pip install flask pystray pillow
    if errorlevel 1 ( echo ERRO ao instalar dependencias & pause & exit /b 1 )
)

:: WMS-RMA - cria venv e instala deps (sempre garante que estao instaladas)
echo [3/4] Configurando WMS-RMA...
if not exist "wms-rma\.venv\Scripts\python.exe" python -m venv wms-rma\.venv
wms-rma\.venv\Scripts\pip install -q -r wms-rma\requirements.txt
if errorlevel 1 ( echo ERRO ao instalar deps do WMS & pause & exit /b 1 )

:: SCV - cria venv e instala deps
echo [4/4] Configurando SCV...
if not exist "scv\.venv\Scripts\python.exe" python -m venv scv\.venv
scv\.venv\Scripts\pip install -q -r scv\requirements.txt
if errorlevel 1 ( echo ERRO ao instalar deps do SCV & pause & exit /b 1 )

echo.
echo Iniciando icone na bandeja do sistema...
echo Se nao aparecer, verifique suite_error.log nesta pasta.
echo.

:: Roda o tray sem janela
start "" .venv\Scripts\pythonw.exe tray.py

timeout /t 5 /nobreak >nul
echo Pronto! Procure o icone perto do relogio (pode estar em ^"mostrar icones ocultos^" ^(seta ^)).
pause
