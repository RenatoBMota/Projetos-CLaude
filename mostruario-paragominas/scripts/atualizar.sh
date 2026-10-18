#!/usr/bin/env bash
# Atualiza para a versão mais recente do repositório, com backup antes.
# Uso (como root, na pasta do projeto): bash scripts/atualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Backup antes de atualizar"
scripts/backup.sh

echo "==> Baixando a versão nova"
git pull --ff-only

echo "==> Reconstruindo e reiniciando"
docker compose up -d --build
docker image prune -f >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1; then echo "Atualizado e no ar."; exit 0; fi
  sleep 2
done
echo "O sistema não respondeu após a atualização. Veja: docker compose logs app"
exit 1
