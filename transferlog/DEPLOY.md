# Deploy no VPS (Docker) — transferlog.renatomota.online

Stack: PostgreSQL + API (Node) + Caddy servindo o frontend e fazendo proxy
reverso para a API, com HTTPS automático (Let's Encrypt) no mesmo domínio.

## 1. DNS

No painel de DNS onde `renatomota.online` está gerenciado, crie um registro:

```
Tipo: A
Nome: transferlog
Valor: <IP público do seu VPS Hostinger>
TTL: padrão
```

Confirme que propagou antes de seguir (`dig transferlog.renatomota.online` ou
`nslookup transferlog.renatomota.online` deve retornar o IP do VPS).

## 2. Portas

O Caddy precisa das portas **80** e **443** livres no VPS (ele usa a 80 para
o desafio HTTP do Let's Encrypt e a 443 para HTTPS). Se você já tem outro
proxy (Nginx, Traefik, Nginx Proxy Manager, Coolify etc.) ocupando essas
portas, me avise antes de subir — nesse caso o certo é configurar um site
apontando para os containers deste projeto em vez de expor o Caddy
diretamente nas portas 80/443.

## 3. Copiar o projeto para o VPS

```bash
git clone <url-do-seu-repositorio> transferlog
cd transferlog/transferlog   # pasta do projeto dentro do repo
```

(ou `git pull` se já tiver clonado antes)

## 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:
- `DOMAIN=transferlog.renatomota.online`
- `POSTGRES_PASSWORD=` uma senha forte (gere com `openssl rand -hex 24`)
- `JWT_SECRET=` um segredo longo aleatório (gere com `openssl rand -hex 32`)

## 5. Subir a stack

```bash
docker compose build
docker compose up -d
docker compose logs -f
```

O backend roda `prisma migrate deploy` automaticamente ao iniciar. Aguarde os
logs mostrarem `TransferLog API rodando na porta 3333`.

## 6. Criar o usuário administrador inicial

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

Isso cria a empresa/unidades de exemplo e o usuário
`admin@transferlog.com` / `transferlog123` — **troque a senha depois de
logar** (ainda não há tela de troca de senha; se quiser, eu adiciono).

Se preferir não usar os dados de exemplo, edite `prisma/seed.ts` antes de
rodar, ou cadastre a empresa/unidades pela tela de Cadastros e crie o usuário
admin manualmente.

## 7. Acessar

`https://transferlog.renatomota.online` — o Caddy emite o certificado
automaticamente no primeiro acesso (pode levar alguns segundos).

## Atualizando depois de mudanças no código

```bash
git pull
docker compose build
docker compose up -d
```

## Comandos úteis

```bash
docker compose ps                 # status dos containers
docker compose logs -f backend    # logs da API
docker compose logs -f web        # logs do Caddy (certificado, proxy)
docker compose exec db psql -U transferlog transferlog   # acessar o banco
```
