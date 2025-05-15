# Script PowerShell para limpar o cache e reconstruir o projeto
Write-Host "Iniciando limpeza e reconstrução do projeto..." -ForegroundColor Cyan

# Verificar se a pasta .next existe
if (Test-Path ".next") {
    Write-Host "Removendo pasta .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host "Pasta .next removida com sucesso." -ForegroundColor Green
} else {
    Write-Host "Pasta .next não encontrada." -ForegroundColor Yellow
}

# Verificar se a pasta node_modules/.cache existe
if (Test-Path "node_modules/.cache") {
    Write-Host "Removendo cache do Node.js..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "Cache do Node.js removido com sucesso." -ForegroundColor Green
} else {
    Write-Host "Pasta node_modules/.cache não encontrada." -ForegroundColor Yellow
}

# Reconstruir o projeto
Write-Host "Reconstruindo o projeto..." -ForegroundColor Cyan
npm run build

Write-Host "Processo concluído!" -ForegroundColor Green
