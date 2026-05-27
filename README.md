# RBM LOGISTICS – Módulo de Agendamento Logístico

Plataforma corporativa para gestão de agendamentos de recebimento e expedição.

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Backend      | Java 21 + Spring Boot 3.3           |
| Frontend     | Next.js 14 + TypeScript             |
| Banco        | PostgreSQL 16                       |
| Cache        | Redis 7                             |
| Mensageria   | RabbitMQ 3.13                       |
| Storage      | MinIO                               |
| Infra        | Docker + NGINX (Windows Server)     |
| Migrations   | Flyway                              |

---

## Pré-requisitos — Windows Server

### 1. Docker Desktop
Baixe e instale o **Docker Desktop para Windows**:
- Requisito: Windows Server 2019 ou superior (ou Windows 10/11 Pro)
- Habilitar o backend **WSL2** durante a instalação
- Após instalar, confirmar que está em modo **Linux Containers**
  (ícone da baleia na bandeja → _Switch to Linux containers_)

> Download: https://www.docker.com/products/docker-desktop

### 2. Java 21 (JDK)
Baixe o **Eclipse Temurin JDK 21** (distribuição gratuita):

> Download: https://adoptium.net/temurin/releases/?version=21

Após instalar, verifique no PowerShell:
```powershell
java -version
# java version "21.x.x"
```

### 3. Maven 3.9+
Baixe o binário `.zip` e extraia (ex: `C:\tools\maven`):

> Download: https://maven.apache.org/download.cgi

Adicione ao `PATH` do sistema:
- `C:\tools\maven\bin`

Verifique:
```powershell
mvn -version
```

### 4. Node.js 20 LTS
> Download: https://nodejs.org/en/download

Verifique:
```powershell
node -version
npm -version
```

### 5. Git para Windows
> Download: https://git-scm.com/download/win

---

## Início Rápido (PowerShell)

Abra o **PowerShell como Administrador** na pasta do projeto.

```powershell
# 1. Clone o repositório
git clone https://github.com/RenatoBMota/Projetos-CLaude.git
cd Projetos-CLaude

# 2. Configure as variáveis de ambiente
copy .env.example .env
# Edite o .env com suas configurações se necessário

# 3. Suba toda a infraestrutura (PostgreSQL, Redis, RabbitMQ, MinIO, pgAdmin)
docker compose up -d

# 4. Verifique se todos os containers estão saudáveis
docker compose ps
```

### Backend (novo terminal PowerShell)
```powershell
cd backend
mvn spring-boot:run
```

### Frontend (novo terminal PowerShell)
```powershell
cd frontend
npm install
npm run dev
```

---

## Parar os serviços

```powershell
# Para os containers (mantém os dados)
docker compose stop

# Para e remove os containers (mantém os volumes com dados)
docker compose down

# Para, remove containers E apaga todos os dados (use com cuidado)
docker compose down -v
```

---

## Endereços Locais

| Serviço             | URL                                    | Credenciais                      |
|---------------------|----------------------------------------|----------------------------------|
| Frontend            | http://localhost:3000                  | —                                |
| Backend (Swagger)   | http://localhost:8080/swagger-ui.html  | —                                |
| RabbitMQ Management | http://localhost:15672                 | rbm_user / rbm_password          |
| MinIO Console       | http://localhost:9001                  | rbm_minio / rbm_minio_secret     |
| pgAdmin             | http://localhost:5050                  | admin@rbm.com.br / admin123      |

---

## Configuração do pgAdmin (primeira vez)

1. Acesse http://localhost:5050
2. Faça login com `admin@rbm.com.br` / `admin123`
3. Clique em **Add New Server**
4. Aba **General** → Name: `RBM Local`
5. Aba **Connection**:
   - Host: `postgres` _(nome do container, não localhost)_
   - Port: `5432`
   - Database: `rbm_agendamento`
   - Username: `rbm_user`
   - Password: `rbm_password`

---

## Verificar logs dos serviços

```powershell
# Logs de todos os containers
docker compose logs

# Logs de um serviço específico (com acompanhamento em tempo real)
docker compose logs -f postgres
docker compose logs -f rabbitmq
docker compose logs -f redis
```

---

## Estrutura do Projeto

```
Projetos-CLaude/
├── backend/                        # Spring Boot API
│   ├── src\main\java\com\rbm\agendamento\
│   │   ├── api\                    # Controllers e response wrappers
│   │   ├── config\                 # Security, Redis, RabbitMQ, OpenAPI
│   │   └── domain\                 # Entidades e regras de negócio (Fase 1+)
│   └── src\main\resources\db\migration\  # Flyway migrations
├── frontend\                       # Next.js App
│   └── src\
│       ├── app\                    # App Router (páginas)
│       ├── components\             # Componentes reutilizáveis
│       ├── services\               # Clientes HTTP (axios)
│       ├── types\                  # Tipos TypeScript
│       └── utils\                  # Constantes e helpers
├── infra\nginx\                    # Configuração do proxy reverso
├── .github\workflows\              # CI/CD (GitHub Actions)
├── docker-compose.yml              # Infraestrutura de desenvolvimento
└── .env.example                    # Modelo de variáveis de ambiente
```

---

## Problemas Comuns no Windows

### Docker não inicia / WSL2 não encontrado
```powershell
# Habilitar WSL2
wsl --install
wsl --set-default-version 2
# Reinicie o servidor após instalar
```

### Porta já em uso
```powershell
# Verificar qual processo está usando a porta (ex: 5432)
netstat -ano | findstr :5432

# Encerrar o processo pelo PID encontrado
taskkill /PID <numero_pid> /F
```

### Permissão negada ao rodar Docker
Certifique-se de que seu usuário está no grupo **docker-users**:
```powershell
# Rodar como Administrador
net localgroup docker-users "SEU_USUARIO" /add
# Faça logoff e login novamente
```

### Volumes com problema no Windows
Caso os containers de banco reclamem de permissões, adicione ao `docker-compose.yml`:
```yaml
volumes:
  postgres_data:
    driver_opts:
      type: none
      o: bind
      device: C:\rbm-data\postgres
```

---

## Roadmap de Fases

| Fase | Escopo                              | Status       |
|------|-------------------------------------|--------------|
| 0    | Fundação: infra, scaffold, CI/CD    | ✅ Concluída  |
| 1    | Autenticação e Cadastros Mestres    | 🔜 Próxima   |
| 2    | Motor de Agendamento e Janelas      | ⏳ Pendente  |
| 3    | Módulo Documental (XML/NF-e)        | ⏳ Pendente  |
| 4    | Portal Externo (Transportadoras)    | ⏳ Pendente  |
| 5    | Painel Operacional e Dashboards     | ⏳ Pendente  |
| 6    | Notificações (E-mail, WhatsApp)     | ⏳ Pendente  |
| 7    | Integrações YMS / WMS / ERP         | ⏳ Pendente  |
| 8    | Enterprise: IA, OCR, Torre Controle | ⏳ Pendente  |
