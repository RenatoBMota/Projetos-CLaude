@echo off
title WMS RMA Enterprise
cd /d "%~dp0"

echo.
echo ============================================================
echo   WMS RMA Enterprise - Verificando ambiente...
echo ============================================================
echo.

:: Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado no PATH.
    echo Instale Python 3.9+ em https://python.org
    echo Marque a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b 1
)

:: Verifica/instala dependencias
echo Verificando dependencias...
python -m pip install -r requirements.txt --quiet 2>&1
if errorlevel 1 (
    echo [AVISO] Alguns pacotes podem nao ter sido instalados.
)

echo.
echo Iniciando sistema...
echo.

python run.py

echo.
pause
