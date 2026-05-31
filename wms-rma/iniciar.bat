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
    echo Instale Python 3.11 ou 3.12 em https://python.org
    echo Marque a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b 1
)

for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo Python %PYVER% encontrado.

:: Instala dependencias com --prefer-binary para evitar compilacao de source
echo Instalando dependencias (isso pode levar alguns minutos na primeira vez)...
python -m pip install -r requirements.txt --prefer-binary --quiet

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias.
    echo Tente rodar manualmente para ver o erro completo:
    echo   python -m pip install -r requirements.txt --prefer-binary
    echo.
    pause
    exit /b 1
)

echo Dependencias OK.
echo.
echo Iniciando sistema...
echo.

python run.py

echo.
pause
