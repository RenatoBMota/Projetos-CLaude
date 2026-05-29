@echo off
cd /d "%~dp0"
echo Rodando em modo debug - nao feche esta janela...
echo.
.venv\Scripts\python.exe tray.py
echo.
echo Processo encerrado. Verifique o erro acima.
pause
