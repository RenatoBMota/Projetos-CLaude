#!/usr/bin/env bash
# check_and_run.sh — verifica dependências e inicia o WMS RMA

set -e
PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJ_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  [OK]${NC} $1"; }
warn() { echo -e "${YELLOW}  [AVISO]${NC} $1"; }
err()  { echo -e "${RED}  [ERRO]${NC} $1"; }
info() { echo -e "${CYAN}  [INFO]${NC} $1"; }

echo ""
echo "============================================================"
echo "  WMS RMA — Verificação de ambiente"
echo "============================================================"

# ── 1. Python ─────────────────────────────────────────────────
echo ""
echo "▶ Verificando Python..."
PYTHON=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+')
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 9 ]; then
            PYTHON="$cmd"
            ok "Python $VER encontrado: $(command -v $cmd)"
            break
        else
            warn "Python $VER encontrado mas é < 3.9 ($(command -v $cmd))"
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    err "Python 3.9+ não encontrado. Instale em https://python.org"
    exit 1
fi

# ── 2. pip ────────────────────────────────────────────────────
echo ""
echo "▶ Verificando pip..."
if "$PYTHON" -m pip --version &>/dev/null; then
    PIP_VER=$("$PYTHON" -m pip --version | awk '{print $2}')
    ok "pip $PIP_VER disponível"
else
    warn "pip não encontrado — tentando instalar..."
    "$PYTHON" -m ensurepip --upgrade || { err "Não foi possível instalar pip."; exit 1; }
    ok "pip instalado"
fi

# ── 3. Ambiente virtual (opcional mas recomendado) ────────────
echo ""
echo "▶ Verificando ambiente virtual..."
if [ -d ".venv" ]; then
    ok "Virtualenv .venv já existe"
    # Ativa o venv
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        PYTHON="python"
        ok "Virtualenv ativado"
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
        PYTHON="python"
        ok "Virtualenv ativado (Windows)"
    fi
else
    info "Criando virtualenv em .venv ..."
    "$PYTHON" -m venv .venv
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    else
        source .venv/Scripts/activate
    fi
    PYTHON="python"
    ok "Virtualenv criado e ativado"
fi

# ── 4. Dependências ───────────────────────────────────────────
echo ""
echo "▶ Verificando dependências (requirements.txt)..."
MISSING=()
while IFS= read -r line; do
    # ignora linhas vazias e comentários
    [[ -z "$line" || "$line" == \#* ]] && continue
    PKG=$(echo "$line" | sed 's/[=><!].*//' | tr '[:upper:]' '[:lower:]' | tr '-' '_')
    if ! "$PYTHON" -c "import $PKG" 2>/dev/null; then
        MISSING+=("$line")
    fi
done < requirements.txt

if [ ${#MISSING[@]} -eq 0 ]; then
    ok "Todas as dependências já estão instaladas"
else
    warn "${#MISSING[@]} pacote(s) faltando: ${MISSING[*]}"
    info "Instalando via pip..."
    "$PYTHON" -m pip install -r requirements.txt --quiet
    ok "Dependências instaladas"
fi

# ── 5. Arquivos essenciais ────────────────────────────────────
echo ""
echo "▶ Verificando arquivos do projeto..."
REQUIRED_FILES=("run.py" "app/__init__.py" "app/models.py" "requirements.txt")
ALL_OK=true
for f in "${REQUIRED_FILES[@]}"; do
    if [ -f "$f" ]; then
        ok "$f"
    else
        err "$f não encontrado"
        ALL_OK=false
    fi
done
$ALL_OK || exit 1

# ── 6. Diretórios necessários ─────────────────────────────────
echo ""
echo "▶ Verificando diretórios..."
for dir in "instance" "app/static/uploads"; do
    if [ -d "$dir" ]; then
        ok "Diretório $dir existe"
    else
        info "Criando $dir ..."
        mkdir -p "$dir"
        ok "Diretório $dir criado"
    fi
done

# ── 7. Banco de dados ─────────────────────────────────────────
echo ""
echo "▶ Verificando banco de dados..."
if [ -f "instance/wms_rma.db" ]; then
    SIZE=$(du -sh instance/wms_rma.db | cut -f1)
    ok "Banco existente: instance/wms_rma.db ($SIZE)"
else
    warn "Banco não existe — será criado automaticamente na primeira execução"
fi

# ── 8. Porta 5000 ─────────────────────────────────────────────
echo ""
echo "▶ Verificando porta 5000..."
if command -v lsof &>/dev/null; then
    PID=$(lsof -ti tcp:5000 2>/dev/null || true)
elif command -v ss &>/dev/null; then
    PID=$(ss -tlnp 2>/dev/null | grep ':5000' | grep -oP 'pid=\K[0-9]+' || true)
fi

if [ -n "$PID" ]; then
    warn "Porta 5000 em uso pelo processo PID $PID"
    read -rp "  Deseja encerrar o processo e liberar a porta? [s/N] " resp
    if [[ "$resp" =~ ^[sS]$ ]]; then
        kill "$PID" 2>/dev/null && ok "Processo $PID encerrado" || err "Não foi possível encerrar o processo"
    else
        info "Usando porta alternativa 5001..."
        export PORT=5001
    fi
else
    ok "Porta 5000 disponível"
fi

# ── Resumo ────────────────────────────────────────────────────
PORT="${PORT:-5000}"
echo ""
echo "============================================================"
echo -e "  ${GREEN}Ambiente OK — iniciando WMS RMA na porta $PORT${NC}"
echo "============================================================"
echo ""
echo "  URL:   http://localhost:$PORT"
echo "  Login: admin@wms.com / admin123"
echo "  Ctrl+C para encerrar"
echo ""

"$PYTHON" run.py
