#!/usr/bin/env bash
# Backup do banco e dos anexos. Rode na pasta do projeto (onde está o docker-compose.yml).
# Uso: scripts/backup.sh [pasta_destino]   (padrão: ./backups)
# Sugestão de agendamento diário (crontab -e):
#   30 2 * * * cd /caminho/mostruario-paragominas && scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

destino="${1:-backups}"
mkdir -p "$destino"
data="$(date +%Y%m%d-%H%M%S)"

docker compose exec -T db pg_dump -U postgres -d mostruario -Fc > "$destino/banco-$data.dump"
docker compose exec -T app tar czf - -C /dados anexos > "$destino/anexos-$data.tar.gz"

# Mantém os 30 backups mais recentes de cada tipo
ls -1t "$destino"/banco-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --
ls -1t "$destino"/anexos-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm --

echo "Backup concluído: $destino/banco-$data.dump e $destino/anexos-$data.tar.gz"
