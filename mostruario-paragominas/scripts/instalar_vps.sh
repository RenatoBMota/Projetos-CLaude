#!/usr/bin/env bash
# Instalação completa numa VPS Ubuntu (ex.: Hostinger KVM). Rode como root, na
# pasta do projeto:
#     bash scripts/instalar_vps.sh
# Pode ser executado de novo sem problemas (não apaga dados).
#
# HTTPS: se a VPS já tiver um Traefik nas portas 80/443 (ex.: o do n8n), o
# sistema entra por ele; se as portas estiverem livres, usa o Caddy do projeto.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(id -u)" = 0 ] || { echo "Rode como root (ou com sudo)."; exit 1; }

# Grava/atualiza CHAVE=valor no .env
definir() {
  local chave="$1" valor="$2"
  if grep -q "^$chave=" .env; then
    sed -i "s|^$chave=.*|$chave=$valor|" .env
  else
    echo "$chave=$valor" >> .env
  fi
}

# Nome do container (rodando) que publica a porta 443 no servidor
container_na_443() {
  docker ps --format '{{.Names}}\t{{.Ports}}' | awk -F'\t' '$2 ~ /:443->/ {print $1; exit}'
}

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

echo "==> HTTPS"
projeto="$(basename "$(pwd)")"
ocupante="$(container_na_443 || true)"
if [ -n "$ocupante" ] && [ "$ocupante" != "${projeto}-caddy-1" ]; then
  imagem="$(docker inspect "$ocupante" --format '{{.Config.Image}}')"
  if [[ "$imagem" != *traefik* ]]; then
    echo "    As portas 80/443 já são usadas por '$ocupante' ($imagem), que não é Traefik."
    echo "    Configure esse proxy para encaminhar $dominio para http://127.0.0.1:8000"
    echo "    ou peça ajuda. Instalação interrompida."
    exit 1
  fi
  argumentos="$(docker inspect "$ocupante" --format '{{range .Config.Cmd}}{{println .}}{{end}}{{range .Args}}{{println .}}{{end}}')"
  resolver="$(grep -oP -- '--certificatesresolvers\.\K[^.=]+' <<<"$argumentos" | head -1 || true)"
  entrypoint="$(grep -oP -- '--entrypoints\.\K[^.=]+(?=\.address=:443\b)' <<<"$argumentos" | head -1 || true)"
  rede="$(docker inspect "$ocupante" --format '{{range $nome, $_ := .NetworkSettings.Networks}}{{println $nome}}{{end}}' \
          | grep -v '^bridge$' | grep -v '^$' | head -1 || true)"
  if ! grep -q -- '--providers.docker' <<<"$argumentos"; then
    echo "    O Traefik '$ocupante' não lê os containers do Docker (providers.docker); não dá para"
    echo "    configurar automaticamente. Instalação interrompida."
    exit 1
  fi
  if [ -z "$resolver" ] || [ -z "$entrypoint" ] || [ -z "$rede" ]; then
    echo "    Encontrei o Traefik '$ocupante', mas não consegui ler a configuração dele"
    echo "    (resolver='$resolver', entrypoint='$entrypoint', rede='$rede')."
    echo "    Envie para o suporte: docker inspect $ocupante --format '{{json .Config.Cmd}}'"
    exit 1
  fi
  echo "    Usando o Traefik existente '$ocupante' (rede $rede, entrada $entrypoint, certificado $resolver)."
  definir COMPOSE_FILE "docker-compose.yml:docker-compose.traefik.yml"
  definir COMPOSE_PROFILES ""
  definir TRAEFIK_REDE "$rede"
  definir TRAEFIK_ENTRYPOINT "$entrypoint"
  definir TRAEFIK_RESOLVER "$resolver"
  # Remove o Caddy do projeto, se tiver sido criado numa tentativa anterior
  docker ps -aq --filter "label=com.docker.compose.project=$projeto" \
    --filter "label=com.docker.compose.service=caddy" | xargs -r docker rm -f >/dev/null
else
  echo "    Portas 80/443 livres: usando o Caddy do projeto."
  definir COMPOSE_FILE "docker-compose.yml"
  definir COMPOSE_PROFILES "caddy"
fi

echo "==> Verificando DNS de $dominio"
ip_vps="$(curl -fsS4 https://ifconfig.me 2>/dev/null || true)"
ip_dns="$(getent ahostsv4 "$dominio" 2>/dev/null | awk 'NR==1{print $1}' || true)"
if [ -z "$ip_dns" ]; then
  nome_dns="@"; [ "$(echo "$dominio" | tr -cd '.' | wc -c)" -ge 2 ] && nome_dns="${dominio%%.*}"
  echo "    ATENÇÃO: $dominio ainda não aponta para nenhum IP."
  echo "    Crie no painel da Hostinger (Domínios › DNS) um registro A com nome '$nome_dns' → ${ip_vps:-IP-DA-VPS}."
  echo "    O sistema sobe mesmo assim; o HTTPS é emitido quando o DNS propagar."
elif [ -n "$ip_vps" ] && [ "$ip_dns" != "$ip_vps" ]; then
  echo "    ATENÇÃO: $dominio aponta para $ip_dns, mas esta VPS é $ip_vps. Corrija o registro A."
else
  echo "    OK ($ip_dns)."
fi

echo "==> Firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  echo "    ufw ativo: portas 80 e 443 liberadas."
else
  echo "    ufw inativo; nada alterado (as portas 80/443 já são atendidas pelo proxy)."
fi

echo "==> Subindo o sistema (a primeira vez demora alguns minutos)"
docker compose up -d --build

echo "==> Aguardando o sistema responder"
ok=""
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
[ -n "$ok" ] || { echo "O sistema não respondeu. Veja: docker compose logs app"; exit 1; }

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
echo "(Se o HTTPS ainda não abrir, aguarde a propagação do DNS.)"
