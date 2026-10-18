# Mostruário Paragominas

Controle das amostras de pisos do mostruário, da requisição até a devolução
(classificada em **Estoque**, **Descarte** ou **Perda**). O estoque do depósito
continua no ERP.

- Escopo e regras: [`docs/escopo.md`](docs/escopo.md)
- Modelo de dados (PostgreSQL 16): [`db/schema.sql`](db/schema.sql)
- Cenário de teste do banco: [`db/teste_cenario.sql`](db/teste_cenario.sql)

## O que já funciona

- Login com senha (hash Argon2) e sessão por token.
- **Administrador inicial** criado por linha de comando; ele cria os demais usuários.
- **Configuração › Usuários**: criar, editar, inativar e redefinir senha;
  perfis de permissão e abrangência de filiais. Senha temporária obrigatoriamente
  trocada no primeiro acesso. O sistema impede ficar sem nenhum administrador.
- **Configuração › Cadastros**: Produtos, Fornecedores, Filiais e Motivos
  (busca, paginação, inativação sem apagar).
- **Importação de produtos** por planilha do ERP (.xlsx ou .csv), com planilha
  modelo para download. Atualiza pelo SKU, cria fornecedores novos, aceita
  custo no formato `1.234,56`. Se houver erro em alguma linha, nada é gravado.
- Toda alteração é registrada na tabela `auditoria`.

Próxima etapa: requisições, aprovações, expedição e devolução.

## Instalação com Docker

```bash
cp .env.exemplo .env          # edite as senhas
docker compose up -d --build
docker compose exec app python -m app.criar_admin --nome "Seu Nome" --email voce@empresa.com.br
```

Acesse `http://<servidor>:8000` e entre com o e-mail e a senha do administrador.

## Desenvolvimento

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
psql -d mostruario -f ../db/schema.sql
DATABASE_URL=postgresql://postgres@localhost/mostruario .venv/bin/python -m app.criar_admin --nome Admin --email admin@local
DATABASE_URL=postgresql://postgres@localhost/mostruario JWT_SECRET=dev .venv/bin/uvicorn app.main:app --reload
```

Frontend (Node 20+), com proxy de `/api` para a porta 8000:

```bash
cd frontend && npm install && npm run dev
```

Testes do backend (criam bancos temporários no servidor indicado):

```bash
cd backend && TEST_PG_URL=postgresql://postgres@localhost:5432/postgres .venv/bin/pytest
```
