# Mostruário Paragominas

Sistema web para controlar as amostras de pisos do mostruário das lojas,
**da requisição até a devolução** (classificada em **Estoque**, **Descarte**
ou **Perda**). O estoque do depósito continua no ERP.

- Manual do usuário: [`docs/manual.md`](docs/manual.md)
- Escopo e regras de negócio: [`docs/escopo.md`](docs/escopo.md)
- Modelo de dados (PostgreSQL 16): [`db/schema.sql`](db/schema.sql)

## Funcionalidades

- **Acesso**: login com senha (Argon2), administrador inicial criado na
  instalação, usuários com perfis e abrangência de filiais, senha temporária
  trocada no primeiro acesso.
- **Configuração**: cadastros de produtos, fornecedores, filiais e motivos;
  importação de produtos pela planilha do ERP (.xlsx/.csv); gestão de usuários.
- **Requisições**: vários produtos por requisição, rascunho, envio,
  aprovação comercial → logística (com corte de quantidade), reprovação e
  cancelamento com motivo.
- **Depósito**: expedição parcial/total, devolução em Estoque/Descarte/Perda
  com motivo, cancelamento de saldo pendente, anexos (fotos e PDF, inclusive
  pela câmera do celular).
- **Gestor**: estorno de lançamentos com histórico preservado.
- **Consultas**: amostras em exposição por loja; filas de trabalho na tela inicial.
- **Relatórios**: indicadores (valor em exposição, taxas de aprovação, tempos
  médios, % reaproveitamento/descarte/perda) e relatórios por filial,
  fornecedor, produto, requisitante e motivo; lista para lançar no ERP.
  Exportação para Excel e CSV; impressão/PDF.
- **Integridade**: movimentações imutáveis (correção só por estorno), regras de
  quantidade validadas no próprio banco, proteção contra duplo clique,
  auditoria de todas as alterações.

## Instalação na VPS (Hostinger)

**1. DNS** — no hPanel, em **Domínios › renatomota.online › DNS**, crie um
registro **A** com nome `mostruario` apontando para o **IP da VPS**.

**2. Na VPS** (Ubuntu 22.04 ou 24.04), conecte como root (`ssh root@IP-DA-VPS`
ou pelo terminal do hPanel) e rode:

```bash
git clone https://github.com/renatobmota/projetos-claude.git
cd projetos-claude/mostruario-paragominas
bash scripts/instalar_vps.sh
```

O script instala o Docker, gera senhas aleatórias no `.env`, confere o DNS,
ativa o firewall (portas 22, 80 e 443), sobe o sistema com **HTTPS
automático**, pede o nome e o e-mail do administrador e agenda o backup
diário. Pode ser rodado de novo sem perder dados.

Se o repositório for privado, o `git clone` pede usuário e senha: use um
**token** do GitHub (Settings › Developer settings › Personal access tokens).

**3. Acesse** `https://mostruario.renatomota.online` e, em **Configuração**,
cadastre as filiais, importe os produtos e crie os usuários.

**Atualizar** para uma versão nova (faz backup antes):

```bash
cd projetos-claude/mostruario-paragominas && bash scripts/atualizar.sh
```

**Comandos úteis**

```bash
docker compose exec app python -m app.redefinir_senha --email voce@empresa.com.br   # esqueceu a senha
docker compose restart app        # reiniciar o sistema (também libera bloqueio de login)
docker compose ps                 # situação dos serviços
docker compose logs -f app        # registros do sistema
docker compose logs caddy         # registros do HTTPS (certificado)
```

O arquivo `db/schema.sql` só é aplicado na primeira inicialização (banco
vazio); mudanças futuras de banco virão como scripts de migração.

### Backup

```bash
scripts/backup.sh                 # gera backups/banco-*.dump e backups/anexos-*.tar.gz (guarda os 30 últimos)
scripts/restaurar.sh backups/banco-AAAAMMDD-HHMMSS.dump backups/anexos-AAAAMMDD-HHMMSS.tar.gz
```

O `instalar_vps.sh` já agenda o backup diário (02:30). Copie de tempos em
tempos a pasta `backups/` para fora da VPS (ex.: `scp -r root@IP-DA-VPS:projetos-claude/mostruario-paragominas/backups .`).

## Desenvolvimento

Backend (Python 3.12+), na pasta `backend/`:

```bash
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
psql -d mostruario -f ../db/schema.sql
DATABASE_URL=postgresql://postgres@localhost/mostruario .venv/bin/python -m app.criar_admin --nome Admin --email admin@local
DATABASE_URL=postgresql://postgres@localhost/mostruario JWT_SECRET=dev .venv/bin/uvicorn app.main:app --reload
```

Frontend (Node 20+), na pasta `frontend/`, com proxy de `/api` para a porta 8000:

```bash
npm install && npm run dev
```

Testes do backend (criam bancos temporários no servidor indicado):

```bash
cd backend && TEST_PG_URL=postgresql://postgres@localhost:5432/postgres .venv/bin/pytest
```

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres@localhost:5432/mostruario` | Conexão com o banco |
| `JWT_SECRET` | — (obrigatória) | Assinatura das sessões |
| `JWT_HORAS` | `10` | Duração da sessão |
| `ANEXOS_DIR` | `anexos` | Pasta dos anexos |
| `ANEXO_MAX_MB` | `10` | Tamanho máximo de anexo |
| `FRONTEND_DIR` | — | Pasta do build do frontend (no Docker já vem configurada) |

## Estrutura

```
db/schema.sql            banco: tabelas, view de posição, triggers de validação, motivos iniciais
backend/app/             API FastAPI (rotas/: auth, usuarios, cadastros, solicitacoes, relatorios, anexos)
backend/tests/           testes automáticos (pytest + PostgreSQL)
frontend/src/            telas React + TypeScript
scripts/                 backup e restauração
docs/                    escopo e manual
```
