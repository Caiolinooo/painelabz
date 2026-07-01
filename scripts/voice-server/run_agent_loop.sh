#!/bin/bash
source venv/bin/activate
source .env
while true; do
    echo "Starting agent.py..."
    python3 agent.py start
    echo "Agent crashed or exited. Restarting in 2 seconds..."
    sleep 2
done
