@echo off
echo 🔧 Corrigindo URL do Netlify para portal.groupabz.com
echo ==================================================

REM Verificar se o Netlify CLI está instalado
where netlify >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Netlify CLI não encontrado. Instalando...
    npm install -g netlify-cli
)

REM Fazer login no Netlify (se necessário)
echo 🔐 Verificando autenticação no Netlify...
netlify status

REM Atualizar as variáveis de ambiente com a URL correta
echo 🌐 Atualizando variáveis de ambiente...

netlify env:set NEXT_PUBLIC_APP_URL "https://portal.groupabz.com"
netlify env:set NEXT_PUBLIC_API_URL "https://portal.groupabz.com/api"

echo ✅ URLs atualizadas com sucesso!

REM Fazer novo deploy
echo 🚀 Iniciando novo deploy...
netlify deploy --prod

echo 🎉 Deploy iniciado! Verifique o progresso em: https://app.netlify.com/sites/painelabzgroup/deploys
echo.
echo 📧 Após o deploy, os links de verificação de email usarão a URL correta:
echo    https://portal.groupabz.com/verify-email?token=...
echo.
echo ✅ Problema resolvido!

pause
