#!/usr/bin/env bash
# deploy.sh — primeira instalação ou atualização do WMS RMA via Docker/Traefik.
# Espelha o mesmo padrão usado no LOGTRACK (rede Docker "n8n_default" compartilhada
# com o Traefik já existente na VPS, que cuida do roteamento e do SSL).
#
# Uso: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="/var/www/wms-rma"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-claude/wms-rma-enterprise-roadmap-nMj8E}"

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

if [ ! -f "$APP_DIR/.env" ]; then
    echo "==> Criando .env a partir do exemplo (EDITE antes de continuar!)"
    cp deploy/.env.example "$APP_DIR/.env"
fi

if ! docker network inspect n8n_default >/dev/null 2>&1; then
    echo "ERRO: a rede Docker 'n8n_default' não existe nesta VPS." >&2
    echo "Ela deve ser a mesma rede usada pelo Traefik/n8n/LogTrack. Verifique com 'docker network ls'." >&2
    exit 1
fi

echo "==> Build e (re)inicialização do container..."
docker compose --env-file .env build
docker compose --env-file .env up -d

echo "==> Status do container:"
docker compose ps

echo
echo "Deploy concluído. O Traefik deve assumir o roteamento de https://rma.renatomota.online"
echo "automaticamente (rota e certificado configurados via labels no docker-compose.yml)."
