#!/bin/bash
# ==========================================
# ABZ VOICE MANAGER — 100% LOCAL (L4 + XEON)
# Versão corrigida com:
#   - Env vars propagando para tmux
#   - Health checks antes de iniciar agente
#   - LiveKit Agents v1.0 API
#   - LLM em localhost
# ==========================================

SESSION_NAME="abz_voice"
DIR_AGENT="$HOME/Desktop/abz-voice-local"

# Comando do Llama.cpp (LLM na GPU L4)
# Host em 127.0.0.1 (mesma máquina)
LLM_CMD="cd ~/Desktop/llama.cpp/build/bin && ./llama-server \
  --host 0.0.0.0 \
  --api-key Caio@2122@ \
  --reasoning-effort auto \
  --reasoning-budget 8950 \
  --n-gpu-layers 999 \
  --no-mmap \
  --n-cpu-moe 6 \
  -fa on \
  --mlock \
  --tools all \
  --jinja \
  -m /home/caio/.lmstudio/models/lmstudio-community/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-Q4_K_M.gguf \
  --mmproj /home/caio/.lmstudio/models/lmstudio-community/Qwen3.6-35B-A3B-GGUF/mmproj-Qwen3.6-35B-A3B-BF16.gguf"

# Chaves do LiveKit (Portal ABZ)
LIVEKIT_URL="wss://portal-abz-rdbjrm3k.livekit.cloud"
LIVEKIT_API_KEY="APIKC4wx7jB6jR9"
LIVEKIT_API_SECRET="y6f1fKwCG1VKcZxhHsvu3ZiBfVrdxpKUnqeFQ0e1j71D"

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ==========================================
# UTILITÁRIO: Gera arquivo .env para o tmux
# ==========================================
write_env_file() {
    cat > "$DIR_AGENT/.env" << ENVEOF
export LIVEKIT_URL="${LIVEKIT_URL}"
export LIVEKIT_API_KEY="${LIVEKIT_API_KEY}"
export LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET}"
export LLM_BASE_URL="http://127.0.0.1:8080/v1"
export LLM_API_KEY="Caio@2122@"
export AUDIO_BASE_URL="http://127.0.0.1:8001/v1"
ENVEOF
    echo -e "${GREEN}[OK]${NC} Arquivo .env gerado em $DIR_AGENT/.env"
}

# ==========================================
# UTILITÁRIO: Aguarda um serviço ficar online
# ==========================================
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null)
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}[ONLINE]${NC} $name respondendo em $url"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -ne "\r${YELLOW}[AGUARDANDO]${NC} $name... ($attempt/$max_attempts)   "
        sleep 5
    done

    echo -e "\n${RED}[TIMEOUT]${NC} $name não respondeu após $((max_attempts * 5))s."
    return 1
}

# ==========================================
# 1. INSTALAÇÃO E CONFIGURAÇÃO
# ==========================================
check_and_install() {
    clear
    echo -e "${CYAN}=== 1/5. Instalando Dependências de Sistema ===${NC}"
    for pkg in ffmpeg tmux htop python3-venv python3-pip wget curl; do
        if ! dpkg -l | grep -q "^ii  $pkg "; then
            echo -e "${YELLOW}[INSTALANDO]${NC} $pkg..."
            sudo apt-get install -y $pkg
        else
            echo -e "${GREEN}[OK]${NC} $pkg"
        fi
    done

    echo -e "\n${CYAN}=== 2/5. Configurando Ambiente Python ===${NC}"
    mkdir -p "$DIR_AGENT/models"
    if [ ! -d "$DIR_AGENT/venv" ]; then
        python3 -m venv "$DIR_AGENT/venv"
    fi
    source "$DIR_AGENT/venv/bin/activate"

    echo -e "\n${CYAN}=== 3/5. Baixando Modelo de Voz TTS ===${NC}"
    if [ ! -f "$DIR_AGENT/models/pt_BR-faber-medium.onnx" ]; then
        echo -e "${YELLOW}[BAIXANDO]${NC} Modelo Piper Faber PT-BR..."
        wget -q --show-progress -c -P "$DIR_AGENT/models/" \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx
        wget -q --show-progress -c -P "$DIR_AGENT/models/" \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json
    else
        echo -e "${GREEN}[OK]${NC} Modelos TTS já baixados."
    fi

    echo -e "\n${CYAN}=== 4/5. Instalando Bibliotecas Python (LiveKit v1.0+) ===${NC}"
    pip install --upgrade pip > /dev/null
    pip install --upgrade \
        "livekit-agents[openai,silero]>=1.0.0" \
        fastapi uvicorn python-multipart pydantic \
        faster-whisper piper-tts

    # Baixa arquivos de modelo do Silero VAD
    echo -e "\n${CYAN}Baixando modelos do Silero VAD...${NC}"
    python3 -c "from livekit.plugins import silero; silero.VAD.load()" 2>/dev/null || true

    echo -e "\n${CYAN}=== 5/5. Copiando Código do Agente e Audio Server ===${NC}"

    # Copia os arquivos Python para o diretório do agente
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/agent.py" ]; then
        cp "$SCRIPT_DIR/agent.py" "$DIR_AGENT/agent.py"
        cp "$SCRIPT_DIR/audio_server.py" "$DIR_AGENT/audio_server.py"
        echo -e "${GREEN}[OK]${NC} Arquivos copiados de $SCRIPT_DIR"
    else
        echo -e "${YELLOW}[AVISO]${NC} agent.py e audio_server.py não encontrados em $SCRIPT_DIR"
        echo -e "${YELLOW}        Certifique-se de que estão em $DIR_AGENT/${NC}"
    fi

    # Gera .env
    write_env_file

    echo -e "\n${GREEN}[PRONTO] Instalação concluída! Pressione [ENTER] para voltar.${NC}"
    read
}

# ==========================================
# 2. CONTROLE DE SERVIÇOS
# ==========================================
start_services() {
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        echo -e "${YELLOW}Serviços já estão rodando! Use opção 3 para parar primeiro.${NC}"
        sleep 2
        return
    fi

    # Garante que o .env existe
    write_env_file

    echo -e "${CYAN}=== Iniciando Cluster de Voz Local ===${NC}\n"

    # ---- Window 0: Llama.cpp (LLM na L4) ----
    echo -e "${CYAN}[1/3]${NC} Iniciando LLM (Llama.cpp na GPU L4)..."
    tmux new-session -d -s $SESSION_NAME -n "llama_server"
    tmux send-keys -t $SESSION_NAME:0 "$LLM_CMD" C-m

    # ---- Window 1: Audio Server (STT/TTS na CPU) ----
    echo -e "${CYAN}[2/3]${NC} Iniciando Audio Server (Whisper + Piper na CPU)..."
    tmux new-window -t $SESSION_NAME:1 -n "audio_server"
    tmux send-keys -t $SESSION_NAME:1 \
        "cd $DIR_AGENT && source venv/bin/activate && python3 audio_server.py" C-m

    # ---- Aguarda os serviços ficarem prontos ----
    echo -e "\n${CYAN}Aguardando serviços ficarem prontos...${NC}"
    wait_for_service "http://127.0.0.1:8001/health" "Audio Server (STT/TTS)" 24
    AUDIO_OK=$?

    wait_for_service "http://127.0.0.1:8080/health" "LLM (Llama.cpp)" 60
    LLM_OK=$?

    if [ $AUDIO_OK -ne 0 ] || [ $LLM_OK -ne 0 ]; then
        echo -e "\n${RED}[ERRO] Um ou mais serviços não iniciaram. Verifique os logs (opções 5-6).${NC}"
        echo -e "${YELLOW}O agente LiveKit NÃO será iniciado para evitar erros.${NC}"
        sleep 3
        return
    fi

    # ---- Window 2: Agente LiveKit (conecta ao LiveKit Cloud) ----
    echo -e "\n${CYAN}[3/3]${NC} Iniciando Agente LiveKit (conecta ao LiveKit Cloud)..."
    tmux new-window -t $SESSION_NAME:2 -n "livekit_agent"
    # CRÍTICO: Injeta as env vars do LiveKit via source .env
    tmux send-keys -t $SESSION_NAME:2 \
        "cd $DIR_AGENT && source venv/bin/activate && source .env && python3 agent.py start" C-m

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  TODOS OS SERVIÇOS INICIADOS!${NC}"
    echo -e "${GREEN}  LLM:   http://127.0.0.1:8080${NC}"
    echo -e "${GREEN}  Audio: http://127.0.0.1:8001${NC}"
    echo -e "${GREEN}  Agent: Registrado no LiveKit Cloud${NC}"
    echo -e "${GREEN}========================================${NC}"
    sleep 3
}

stop_services() {
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        tmux kill-session -t $SESSION_NAME
        pkill -f "audio_server.py" 2>/dev/null
        pkill -f "agent.py" 2>/dev/null
        echo -e "${GREEN}Todos os serviços encerrados.${NC}"
    else
        echo -e "${YELLOW}Nenhum serviço rodando.${NC}"
    fi
    sleep 2
}

# ==========================================
# 3. MONITORAMENTO
# ==========================================
monitor_live() {
    watch -n 2 -t "
    echo -e '\033[0;36m====================================================\033[0m'
    echo -e '\033[1;36m   ABZ VOICE DASHBOARD — CLUSTER LOCAL (L4 + XEON)   \033[0m'
    echo -e '\033[0;36m====================================================\033[0m'

    echo -e '\n\033[1;33m[GPU / VRAM]\033[0m'
    nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader 2>/dev/null | awk -F',' '{printf \"GPU: %-5s | VRAM: %s / %s | Temp: %s°C\n\", \$1, \$2, \$3, \$4}' || echo 'nvidia-smi não disponível'

    echo -e '\n\033[1;33m[SERVIÇOS]\033[0m'
    for svc in 'LLM:8080' 'Audio:8001'; do
        name=\${svc%%:*}; port=\${svc##*:}
        code=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:\$port/health 2>/dev/null)
        if [ \"\$code\" = '200' ]; then
            echo -e \"\033[0;32m● ONLINE\033[0m  \$name (:\$port)\"
        else
            echo -e \"\033[0;31m● OFFLINE\033[0m \$name (:\$port)\"
        fi
    done

    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        agent_pid=\$(pgrep -f 'agent.py start' | head -1)
        if [ -n \"\$agent_pid\" ]; then
            echo -e \"\033[0;32m● ONLINE\033[0m  LiveKit Agent (PID \$agent_pid)\"
        else
            echo -e \"\033[0;31m● OFFLINE\033[0m LiveKit Agent\"
        fi
    else
        echo -e '\033[0;31m● OFFLINE\033[0m Sessão tmux não encontrada'
    fi

    echo -e '\n\033[1;33m[PROCESSOS]\033[0m'
    ps -eo pid,%cpu,%mem,cmd 2>/dev/null | grep -E 'llama-server|audio_server|agent.py' | grep -v grep | awk '{printf \"PID: %-7s CPU: %-5s%% RAM: %-5s%% %s\n\", \$1, \$2, \$3, substr(\$4,1,45)}'
    echo -e '\n\033[0;36m(Ctrl+C para voltar)\033[0m'
    "
}

# ==========================================
# 4. TESTES RÁPIDOS
# ==========================================
test_services() {
    clear
    echo -e "${CYAN}=== Teste Rápido dos Serviços ===${NC}\n"

    # Teste LLM
    echo -e "${YELLOW}[1/3] Testando LLM (Llama.cpp)...${NC}"
    llm_resp=$(curl -s --max-time 30 http://127.0.0.1:8080/v1/chat/completions \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer Caio@2122@" \
        -d '{"model":"qwen-coder","messages":[{"role":"user","content":"Diga apenas: teste ok"}],"max_tokens":20}')
    if echo "$llm_resp" | grep -q "choices"; then
        echo -e "${GREEN}[OK]${NC} LLM respondeu!"
    else
        echo -e "${RED}[FALHA]${NC} LLM não respondeu. Resposta: ${llm_resp:0:200}"
    fi

    # Teste STT
    echo -e "\n${YELLOW}[2/3] Testando STT (Whisper)...${NC}"
    stt_health=$(curl -s --max-time 5 http://127.0.0.1:8001/health)
    if echo "$stt_health" | grep -q "ok"; then
        echo -e "${GREEN}[OK]${NC} Audio Server online: $stt_health"
    else
        echo -e "${RED}[FALHA]${NC} Audio Server offline"
    fi

    # Teste TTS
    echo -e "\n${YELLOW}[3/3] Testando TTS (Piper)...${NC}"
    tts_resp=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
        -X POST http://127.0.0.1:8001/v1/audio/speech \
        -H "Content-Type: application/json" \
        -d '{"input":"Teste de síntese de voz.","model":"piper","voice":"faber"}')
    if [ "$tts_resp" = "200" ]; then
        echo -e "${GREEN}[OK]${NC} TTS gerou áudio com sucesso!"
    else
        echo -e "${RED}[FALHA]${NC} TTS retornou HTTP $tts_resp"
    fi

    echo -e "\n${NC}Pressione [ENTER] para voltar."
    read
}

# ==========================================
# 5. MENU PRINCIPAL
# ==========================================
while true; do
    clear
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     PORTAL ABZ — LOCAL VOICE CLUSTER MANAGER    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  1) Instalar / Atualizar (Dependências + Modelos)"
    echo -e "  2) ${GREEN}Ligar Serviços${NC} (LLM → Audio → Agent)"
    echo -e "  3) ${RED}Desligar Serviços${NC}"
    echo -e "  4) Monitoramento Live (Dashboard)"
    echo -e "  5) Teste Rápido (LLM + STT + TTS)"
    echo -e "  6) Logs — LLM (Llama.cpp)"
    echo -e "  7) Logs — Audio Server (Whisper + Piper)"
    echo -e "  8) Logs — Agente LiveKit"
    echo -e "  0) Sair"
    echo ""
    read -p "  Escolha: " opcao

    case $opcao in
        1) check_and_install ;;
        2) start_services ;;
        3) stop_services ;;
        4) monitor_live ;;
        5) test_services ;;
        6) tmux attach -t $SESSION_NAME:0 2>/dev/null || echo -e "${RED}Offline.${NC}"; sleep 1 ;;
        7) tmux attach -t $SESSION_NAME:1 2>/dev/null || echo -e "${RED}Offline.${NC}"; sleep 1 ;;
        8) tmux attach -t $SESSION_NAME:2 2>/dev/null || echo -e "${RED}Offline.${NC}"; sleep 1 ;;
        0) clear; exit 0 ;;
    esac
done
