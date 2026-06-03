@echo off
chcp 65001 >nul
title Sistema de Transferência entre Filiais

echo.
echo ============================================================
echo   Sistema de Sugestão de Transferência entre Filiais
echo ============================================================
echo.

:: Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não encontrado.
    echo Execute primeiro o arquivo instalar.bat
    echo.
    pause
    exit /b 1
)

:: Verificar se Flask está instalado
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Dependências não instaladas.
    echo Execute primeiro o arquivo instalar.bat
    echo.
    pause
    exit /b 1
)

echo Iniciando o servidor...
echo.
echo Acesse no navegador: http://localhost:5000
echo.
echo Para encerrar o sistema, feche esta janela ou pressione Ctrl+C
echo.
echo ============================================================
echo.

:: Abrir navegador automaticamente após 2 segundos
start /b cmd /c "timeout /t 2 >nul && start http://localhost:5000"

:: Iniciar o servidor Flask
python app.py

echo.
echo Servidor encerrado.
pause
