# Deploy do WMS RMA na VPS Hostinger — rma.renatomota.online

Pacote de deploy criado do zero para este projeto (Gunicorn + Nginx + systemd + SSL),
aplicando as mesmas correções já validadas localmente (Pillow/Python, porta,
permissões de upload, cookies seguros atrás de proxy).

> Observação: não foi encontrado neste repositório um projeto "logtrack" ou deploy
> anterior para reaproveitar — este pacote foi montado integralmente para o WMS RMA.

## 1. DNS

No painel da Hostinger (ou onde o domínio `renatomota.online` está gerenciado),
crie um registro:

| Tipo | Nome | Valor          | TTL  |
|------|------|----------------|------|
| A    | rma  | <IP da VPS>    | 300  |

Aguarde a propagação (geralmente minutos, pode levar até algumas horas).
Confirme com: `dig rma.renatomota.online +short` (deve retornar o IP da VPS).

## 2. Acesso à VPS

```bash
ssh root@<IP-da-VPS>
```

## 3. Instalação inicial

```bash
apt update && apt install -y python3 python3-venv python3-pip nginx git certbot python3-certbot-nginx

export REPO_URL="https://github.com/<usuario>/<repo>.git"
export BRANCH="claude/wms-rma-enterprise-roadmap-nMj8E"

git clone --branch "$BRANCH" "$REPO_URL" /var/www/wms-rma
cd /var/www/wms-rma
sudo REPO_URL="$REPO_URL" BRANCH="$BRANCH" bash deploy/deploy.sh
```

O script `deploy/deploy.sh`:
- instala dependências do sistema se necessário;
- cria o virtualenv `.venv` e instala `requirements.txt` (inclui `gunicorn`);
- gera `.env` a partir de `deploy/.env.example` (você precisa editá-lo, veja abaixo);
- instala e habilita o serviço systemd `wms-rma`;
- instala e habilita o site no Nginx.

## 4. Editar o `.env`

```bash
nano /var/www/wms-rma/.env
```

Defina uma `SECRET_KEY` forte (ex: `python3 -c "import secrets; print(secrets.token_hex(32))"`)
e mantenha `FORCE_HTTPS=1`. Depois:

```bash
systemctl restart wms-rma
```

## 5. Emitir certificado SSL (Let's Encrypt)

Só depois que o DNS já estiver apontando corretamente:

```bash
certbot --nginx -d rma.renatomota.online
```

O Certbot edita automaticamente `/etc/nginx/sites-available/rma.renatomota.online`
para adicionar o bloco HTTPS (porta 443) e o redirecionamento de HTTP para HTTPS.

## 6. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 7. Verificação

```bash
systemctl status wms-rma --no-pager
systemctl status nginx --no-pager
curl -I https://rma.renatomota.online
```

Acesse `https://rma.renatomota.online` no navegador. Login padrão:
`admin@wms.com` / `admin123` — **troque a senha logo após o primeiro acesso**.

## 8. Atualizações futuras

Sempre que houver novo código na branch:

```bash
cd /var/www/wms-rma
sudo bash deploy/deploy.sh
```

O script faz `git pull`, reinstala dependências se necessário e reinicia o serviço.
Não recria o `.env` se ele já existir.

## 9. Banco de dados

O SQLite vive em `/var/www/wms-rma/instance/wms_rma.db`. Para backup:

```bash
cp /var/www/wms-rma/instance/wms_rma.db /root/backup-wms-rma-$(date +%Y%m%d).db
```

Considere agendar isso via `cron`.

## 10. Logs

```bash
journalctl -u wms-rma -f          # logs do serviço (stdout/stderr do gunicorn)
tail -f /var/log/wms-rma/error.log
tail -f /var/log/nginx/error.log
```

## Problemas já resolvidos e como este pacote evita repeti-los

- **Pillow sem wheel para a versão do Python**: `requirements.txt` usa `Pillow>=11.1.0`
  e pip por padrão usa wheels em Linux/Debian — sem necessidade de compilar.
- **App não detecta HTTPS/host corretos atrás de proxy**: `ProxyFix` já configurado em
  `app/__init__.py`, e `FORCE_HTTPS=1` no `.env` ativa `SESSION_COOKIE_SECURE`.
- **Porta**: produção usa socket Unix (`/run/wms-rma/wms-rma.sock`), não depende da
  variável `PORT` usada em desenvolvimento local.
- **Upload de arquivos**: `client_max_body_size 16M` no Nginx casado com
  `MAX_CONTENT_LENGTH` do Flask.
- **Processo cai e não reinicia**: `Restart=always` no systemd.
