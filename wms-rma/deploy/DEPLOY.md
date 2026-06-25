# Deploy do WMS RMA na VPS Hostinger — rma.renatomota.online

Este pacote espelha exatamente o padrão já usado no seu projeto **LOGTRACK**
(`github.com/RenatoBMota/LOGTRACK`): Docker + Traefik, com o container se
conectando à rede Docker externa `n8n_default` que já existe na VPS — a mesma
rede usada pelo n8n e pelo LogTrack. O Traefik (já em execução na VPS) detecta
o novo container pelas labels no `docker-compose.yml` e cuida do roteamento
HTTPS e do certificado SSL automaticamente, sem precisar configurar Nginx ou
Certbot manualmente.

## 1. DNS

No painel onde `renatomota.online` é gerenciado, crie um registro apontando
para o mesmo IP da VPS onde o Traefik/n8n/LogTrack já rodam:

| Tipo | Nome | Valor          | TTL  |
|------|------|----------------|------|
| A    | rma  | <IP da VPS>    | 300  |

Confirme com `dig rma.renatomota.online +short`.

## 2. Acesso à VPS

```bash
ssh root@<IP-da-VPS>
```

## 3. Verifique a rede do Traefik

```bash
docker network ls | grep n8n_default
```

Se essa rede não existir com esse nome exato, ajuste `networks.n8n_default`
em `docker-compose.yml` para o nome correto da rede do seu Traefik antes de
seguir.

## 4. Instalação inicial

```bash
export REPO_URL="https://github.com/<usuario>/<repo>.git"
export BRANCH="claude/wms-rma-enterprise-roadmap-nMj8E"

git clone --branch "$BRANCH" "$REPO_URL" /var/www/wms-rma
cd /var/www/wms-rma
REPO_URL="$REPO_URL" BRANCH="$BRANCH" bash deploy/deploy.sh
```

O script `deploy/deploy.sh`:
- clona/atualiza o repositório em `/var/www/wms-rma`;
- cria o `.env` a partir de `deploy/.env.example` (edite antes de seguir, veja abaixo);
- confirma que a rede `n8n_default` existe;
- builda a imagem (`Dockerfile`) e sobe o container com `docker compose up -d`.

## 5. Editar o `.env`

```bash
nano /var/www/wms-rma/.env
```

Defina uma `SECRET_KEY` forte:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Depois reinicie:

```bash
cd /var/www/wms-rma
docker compose --env-file .env up -d
```

## 6. Verificação

```bash
docker compose ps
docker compose logs -f wms-rma
curl -I https://rma.renatomota.online
```

Acesse `https://rma.renatomota.online`. Login padrão: `admin@wms.com` /
`admin123` — **troque a senha logo após o primeiro acesso**.

## 7. Atualizações futuras

```bash
cd /var/www/wms-rma
bash deploy/deploy.sh
```

Faz `git pull`, rebuilda a imagem e reinicia o container. O `.env` não é
recriado se já existir.

## 8. Dados persistentes

O banco SQLite e os uploads ficam em volumes Docker nomeados
(`instance_data` e `uploads_data`), sobrevivendo a rebuilds/restarts do
container. Para backup do banco:

```bash
docker compose exec wms-rma cp /app/instance/wms_rma.db /app/instance/backup-$(date +%Y%m%d).db
docker cp wms-rma:/app/instance/backup-$(date +%Y%m%d).db .
```

## 9. Logs

```bash
docker compose logs -f wms-rma
```

## Problemas já resolvidos e como este pacote evita repeti-los

- **Pillow sem wheel para a versão do Python**: a imagem usa `python:3.11-slim`
  (wheels disponíveis) e `requirements.txt` já fixa `Pillow>=11.1.0`.
- **App não detecta HTTPS/host corretos atrás do Traefik**: `ProxyFix` já
  configurado em `app/__init__.py`, e `FORCE_HTTPS=1` no `docker-compose.yml`
  ativa `SESSION_COOKIE_SECURE`.
- **Porta**: produção usa a porta interna `8000` exposta só dentro da rede
  Docker (`expose`, não `ports`) — o Traefik é o único ponto de entrada
  externo, igual ao padrão do LOGTRACK.
- **SSL**: gerenciado automaticamente pelo Traefik (`certresolver=mytlschallenge`),
  sem precisar rodar Certbot manualmente.
- **Processo cai e não reinicia**: `restart: unless-stopped` no
  `docker-compose.yml`.
- **Dados perdidos em rebuild**: volumes nomeados (`instance_data`,
  `uploads_data`) persistem o banco e os uploads entre deploys.
