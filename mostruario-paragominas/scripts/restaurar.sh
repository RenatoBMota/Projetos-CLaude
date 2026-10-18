#!/usr/bin/env bash
# Restaura um backup gerado por scripts/backup.sh. APAGA os dados atuais.
# Uso: scripts/restaurar.sh backups/banco-AAAAMMDD-HHMMSS.dump backups/anexos-AAAAMMDD-HHMMSS.tar.gz
set -euo pipefail

banco="${1:?informe o arquivo banco-*.dump}"
anexos="${2:-}"

read -r -p "Isto substitui TODOS os dados atuais pelo backup. Digite RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

docker compose stop app
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS mostruario WITH (FORCE)" -c "CREATE DATABASE mostruario"
docker compose exec -T db pg_restore -U postgres -d mostruario --no-owner < "$banco"
docker compose start app

if [ -n "$anexos" ]; then
  docker compose exec -T app sh -c "rm -rf /dados/anexos/* && tar xzf - -C /dados" < "$anexos"
fi
echo "Restauração concluída."
