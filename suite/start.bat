@echo off
setlocal

set "SUITE_DIR=%~dp0"

echo.
echo Iniciando Suite de Aplicacoes...
echo (aguarde, pode demorar na primeira vez)
echo.

:: Cria venv do hub se nao existir
cd /d "%SUITE_DIR%"
if not exist ".venv\Scripts\pythonw.exe" (
    echo [Suite] Criando ambiente virtual do Hub...
    python -m venv .venv
    echo [Suite] Instalando dependencias...
    .venv\Scripts\pip install -q flask pystray pillow
)

:: Roda o tray sem janela (pythonw)
echo [Suite] Iniciando icone na bandeja do sistema...
start "" .venv\Scripts\pythonw.exe tray.py

echo.
echo Pronto! Procure o icone da Suite perto do relogio.
echo Clique com o botao direito para acessar os apps ou encerrar.
echo.
timeout /t 4 /nobreak >nul
