# Deploy no VPS (Docker) — transferlog.renatomota.online

Stack: PostgreSQL + API (Node) + Caddy servindo o frontend e fazendo proxy
reverso interno para a API.

Este deploy assume que o VPS **já tem um Traefik rodando** (é o caso do VPS
Hostinger em uso, que já roteia `wms-rma`, `logtrack`, `n8n` etc.), atrelado à
rede Docker `n8n_default` e com um certificate resolver chamado
`mytlschallenge`. É o Traefik quem recebe as portas 80/443, termina o TLS e
encaminha para o container `web` deste projeto por dentro da rede Docker — o
Caddy aqui só escuta HTTP simples internamente, sem tentar emitir certificado
próprio.

Se algum dia isso for rodar num VPS **sem** Traefik (do zero), me avise que eu
adapto o `docker-compose.yml` de volta para o Caddy assumir as portas 80/443
diretamente com HTTPS automático.

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

## 2. Copiar o projeto para o VPS

```bash
git clone --branch claude/transferlog-project-a9ez5s https://github.com/RenatoBMota/Projetos-CLaude.git
cd Projetos-CLaude/transferlog
```

(ou `git pull` se já tiver clonado antes)

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:
- `DOMAIN=transferlog.renatomota.online`
- `POSTGRES_PASSWORD=` uma senha forte (gere com `openssl rand -hex 24`)
- `JWT_SECRET=` um segredo longo aleatório (gere com `openssl rand -hex 32`)

## 4. Subir a stack

```bash
docker compose build
docker compose up -d
docker compose logs -f
```

O backend roda `prisma migrate deploy` automaticamente ao iniciar. Aguarde os
logs mostrarem `TransferLog API rodando na porta 3333`. O container `web` não
expõe porta nenhuma pro host — ele só é alcançado pelo Traefik através da rede
`n8n_default`.

## 5. Criar o usuário administrador inicial

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

Isso cria as unidades de exemplo e o usuário
`admin@transferlog.com` / `transferlog123` — **troque a senha depois de
logar** (ainda não há tela de troca de senha; se quiser, eu adiciono).

Se preferir não usar os dados de exemplo, edite `prisma/seed.ts` antes de
rodar, ou cadastre as unidades pela tela de Cadastros e crie o usuário admin
manualmente.

## 6. Acessar

`https://transferlog.renatomota.online` — o Traefik emite o certificado
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
docker compose logs -f web        # logs do Caddy (proxy interno)
docker logs n8n-traefik-1 --tail 50   # logs do Traefik (certificado, roteamento)
docker compose exec db psql -U transferlog transferlog   # acessar o banco
```
