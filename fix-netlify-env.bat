@echo off
echo 🔧 Corrigindo variáveis de ambiente no Netlify...

REM Verificar se Netlify CLI está instalado
where netlify >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Netlify CLI não encontrado. Instalando...
    npm install -g netlify-cli
)

REM Fazer login no Netlify (se necessário)
echo 🔐 Verificando autenticação no Netlify...
netlify status || netlify login

REM Definir a chave correta do Supabase
echo 🔑 Aplicando SUPABASE_SERVICE_KEY correta...
netlify env:set SUPABASE_SERVICE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk"

REM Verificar outras variáveis importantes
echo 🔍 Verificando outras variáveis importantes...

netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://arzvingdtnttiejcvucs.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NDY3MjksImV4cCI6MjA2MDUyMjcyOX0.8OYE8Dg3haAxQ7p3MUiLJE_wiy2rCKsWiszMVwwo1LI"
netlify env:set DATABASE_URL "postgresql://postgres.arzvingdtnttiejcvucs:Caio%%402122%%40@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
netlify env:set JWT_SECRET "f033ca87f66377b65a90b4b510ff899fdb4c9bd1c5bc2b32731d97759c3815a8"
netlify env:set ADMIN_EMAIL "caio.correia@groupabz.com"
netlify env:set ADMIN_PHONE_NUMBER "+5522997847289"
netlify env:set ADMIN_PASSWORD "Caio@2122@"
netlify env:set ADMIN_FIRST_NAME "Caio"
netlify env:set ADMIN_LAST_NAME "Correia"
netlify env:set EMAIL_HOST "smtp.gmail.com"
netlify env:set EMAIL_PORT "465"
netlify env:set EMAIL_SECURE "true"
netlify env:set EMAIL_USER "apiabzgroup@gmail.com"
netlify env:set EMAIL_PASSWORD "zbli vdst fmco dtfc"
netlify env:set EMAIL_FROM "apiabzgroup@gmail.com"
netlify env:set NEXT_PUBLIC_APP_URL "https://portal.groupabz.com"
netlify env:set NEXT_PUBLIC_API_URL "https://portal.groupabz.com/api"

echo ✅ Variáveis de ambiente aplicadas!

REM Fazer novo deploy
echo 🚀 Iniciando novo deploy...
netlify deploy --prod

echo 🎉 Deploy iniciado! Verifique o progresso em: https://app.netlify.com/sites/painelabz/deploys

pause
