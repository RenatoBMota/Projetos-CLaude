@echo off
chcp 65001 >nul
title Instalação - Sistema de Transferência entre Filiais

echo.
echo ============================================================
echo   Sistema de Sugestão de Transferência entre Filiais
echo   Instalação de Dependências
echo ============================================================
echo.

:: Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não encontrado.
    echo.
    echo Por favor, instale o Python 3.8 ou superior:
    echo https://www.python.org/downloads/
    echo.
    echo Marque a opção "Add Python to PATH" durante a instalação.
    echo.
    pause
    exit /b 1
)

:: Exibir versão encontrada
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo [OK] %%i encontrado

echo.
echo [1/3] Atualizando pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo [AVISO] Nao foi possivel atualizar o pip. Continuando...
)

echo [OK] pip atualizado.
echo.
echo [2/3] Instalando dependências do requirements.txt...
echo.

python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependências.
    echo Verifique sua conexão com a internet e tente novamente.
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando instalação...
echo.

python -c "import flask; print('[OK] Flask', flask.__version__)"
if errorlevel 1 (
    echo [ERRO] Flask nao instalado corretamente.
    pause
    exit /b 1
)

python -c "import pandas; print('[OK] Pandas', pandas.__version__)"
if errorlevel 1 (
    echo [ERRO] Pandas nao instalado corretamente.
    pause
    exit /b 1
)

python -c "import openpyxl; print('[OK] OpenPyXL', openpyxl.__version__)"
if errorlevel 1 (
    echo [ERRO] OpenPyXL nao instalado corretamente.
    pause
    exit /b 1
)

python -c "import werkzeug; print('[OK] Werkzeug', werkzeug.__version__)"
if errorlevel 1 (
    echo [ERRO] Werkzeug nao instalado corretamente.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Instalação concluída com sucesso!
echo ============================================================
echo.
echo Para iniciar o sistema, execute o arquivo:
echo   iniciar.bat
echo.
echo Ou execute manualmente:
echo   python app.py
echo.
echo O sistema ficará disponível em:
echo   http://localhost:5000
echo.
pause
