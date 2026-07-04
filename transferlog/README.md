# TransferLog

Torre de controle de transferências entre filiais: leitura automática de NF-e
(XML), acompanhamento do ciclo de vida da transferência (separação,
carregamento, trânsito, recebimento, conferência) e medição de SLA/OTIF por rota.

Especificação completa do produto em [PRD.md](./PRD.md).

## Stack

- **Backend**: Node.js + TypeScript, Express, Prisma/PostgreSQL, JWT
- **Frontend**: React + TypeScript, Vite, React Router

## Status

MVP completo implementado: modelo de dados, parser de NF-e, fluxo de
transferência (pendente separação → em separação → carregado → em trânsito →
recebido → conferido → finalizado), autenticação com perfis/permissões por
unidade, cálculo de OTIF, dashboard operacional e dashboard gerencial.

## Como rodar

### Backend

```bash
cd backend
cp .env.example .env   # ajuste DATABASE_URL/JWT_SECRET se necessário
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts  # cria empresa/unidades de exemplo e usuário admin
npm run dev             # API em http://localhost:3333
```

Usuário de teste criado pelo seed: `admin@transferlog.com` / `transferlog123`.

### Frontend

```bash
cd frontend
cp .env.example .env    # aponta para a API (padrão http://localhost:3333)
npm install
npm run dev              # http://localhost:5173
```

### Testes

```bash
cd backend
npm test
```
