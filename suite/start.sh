#!/usr/bin/env bash
set -e

SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Portas
HUB_PORT=5000
WMS_PORT=5001
SCV_PORT=5002

echo ""
echo "============================================================"
echo "  Suite de Aplicações"
echo "============================================================"
echo "  Hub     → http://localhost:$HUB_PORT"
echo "  WMS RMA → http://localhost:$WMS_PORT  (login: admin@wms.com / admin123)"
echo "  SCV     → http://localhost:$SCV_PORT"
echo "  Pressione Ctrl+C para encerrar todos"
echo "============================================================"
echo ""

cleanup() {
    echo ""
    echo "Encerrando todos os serviços..."
    kill "$PID_WMS" "$PID_SCV" "$PID_HUB" 2>/dev/null
    wait "$PID_WMS" "$PID_SCV" "$PID_HUB" 2>/dev/null
    echo "Pronto."
}
trap cleanup EXIT INT TERM

# --- WMS RMA ---
cd "$SUITE_DIR/wms-rma"
if [ ! -d ".venv" ]; then
    echo "[WMS] Criando ambiente virtual..."
    python3 -m venv .venv
    .venv/bin/pip install -q -r requirements.txt
fi
PORT=$WMS_PORT .venv/bin/python run.py &
PID_WMS=$!

# --- SCV ---
cd "$SUITE_DIR/scv"
if [ ! -d ".venv" ]; then
    echo "[SCV] Criando ambiente virtual..."
    python3 -m venv .venv
    .venv/bin/pip install -q -r requirements.txt
fi
SCV_PORT=$SCV_PORT .venv/bin/python app.py &
PID_SCV=$!

# --- Hub ---
cd "$SUITE_DIR"
if [ ! -d ".venv" ]; then
    echo "[Hub] Criando ambiente virtual..."
    python3 -m venv .venv
    .venv/bin/pip install -q flask
fi

sleep 1.5
# Abre o hub no browser
(sleep 1 && python3 -c "import webbrowser; webbrowser.open('http://localhost:$HUB_PORT')") &

HUB_PORT=$HUB_PORT .venv/bin/python hub.py &
PID_HUB=$!

wait "$PID_WMS" "$PID_SCV" "$PID_HUB"
