@echo off
echo Iniciando servidor unificado...

echo.
echo === Construindo a aplicação ===
cd %~dp0
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Erro ao construir a aplicação. Abortando...
    exit /b %ERRORLEVEL%
)

echo.
echo === Iniciando o servidor na porta 80 ===
echo Você pode acessar o painel em http://localhost
echo Formulário de reembolso disponível em http://localhost/reembolso-form
echo Pressione Ctrl+C para encerrar o servidor
call npm run start:80