#!/usr/bin/env bash
# Instalação completa numa VPS Ubuntu (ex.: Hostinger KVM). Rode como root, na
# pasta do projeto:
#     bash scripts/instalar_vps.sh
# Pode ser executado de novo sem problemas (não apaga dados).
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(id -u)" = 0 ] || { echo "Rode como root (ou com sudo)."; exit 1; }

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

echo "==> Configuração (.env)"
if [ ! -f .env ]; then
  read -r -p "Endereço do sistema [mostruario.renatomota.online]: " dominio
  dominio="${dominio:-mostruario.renatomota.online}"
  umask 077
  cat > .env <<EOF
DOMINIO=$dominio
DB_SENHA=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
EOF
  umask 022
  echo "    .env criado com senhas aleatórias (guarde uma cópia em local seguro)."
else
  echo "    .env já existe; mantido."
fi
dominio="$(grep '^DOMINIO=' .env | cut -d= -f2)"

echo "==> Verificando DNS de $dominio"
ip_vps="$(curl -fsS4 https://ifconfig.me 2>/dev/null || true)"
ip_dns="$(getent ahostsv4 "$dominio" 2>/dev/null | awk 'NR==1{print $1}' || true)"
if [ -z "$ip_dns" ]; then
  echo "    ATENÇÃO: $dominio ainda não aponta para nenhum IP."
  nome_dns="@"; [ "$(echo "$dominio" | tr -cd '.' | wc -c)" -ge 2 ] && nome_dns="${dominio%%.*}"
  echo "    Crie no painel da Hostinger (Domínios › DNS) um registro A com nome '$nome_dns' → ${ip_vps:-IP-DA-VPS}."
  echo "    O sistema sobe mesmo assim; o HTTPS é emitido sozinho quando o DNS propagar."
elif [ -n "$ip_vps" ] && [ "$ip_dns" != "$ip_vps" ]; then
  echo "    ATENÇÃO: $dominio aponta para $ip_dns, mas esta VPS é $ip_vps. Corrija o registro A."
else
  echo "    OK ($ip_dns)."
fi

echo "==> Firewall (SSH, HTTP e HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
  echo "    ufw ativo."
else
  echo "    ufw não encontrado; libere as portas 22, 80 e 443 no firewall do painel da Hostinger."
fi

echo "==> Subindo o sistema (a primeira vez demora alguns minutos)"
docker compose up -d --build

echo "==> Aguardando o sistema responder"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
[ "${ok:-}" = 1 ] || { echo "O sistema não respondeu. Veja: docker compose logs app"; exit 1; }

echo "==> Administrador"
admins="$(docker compose exec -T db psql -U postgres -d mostruario -tAc \
  "SELECT count(*) FROM usuario_perfis WHERE perfil = 'admin'")"
if [ "$(echo "$admins" | tr -d '[:space:]')" = "0" ]; then
  read -r -p "Nome do administrador: " nome
  read -r -p "E-mail do administrador: " email
  docker compose exec app python -m app.criar_admin --nome "$nome" --email "$email"
else
  echo "    Já existe administrador."
fi

echo "==> Backup diário às 02:30 (pasta backups/)"
mkdir -p backups
if command -v crontab >/dev/null 2>&1; then
  ( crontab -l 2>/dev/null | grep -v '# mostruario-backup' || true
    echo "30 2 * * * cd $(pwd) && scripts/backup.sh >> backups/backup.log 2>&1 # mostruario-backup"
  ) | crontab -
  echo "    Agendado."
else
  echo "    crontab não encontrado; agende scripts/backup.sh manualmente."
fi

echo
echo "Pronto! Acesse: https://$dominio"
echo "(Se o HTTPS ainda não abrir, aguarde a propagação do DNS e veja: docker compose logs caddy)"
