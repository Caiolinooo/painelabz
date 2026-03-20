# Script de Validação de Build ABZ Portal
Write-Host "Iniciando validação de build local..." -ForegroundColor Cyan

# 1. Validar Tipos (TSC)
Write-Host "Passo 1: Validando tipos com tsc..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Falha na validação de tipos (TSC)." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Validar Linting (Opcional)
Write-Host "Passo 2: Executando Lint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "Aviso: Lint encontrou problemas, mas continuando..." -ForegroundColor Gray
}

Write-Host "Sucesso: Validação concluída com sucesso!" -ForegroundColor Green
