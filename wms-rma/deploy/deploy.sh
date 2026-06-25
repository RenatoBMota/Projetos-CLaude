#!/usr/bin/env bash
# deploy.sh — primeira instalação ou atualização do WMS RMA no VPS.
# Uso: sudo bash deploy/deploy.sh
set -euo pipefail

APP_DIR="/var/www/wms-rma"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-claude/wms-rma-enterprise-roadmap-nMj8E}"
SERVICE="wms-rma"

echo "==> Verificando dependências do sistema..."
if ! command -v python3 >/dev/null; then
    apt-get update -y
    apt-get install -y python3 python3-venv python3-pip nginx
fi

if [ ! -d "$APP_DIR/.git" ]; then
    echo "==> Primeira instalação: clonando repositório..."
    if [ -z "$REPO_URL" ]; then
        echo "ERRO: defina REPO_URL=<url-do-repo> na primeira execução." >&2
        exit 1
    fi
    mkdir -p "$APP_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
    echo "==> Atualizando código (git pull)..."
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
fi

cd "$APP_DIR"

echo "==> Configurando ambiente virtual..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
deactivate

if [ ! -f "$APP_DIR/.env" ]; then
    echo "==> Criando .env a partir do exemplo (EDITE antes de continuar!)"
    cp deploy/.env.example "$APP_DIR/.env"
fi

mkdir -p /var/log/wms-rma
chown -R www-data:www-data "$APP_DIR" /var/log/wms-rma

echo "==> Instalando unit do systemd..."
cp deploy/wms-rma.service /etc/systemd/system/wms-rma.service
systemctl daemon-reload
systemctl enable wms-rma
systemctl restart wms-rma

echo "==> Instalando configuração do Nginx..."
cp deploy/nginx-rma.conf /etc/nginx/sites-available/rma.renatomota.online
ln -sf /etc/nginx/sites-available/rma.renatomota.online /etc/nginx/sites-enabled/rma.renatomota.online
nginx -t
systemctl reload nginx

echo "==> Deploy concluído. Status do serviço:"
systemctl status "$SERVICE" --no-pager -l | head -n 10

echo
echo "Próximo passo (somente na primeira instalação): emitir o certificado SSL com:"
echo "  certbot --nginx -d rma.renatomota.online"
