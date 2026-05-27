# RBM LOGISTICS – Módulo de Agendamento Logístico

Plataforma corporativa para gestão de agendamentos de recebimento e expedição.

## Stack

| Camada       | Tecnologia                     |
|--------------|-------------------------------|
| Backend      | Java 21 + Spring Boot 3.3     |
| Frontend     | Next.js 14 + TypeScript       |
| Banco        | PostgreSQL 16                 |
| Cache        | Redis 7                       |
| Mensageria   | RabbitMQ 3.13                 |
| Storage      | MinIO                         |
| Infra        | Docker + NGINX (on-premise)   |
| Migrations   | Flyway                        |

## Pré-requisitos

- Docker e Docker Compose
- Java 21 (para desenvolvimento local do backend)
- Node.js 20 (para desenvolvimento local do frontend)
- Maven 3.9+

## Início Rápido

```bash
# 1. Clone e configure variáveis
cp .env.example .env

# 2. Suba a infraestrutura
docker-compose up -d

# 3. Backend (em outro terminal)
cd backend
mvn spring-boot:run

# 4. Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## Endereços Locais

| Serviço             | URL                            | Credenciais              |
|---------------------|-------------------------------|--------------------------|
| Frontend            | http://localhost:3000          | —                        |
| Backend (Swagger)   | http://localhost:8080/swagger-ui.html | —               |
| RabbitMQ Management | http://localhost:15672         | rbm_user / rbm_password  |
| MinIO Console       | http://localhost:9001          | rbm_minio / rbm_minio_secret |
| pgAdmin             | http://localhost:5050          | admin@rbm.com.br / admin123 |

## Estrutura do Projeto

```
rbm-agendamento/
├── backend/            # Spring Boot API
│   ├── src/main/java/com/rbm/agendamento/
│   │   ├── api/        # Controllers e response wrappers
│   │   ├── config/     # Configurações Spring (Security, Redis, RabbitMQ, OpenAPI)
│   │   └── domain/     # Entidades e regras de negócio (Fase 1+)
│   └── src/main/resources/db/migration/  # Flyway migrations
├── frontend/           # Next.js App
│   └── src/
│       ├── app/        # App Router (páginas)
│       ├── components/ # Componentes reutilizáveis
│       ├── services/   # Clientes HTTP
│       ├── types/      # Tipos TypeScript
│       └── utils/      # Constantes e helpers
├── infra/nginx/        # Configuração do proxy reverso
├── .github/workflows/  # CI/CD (GitHub Actions)
└── docker-compose.yml  # Infraestrutura de desenvolvimento
```

## Roadmap de Fases

| Fase | Escopo                              | Status     |
|------|-------------------------------------|------------|
| 0    | Fundação: infra, scaffold, CI/CD    | ✅ Concluída |
| 1    | Autenticação e Cadastros Mestres    | 🔜 Próxima  |
| 2    | Motor de Agendamento e Janelas      | ⏳ Pendente |
| 3    | Módulo Documental (XML/NF-e)        | ⏳ Pendente |
| 4    | Portal Externo (Transportadoras)    | ⏳ Pendente |
| 5    | Painel Operacional e Dashboards     | ⏳ Pendente |
| 6    | Notificações (E-mail, WhatsApp)     | ⏳ Pendente |
| 7    | Integrações YMS / WMS / ERP         | ⏳ Pendente |
| 8    | Enterprise: IA, OCR, Torre Controle | ⏳ Pendente |
