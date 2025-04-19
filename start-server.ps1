# Script PowerShell para iniciar o servidor unificado

# Função para mostrar informações no terminal
function Write-Info {
    param (
        [string]$Message
    )
    Write-Host $Message -ForegroundColor Cyan
}

# Função para mostrar erros
function Write-Error {
    param (
        [string]$Message
    )
    Write-Host $Message -ForegroundColor Red
}

# Construir a aplicação
Write-Info "Construindo a aplicação..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao construir a aplicação. Abortando..."
    exit 1
}

# Iniciar o servidor na porta 80
Write-Info "Iniciando o servidor na porta 80..."
Write-Info "Você pode acessar o painel em http://localhost"
Write-Info "Formulário de reembolso disponível em http://localhost/reembolso-form"
Write-Info "Pressione Ctrl+C para encerrar o servidor"
npm run start:80