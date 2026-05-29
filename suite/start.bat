@echo off
setlocal

set "SUITE_DIR=%~dp0"
set HUB_PORT=5000
set WMS_PORT=5001
set SCV_PORT=5002

echo.
echo ============================================================
echo   Suite de Aplicacoes
echo ============================================================
echo   Hub     -^> http://localhost:%HUB_PORT%
echo   WMS RMA -^> http://localhost:%WMS_PORT%  (admin@wms.com / admin123)
echo   SCV     -^> http://localhost:%SCV_PORT%
echo   Feche esta janela para encerrar todos
echo ============================================================
echo.

:: --- WMS RMA ---
cd /d "%SUITE_DIR%wms-rma"
if not exist ".venv\Scripts\python.exe" (
    echo [WMS] Criando ambiente virtual...
    python -m venv .venv
    echo [WMS] Instalando dependencias...
    .venv\Scripts\pip install -q -r requirements.txt
)
echo [WMS] Iniciando na porta %WMS_PORT%...
start "WMS-RMA (porta %WMS_PORT%)" cmd /k ".venv\Scripts\python run.py"

:: --- SCV ---
cd /d "%SUITE_DIR%scv"
if not exist ".venv\Scripts\python.exe" (
    echo [SCV] Criando ambiente virtual...
    python -m venv .venv
    echo [SCV] Instalando dependencias...
    .venv\Scripts\pip install -q -r requirements.txt
)
echo [SCV] Iniciando na porta %SCV_PORT%...
start "SCV (porta %SCV_PORT%)" cmd /k "set SCV_PORT=%SCV_PORT% && .venv\Scripts\python app.py"

:: --- Hub ---
cd /d "%SUITE_DIR%"
if not exist ".venv\Scripts\python.exe" (
    echo [Hub] Criando ambiente virtual...
    python -m venv .venv
    .venv\Scripts\pip install -q flask
)
echo [Hub] Iniciando na porta %HUB_PORT%...

:: Aguarda 3 segundos e abre o browser
timeout /t 3 /nobreak >nul
start http://localhost:%HUB_PORT%

start "Hub Suite (porta %HUB_PORT%)" cmd /k "set HUB_PORT=%HUB_PORT% && .venv\Scripts\python hub.py"

echo.
echo Todos os servicos iniciados! Feche as janelas de cada app para encerrar.
pause
