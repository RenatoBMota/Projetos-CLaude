# Manual de Instalação e Configuração
## RBM LOGISTICS — Sistema de Agendamento Logístico + Integração YMS

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Subindo a Infraestrutura](#5-subindo-a-infraestrutura)
6. [Rodando o Backend (Spring Boot)](#6-rodando-o-backend-spring-boot)
7. [Rodando o Frontend (Next.js)](#7-rodando-o-frontend-nextjs)
8. [Implantação Completa com Docker](#8-implantação-completa-com-docker)
9. [Primeiro Acesso e Configuração Inicial](#9-primeiro-acesso-e-configuração-inicial)
10. [Integrando com o YMS](#10-integrando-com-o-yms)
11. [Ativando Notificações (E-mail e WhatsApp)](#11-ativando-notificações-e-mail-e-whatsapp)
12. [Referência de Variáveis de Ambiente](#12-referência-de-variáveis-de-ambiente)
13. [Solução de Problemas](#13-solução-de-problemas)

---

## 1. Visão Geral do Sistema

O **RBM Agendamento** é uma plataforma corporativa de agendamento logístico composta por:

| Componente | Tecnologia | Porta padrão |
|---|---|---|
| API (backend) | Spring Boot 3.3 / Java 21 | 8080 |
| Interface web (frontend) | Next.js 14 / React 18 | 3000 |
| Banco de dados | PostgreSQL 16 | 5432 |
| Cache / locks distribuídos | Redis 7 | 6379 |
| Mensageria assíncrona | RabbitMQ 3.13 | 5672 / 15672 |
| Armazenamento de documentos | MinIO | 9000 / 9001 |
| Admin do banco | pgAdmin 4 | 5050 |

### Funcionalidades implementadas

- **Fases 0–2**: Infraestrutura base, autenticação JWT, cadastros (Filiais, Docas, Janelas, Transportadoras, Fornecedores, Motoristas, Veículos, Bloqueios)
- **Fase 3**: Módulo documental — upload de documentos fiscais com validação via MinIO
- **Fase 4**: Portal externo para transportadoras — aceite/recusa de agendamentos
- **Fase 5**: Painel operacional com KPIs reais, gráficos SLA e rankings
- **Fase 6**: Notificações por e-mail e WhatsApp (via RabbitMQ, desativadas por padrão)
- **Fase 7**: Integração bidirecional com YMS (Flask/Python)

---

## 2. Pré-requisitos

### Para rodar com Docker (recomendado para produção)

| Software | Versão mínima | Como verificar |
|---|---|---|
| Docker | 24.x | `docker --version` |
| Docker Compose | 2.x (plugin integrado) | `docker compose version` |
| Git | qualquer | `git --version` |

> **Windows**: instale o **Docker Desktop** (já inclui Docker Compose).  
> **Linux**: siga as instruções oficiais em [docs.docker.com](https://docs.docker.com/engine/install/).  
> **macOS**: instale o **Docker Desktop** para Mac.

---

### Para rodar em modo desenvolvimento (sem Docker para app)

| Software | Versão mínima | Download |
|---|---|---|
| Java JDK | 21 (LTS) | [Adoptium Temurin](https://adoptium.net) |
| Maven | 3.9.x | [maven.apache.org](https://maven.apache.org/download.cgi) |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10.x (vem com Node) | — |

> A infraestrutura (PostgreSQL, Redis, RabbitMQ, MinIO) ainda precisa do Docker Compose.

---

## 3. Estrutura do Projeto

```
Projetos-CLaude/
├── backend/                    ← API Spring Boot
│   ├── src/main/java/...
│   ├── src/main/resources/
│   │   ├── application.yml     ← Configurações da aplicação
│   │   └── db/migration/       ← Migrações Flyway (V1 a V15)
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                   ← Interface Next.js
│   ├── src/
│   │   ├── app/                ← Páginas (App Router)
│   │   ├── components/         ← Componentes reutilizáveis
│   │   ├── services/           ← Chamadas à API
│   │   └── store/              ← Estado global (Zustand)
│   ├── package.json
│   ├── .env.example            ← Exemplo de variáveis de ambiente
│   └── Dockerfile
├── infra/
│   └── nginx/nginx.conf        ← Proxy reverso (produção)
├── yms-integration/
│   └── rbm_integration.py      ← Patch para o YMS (Flask)
├── docker-compose.yml          ← Orquestra toda a infraestrutura
└── MANUAL.md                   ← Este arquivo
```

---

## 4. Configuração do Ambiente

### 4.1 Clonando o repositório

```bash
git clone https://github.com/RenatoBMota/Projetos-CLaude.git
cd Projetos-CLaude

# Mude para o branch de desenvolvimento
git checkout claude/vibrant-galileo-rps3f
```

---

### 4.2 Criando o arquivo `.env` (opcional para desenvolvimento)

O projeto já possui valores padrão em todos os serviços. Para customizar, crie um arquivo `.env` na raiz do projeto:

```bash
# Na raiz do projeto
cp .env.example .env 2>/dev/null || touch .env
```

Edite o `.env` conforme necessário. Se não criar o arquivo, os valores padrão abaixo serão usados:

```dotenv
# ─── PostgreSQL ──────────────────────────────────────────────
POSTGRES_DB=rbm_agendamento
POSTGRES_USER=rbm_user
POSTGRES_PASSWORD=rbm_password
POSTGRES_PORT=5432

# ─── Redis ───────────────────────────────────────────────────
REDIS_PORT=6379
REDIS_PASSWORD=rbm_redis_pass

# ─── RabbitMQ ────────────────────────────────────────────────
RABBITMQ_DEFAULT_USER=rbm_user
RABBITMQ_DEFAULT_PASS=rbm_password
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672

# ─── MinIO ───────────────────────────────────────────────────
MINIO_ROOT_USER=rbm_minio
MINIO_ROOT_PASSWORD=rbm_minio_secret
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# ─── pgAdmin ─────────────────────────────────────────────────
PGADMIN_DEFAULT_EMAIL=admin@rbm.com.br
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050
```

---

### 4.3 Configurando variáveis do frontend

```bash
cd frontend
cp .env.example .env.local
```

Conteúdo padrão do `.env.local` (para desenvolvimento local):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=RBM LOGISTICS – Agendamento
NEXT_PUBLIC_APP_VERSION=1.0.0
```

> **Importante**: Em produção com Docker/Nginx, o frontend acessa o backend via proxy (`/api/*`). A variável `NEXT_PUBLIC_API_URL` pode ser omitida ou apontada para o IP do servidor.

---

## 5. Subindo a Infraestrutura

Execute este comando **antes** de iniciar o backend e o frontend:

```bash
# Na raiz do projeto
docker compose up -d
```

Este comando sobe em segundo plano:
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.13 (com painel de gerenciamento)
- MinIO (com console web)
- pgAdmin 4

### Verificando se tudo subiu corretamente

```bash
docker compose ps
```

Você deve ver todos os serviços com status `healthy` ou `running`:

```
NAME           STATUS                   PORTS
rbm_postgres   Up (healthy)             0.0.0.0:5432->5432/tcp
rbm_redis      Up (healthy)             0.0.0.0:6379->6379/tcp
rbm_rabbitmq   Up (healthy)             0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
rbm_minio      Up (healthy)             0.0.0.0:9000-9001->9000-9001/tcp
rbm_pgadmin    Up                       0.0.0.0:5050->80/tcp
```

> **Atenção**: aguarde alguns segundos após o `docker compose up -d`. O PostgreSQL demora cerca de 5–10 segundos para ficar `healthy`.

### Interfaces web disponíveis

| Serviço | URL | Usuário | Senha |
|---|---|---|---|
| RabbitMQ Management | http://localhost:15672 | rbm_user | rbm_password |
| MinIO Console | http://localhost:9001 | rbm_minio | rbm_minio_secret |
| pgAdmin | http://localhost:5050 | admin@rbm.com.br | admin123 |

---

### Configurando o bucket no MinIO (primeira vez)

O MinIO precisa dos buckets criados antes de o backend aceitar uploads de documentos.

**Via interface web (mais fácil):**

1. Acesse http://localhost:9001
2. Login: `rbm_minio` / `rbm_minio_secret`
3. Menu lateral → **Buckets** → **Create Bucket**
4. Crie dois buckets (exatamente com esses nomes, em minúsculas):
   - `rbm-documentos`
   - `rbm-anexos`
5. Para cada bucket, em **Access Policy** selecione `private`

**Via linha de comando (alternativa):**

```bash
# Instale o cliente MinIO
# Linux/macOS:
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Configure o alias
mc alias set rbmlocal http://localhost:9000 rbm_minio rbm_minio_secret

# Crie os buckets
mc mb rbmlocal/rbm-documentos
mc mb rbmlocal/rbm-anexos
```

---

## 6. Rodando o Backend (Spring Boot)

### 6.1 Modo desenvolvimento (com Maven)

```bash
cd backend

# Compila e inicia o servidor
mvn spring-boot:run
```

O backend ficará disponível em **http://localhost:8080**.

Ao iniciar pela primeira vez, o Flyway executa automaticamente as migrações V1 a V15, criando todas as tabelas, índices e inserindo o usuário administrador padrão.

**Verificando a saúde da API:**

```bash
curl http://localhost:8080/actuator/health
```

Resposta esperada:
```json
{"status":"UP"}
```

**Documentação interativa da API (Swagger):**

Acesse http://localhost:8080/swagger-ui.html para ver e testar todos os endpoints.

---

### 6.2 Gerando o JAR para execução direta

```bash
cd backend

# Gera o JAR (pula os testes para agilizar)
mvn package -DskipTests

# Executa o JAR
java -jar target/agendamento-*.jar
```

---

### 6.3 Variáveis de ambiente para o backend

Você pode sobrescrever qualquer configuração via variáveis de ambiente ou passando `-D` ao Java:

```bash
# Exemplo: banco em outro host
DB_URL=jdbc:postgresql://meu-servidor:5432/rbm_agendamento \
DB_USERNAME=meu_usuario \
DB_PASSWORD=minha_senha \
mvn spring-boot:run

# Ou com java diretamente
java -DSPRING_PROFILES_ACTIVE=prod \
     -DDB_URL=jdbc:postgresql://... \
     -jar target/agendamento-*.jar
```

---

## 7. Rodando o Frontend (Next.js)

### 7.1 Instalando dependências

```bash
cd frontend

# Instala todas as dependências do package.json
npm install
```

> **Primeira instalação**: o `npm install` pode demorar 1–3 minutos. Isso é normal — ele baixa React, Next.js, Axios, Zustand e demais bibliotecas.

---

### 7.2 Iniciando em modo desenvolvimento

```bash
cd frontend

npm run dev
```

O frontend ficará disponível em **http://localhost:3000** com hot-reload (atualização automática ao editar arquivos).

---

### 7.3 Build de produção local

```bash
cd frontend

# Gera o build otimizado
npm run build

# Inicia o servidor de produção
npm start
```

---

## 8. Implantação Completa com Docker

Para rodar **tudo** (infraestrutura + backend + frontend) com um único comando, adicione os serviços de aplicação ao `docker-compose.yml`.

### 8.1 Criando o `docker-compose.prod.yml`

Crie um arquivo `docker-compose.prod.yml` na raiz do projeto:

```yaml
services:

  # ─── Herda tudo do compose principal ─────────────────────
  postgres:
    extends:
      file: docker-compose.yml
      service: postgres

  redis:
    extends:
      file: docker-compose.yml
      service: redis

  rabbitmq:
    extends:
      file: docker-compose.yml
      service: rabbitmq

  minio:
    extends:
      file: docker-compose.yml
      service: minio

  # ─── Backend ─────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rbm_backend
    restart: unless-stopped
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/rbm_agendamento
      DB_USERNAME: ${POSTGRES_USER:-rbm_user}
      DB_PASSWORD: ${POSTGRES_PASSWORD:-rbm_password}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-rbm_redis_pass}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USERNAME: ${RABBITMQ_DEFAULT_USER:-rbm_user}
      RABBITMQ_PASSWORD: ${RABBITMQ_DEFAULT_PASS:-rbm_password}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER:-rbm_minio}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-rbm_minio_secret}
      JWT_SECRET: ${JWT_SECRET:-mude-esta-chave-em-producao-use-32-chars}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - rbm_network

  # ─── Frontend ────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: rbm_frontend
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8080
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - rbm_network

  # ─── Nginx (proxy reverso) ────────────────────────────────
  nginx:
    image: nginx:alpine
    container_name: rbm_nginx
    restart: unless-stopped
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "80:80"
    depends_on:
      - backend
      - frontend
    networks:
      - rbm_network

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  minio_data:
  pgadmin_data:

networks:
  rbm_network:
    driver: bridge
```

### 8.2 Iniciando tudo

```bash
# Na raiz do projeto
docker compose -f docker-compose.prod.yml up -d --build
```

> O `--build` força a reconstrução das imagens do backend e frontend.  
> O primeiro build demora 3–8 minutos (compila o Java e gera o bundle Next.js).

Após concluir, o sistema estará disponível em:

- **Sistema**: http://localhost (porta 80 via Nginx)
- **API direta**: http://localhost:8080
- **Swagger**: http://localhost:8080/swagger-ui.html

---

## 9. Primeiro Acesso e Configuração Inicial

### 9.1 Credenciais padrão

| Usuário | E-mail | Senha | Perfil |
|---|---|---|---|
| Administrador | `admin@rbm.com.br` | `Admin@123` | ROLE_ADMIN |

> **Segurança**: troque a senha do administrador imediatamente após o primeiro login em produção.

---

### 9.2 Sequência de cadastros recomendada

Para o sistema funcionar corretamente, cadastre os dados nesta ordem:

#### Passo 1 — Filiais

1. Menu lateral → **Filiais / Docas**
2. Clique em **Nova Filial**
3. Preencha: Nome, CNPJ, Razão Social, Endereço
4. Repita para todas as filiais da empresa

#### Passo 2 — Docas

1. Dentro de cada Filial, vá em **Docas**
2. Crie as docas com: Nome, Tipo (Recebimento/Expedição/Cross-docking), Capacidade

#### Passo 3 — Janelas de Agendamento

1. Menu lateral → **Janelas**
2. Clique em **Nova Janela**
3. Configure:
   - **Filial / Doca**: associe a doca criada no Passo 2
   - **Tipo de operação**: Recebimento, Expedição, etc.
   - **Dias da semana**: marque os dias disponíveis
   - **Horário início / fim**: ex: 07:00 às 17:00
   - **Duração por atendimento**: ex: 30 minutos
   - **Capacidade simultânea**: quantos veículos ao mesmo tempo
   - **Aceite obrigatório**: se ativado, transportadora precisa confirmar antes de CONFIRMADO

#### Passo 4 — Transportadoras

1. Menu lateral → **Transportadoras**
2. Cadastre: Razão Social, CNPJ, E-mail, Telefone

#### Passo 5 — Fornecedores

1. Menu lateral → **Fornecedores**
2. Cadastre: Razão Social, CNPJ, E-mail, Telefone

#### Passo 6 — Criando um agendamento

1. Menu lateral → **Agendamentos**
2. Clique em **Novo Agendamento**
3. Selecione: Data, Janela, Transportadora, Fornecedor
4. Preencha documentos fiscais (opcional)
5. Salve — o status inicial será **CRIADO** (ou **PENDENTE_ACEITE** se a janela exigir aceite)

---

### 9.3 Ciclo de vida de um agendamento

```
CRIADO
  │
  ├── (aceite obrigatório) ──→ PENDENTE_ACEITE ──→ [transportadora aceita] ──→ CONFIRMADO
  │
  └── (sem aceite) ──→ CONFIRMADO
                              │
                        CHEGADA_PÁTIO
                              │
                         EM_OPERAÇÃO
                              │
                          FINALIZADO
```

Também pode ir para **CANCELADO** ou **NO_SHOW** a qualquer momento antes de FINALIZADO.

---

### 9.4 Perfis de usuário (RBAC)

| Role | Descrição | Acesso |
|---|---|---|
| ROLE_ADMIN | Administrador total | Tudo |
| ROLE_MANAGER | Gerente operacional | Tudo exceto configurações de sistema |
| ROLE_OPERATOR | Operador de pátio | Agendamentos, chegadas, docas |
| ROLE_SUPPLIER | Fornecedor externo | Apenas seus próprios agendamentos |
| ROLE_CARRIER | Transportadora | Portal de aceite (`/portal/aceite`) |
| ROLE_AUDIT | Auditor | Leitura total, sem escrita |

**Para criar um usuário transportadora (portal de aceite):**

1. Crie o usuário via API (POST `/api/v1/auth/register` ou diretamente no banco)
2. Defina `role = ROLE_CARRIER`
3. Associe o `transportadora_id` ao usuário (campo na tabela `tb_usuarios`)
4. O usuário acessará `/portal/aceite` e verá apenas os agendamentos da sua transportadora

---

## 10. Integrando com o YMS

Esta seção detalha como conectar o **Sistema de Agendamento RBM** ao **YMS RBM Logistics** (o sistema Flask/Python de gerenciamento de pátio).

### 10.1 Como a integração funciona

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  RBM Agendamento            │         │  YMS RBM Logistics           │
│  (Spring Boot :8080)        │         │  (Flask Python :5000)        │
│                             │         │                              │
│  Agendamento CONFIRMADO ────┼────────►│  Cria schedule no YMS        │
│  Agendamento CANCELADO  ────┼────────►│  Remove schedule do YMS      │
│                             │         │                              │
│  Registra chegada no pátio ◄┼─────────┼── Veículo faz check-in       │
│  Finaliza agendamento      ◄┼─────────┼── Operação finalizada        │
└─────────────────────────────┘         └──────────────────────────────┘
         via RabbitMQ                           via HTTP webhook
```

---

### 10.2 Passo 1 — Aplicando o patch no YMS

O arquivo `yms-integration/rbm_integration.py` contém todas as alterações necessárias no `app.py` do YMS.

**Opção A: Importar como módulo (mais limpo)**

1. Copie o arquivo `rbm_integration.py` para a mesma pasta do `app.py` do YMS
2. No `app.py`, adicione ao topo (após os imports existentes):

```python
from rbm_integration import send_rbm_webhook, require_api_key, register_integration_routes, INTEGRATION_SETTINGS
```

3. Ao final de `_seed_settings()`, adicione (antes do fechamento da função):

```python
    # Integração RBM Agendamento
    for key, value, label, description, unit, category in INTEGRATION_SETTINGS:
        existing = query("SELECT key FROM settings WHERE key=?", (key,), one=True)
        if not existing:
            execute("INSERT INTO settings(key,value,label,description,unit,category) VALUES(?,?,?,?,?,?)",
                    (key, value, label, description, unit, category))
```

4. Logo antes de `if __name__ == '__main__':`, adicione:

```python
register_integration_routes(app)
```

**Opção B: Adicionar manualmente ao app.py**

Copie as funções `require_api_key`, `send_rbm_webhook` e as rotas do arquivo `rbm_integration.py` diretamente no `app.py`.

---

### 10.3 Passo 2 — Modificando api_checkin() no YMS

Localize a função `api_checkin()` no `app.py` e adicione **antes do `return`** final:

```python
@app.route('/api/vehicles/checkin', methods=['POST'])
@login_required
def api_checkin():
    # ... código existente ...
    
    # ─── ADICIONAR ESTAS LINHAS antes do return ───────────
    v_final = query("SELECT * FROM vehicles WHERE id=?", (vid,), one=True)
    send_rbm_webhook('CHECK_IN', dict(v_final), sched)
    # ─────────────────────────────────────────────────────
    
    return jsonify(serialize_vehicle(v_final))
```

---

### 10.4 Passo 3 — Modificando api_finish() no YMS

Localize `api_finish()` e adicione antes do `return` final:

```python
@app.route('/api/vehicles/<int:vid>/finish', methods=['POST'])
@login_required
def api_finish(vid):
    # ... código existente ...
    
    # ─── ADICIONAR ESTAS LINHAS antes do return ───────────
    finished_v = query("SELECT * FROM vehicles WHERE id=?", (vid,), one=True)
    send_rbm_webhook('FINALIZADO', dict(finished_v))
    # ─────────────────────────────────────────────────────
    
    return jsonify(serialize_vehicle(finished_v))
```

---

### 10.5 Passo 4 — Configurando no painel do YMS

1. Inicie o YMS (`python app.py`)
2. Acesse http://localhost:5000
3. Faça login como admin
4. Menu → **Configurações**
5. Na categoria **integracao**, preencha:

| Campo | Valor | Descrição |
|---|---|---|
| `integracao_enabled` | `1` | Ativa a integração |
| `integracao_api_key` | ex: `minha-chave-secreta-123` | Chave que o Spring Boot usará |
| `integracao_webhook_url` | `http://IP-DO-SPRING-BOOT:8080/api/v1/integracao/yms/webhook` | URL do webhook RBM |
| `integracao_webhook_secret` | ex: `segredo-compartilhado` | Segredo para validar webhooks |

> **Atenção**: use o IP real do servidor Spring Boot, não `localhost`, se os dois sistemas estão em máquinas diferentes.

---

### 10.6 Passo 5 — Configurando variáveis no Spring Boot

Adicione ao arquivo `.env` na raiz do projeto (ou exporte como variáveis de ambiente):

```dotenv
# ─── Integração YMS ──────────────────────────────────────────
YMS_ENABLED=true
YMS_BASE_URL=http://192.168.1.100:5000        # IP onde o YMS está rodando
YMS_API_KEY=minha-chave-secreta-123           # Deve ser igual ao integracao_api_key do YMS
YMS_WEBHOOK_SECRET=segredo-compartilhado      # Deve ser igual ao integracao_webhook_secret do YMS
```

Reinicie o Spring Boot após configurar.

---

### 10.7 Mapeamento de filiais RBM → unidades YMS

O sistema tenta mapear automaticamente a **Filial** do agendamento para uma **Unidade** do YMS por correspondência de nome (busca parcial, sem diferenciar maiúsculas).

**Exemplos de correspondência automática:**

| Filial no RBM | Unidade no YMS | Resultado |
|---|---|---|
| Matriz São Paulo | Matriz | ✅ Encontrado |
| Filial Atacado | Atacado | ✅ Encontrado |
| CD Campinas | Casa Premium | ❌ Não encontrado → usa primeira unidade |

Para garantir o mapeamento correto, **nomeie as filiais no RBM com nomes iguais ou parcialmente iguais às unidades do YMS**.

---

### 10.8 Passo 6 — Testando a integração

**Teste 1: Spring Boot consegue ver o YMS**

```bash
curl http://localhost:8080/api/v1/integracao/yms/status \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

Resposta esperada:
```json
{
  "data": {
    "enabled": true,
    "ymsOnline": true,
    "baseUrl": "http://192.168.1.100:5000"
  }
}
```

**Teste 2: Confirmar um agendamento e verificar no YMS**

1. Crie e confirme um agendamento no RBM
2. Acesse o YMS → menu **Agendamentos**
3. O schedule deve aparecer com as informações do fornecedor/transportadora e a nota: `"Agendamento RBM #RBM-YYYYMMDD-000001 | ID: <uuid>"`

**Teste 3: Check-in no YMS dispara atualização no RBM**

1. No YMS, faça o check-in de um veículo que tenha um agendamento RBM associado
2. No RBM, o agendamento deve mudar para status **CHEGADA_PATIO**

---

### 10.9 Verificando o log de integração

O banco PostgreSQL possui a tabela `tb_integracao_yms_log` que registra todas as sincronizações.

```sql
-- Últimas 20 sincronizações
SELECT 
    evento,
    direcao,
    sucesso,
    erro,
    criado_em
FROM tb_integracao_yms_log
ORDER BY criado_em DESC
LIMIT 20;
```

---

## 11. Ativando Notificações (E-mail e WhatsApp)

As notificações são **desativadas por padrão**. Para ativar, configure as variáveis de ambiente abaixo.

### 11.1 E-mail (via SMTP)

```dotenv
# Ativar e-mail
NOTIF_EMAIL_ENABLED=true
NOTIF_EMAIL_FROM=noreply@suaempresa.com.br
NOTIF_EMAIL_FROM_NAME=RBM Logistics

# Servidor SMTP (exemplo com Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu@gmail.com
MAIL_PASSWORD=senha-de-app-google   # use App Password, não a senha normal
```

> **Gmail**: ative a autenticação em dois fatores e gere uma "Senha de App" em: Conta Google → Segurança → Senhas de App

### 11.2 WhatsApp (via webhook)

```dotenv
NOTIF_WHATSAPP_ENABLED=true
NOTIF_WHATSAPP_WEBHOOK_URL=https://seu-provedor-whatsapp.com/send
NOTIF_WHATSAPP_API_KEY=sua-api-key
```

Provedores compatíveis: Meta Cloud API, Twilio, Z-API, WPPConnect — qualquer serviço que aceite `POST JSON { to, message, type }`.

### 11.3 Eventos que geram notificações

| Evento | Quem recebe | Canal |
|---|---|---|
| Agendamento criado | Transportadora, Motorista | E-mail + WhatsApp |
| Agendamento confirmado | Transportadora, Motorista | E-mail + WhatsApp |
| Agendamento cancelado | Transportadora, Motorista | E-mail + WhatsApp |

---

## 12. Referência de Variáveis de Ambiente

### Backend (Spring Boot)

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/rbm_agendamento` | URL do banco |
| `DB_USERNAME` | `rbm_user` | Usuário do banco |
| `DB_PASSWORD` | `rbm_password` | Senha do banco |
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `REDIS_PASSWORD` | `rbm_redis_pass` | Senha do Redis |
| `RABBITMQ_HOST` | `localhost` | Host do RabbitMQ |
| `RABBITMQ_PORT` | `5672` | Porta AMQP |
| `RABBITMQ_USERNAME` | `rbm_user` | Usuário RabbitMQ |
| `RABBITMQ_PASSWORD` | `rbm_password` | Senha RabbitMQ |
| `MINIO_ENDPOINT` | `http://localhost:9000` | URL do MinIO |
| `MINIO_ACCESS_KEY` | `rbm_minio` | Usuário MinIO |
| `MINIO_SECRET_KEY` | `rbm_minio_secret` | Senha MinIO |
| `JWT_SECRET` | `rbm-agendamento-jwt-...` | Segredo JWT (troque em produção!) |
| `JWT_EXPIRATION_MS` | `86400000` | Validade do token (24h) |
| `SERVER_PORT` | `8080` | Porta da API |
| `NOTIF_EMAIL_ENABLED` | `false` | Ativa notificações por e-mail |
| `NOTIF_WHATSAPP_ENABLED` | `false` | Ativa notificações por WhatsApp |
| `YMS_ENABLED` | `false` | Ativa integração YMS |
| `YMS_BASE_URL` | `http://localhost:5000` | URL base do YMS |
| `YMS_API_KEY` | _(vazio)_ | Chave para autenticar no YMS |
| `YMS_WEBHOOK_SECRET` | `rbm-yms-webhook-secret` | Segredo para validar webhooks do YMS |

### Frontend (Next.js)

| Variável | Padrão | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | URL base da API (sem `/api`) |
| `NEXT_PUBLIC_APP_NAME` | `RBM LOGISTICS – Agendamento` | Nome exibido no sistema |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | Versão exibida na UI |

---

## 13. Solução de Problemas

### "Connection refused" ao iniciar o backend

**Sintoma**: `Unable to acquire JDBC Connection` ou `Connection to localhost:5432 refused`

**Causa**: PostgreSQL ainda não está pronto.

**Solução**:
```bash
# Verifique se o Postgres está saudável
docker compose ps postgres

# Se não estiver, aguarde e tente novamente
docker compose logs postgres --tail=20
```

---

### "Flyway error: found more than one migration with version..."

**Causa**: Arquivo de migração duplicado ou renomeado.

**Solução**:
```bash
# Veja o estado atual do Flyway
curl http://localhost:8080/actuator/flyway

# Se necessário, limpe e recrie (ATENÇÃO: apaga todos os dados)
docker compose down -v   # -v remove os volumes
docker compose up -d
```

---

### Bucket MinIO não encontrado

**Sintoma**: `The specified bucket does not exist` ao fazer upload de documento.

**Solução**: Crie os buckets conforme a [Seção 5](#configurando-o-bucket-no-minio-primeira-vez).

---

### Token JWT expirado / "Unauthorized"

**Sintoma**: Todas as chamadas retornam `401 Unauthorized`.

**Solução no frontend**: Faça logout e login novamente. O token de acesso dura 24h; o refresh token, 7 dias.

**Solução via API**:
```bash
# Solicite novo token com o refresh token
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "SEU_REFRESH_TOKEN"}'
```

---

### YMS não cria schedules ao confirmar agendamento

**Verifique na ordem**:

1. `YMS_ENABLED=true` nas variáveis do Spring Boot
2. `YMS_BASE_URL` aponta para o IP correto (não `localhost` se em máquinas diferentes)
3. No YMS: `integracao_enabled = 1` e `integracao_api_key` preenchido
4. Firewall: porta 5000 do YMS acessível pelo Spring Boot
5. Logs do Spring Boot:
   ```bash
   # Busque por erros de integração
   grep "YMS\|integracao" /var/log/rbm/app.log
   # Ou via Docker
   docker logs rbm_backend | grep -i "yms\|integracao"
   ```

---

### RabbitMQ com filas acumulando mensagens

**Verifique**:
```bash
# Acesse o painel de gerenciamento
# http://localhost:15672 → Queues
# Se houver mensagens em "Unacked", o listener não está processando
docker logs rbm_backend | grep -i "rabbit\|listener"
```

---

### Portas em conflito

Se alguma porta já estiver em uso, altere no `.env`:

```dotenv
POSTGRES_PORT=5433   # mudou de 5432 para 5433
REDIS_PORT=6380
RABBITMQ_PORT=5673
RABBITMQ_MANAGEMENT_PORT=15673
MINIO_PORT=9002
MINIO_CONSOLE_PORT=9003
```

Lembre de atualizar as variáveis correspondentes no backend quando mudar as portas.

---

### Verificando logs de todos os serviços

```bash
# Todos os serviços em tempo real
docker compose logs -f

# Apenas o backend
docker compose logs -f backend

# Últimas 100 linhas de um serviço específico
docker logs rbm_postgres --tail=100
```

---

## Resumo rápido — do zero ao sistema rodando

```bash
# 1. Clone o projeto
git clone https://github.com/RenatoBMota/Projetos-CLaude.git
cd Projetos-CLaude
git checkout claude/vibrant-galileo-rps3f

# 2. Configure o frontend
cd frontend && cp .env.example .env.local && cd ..

# 3. Suba a infraestrutura
docker compose up -d

# 4. Crie os buckets no MinIO (http://localhost:9001)
#    Buckets: rbm-documentos e rbm-anexos

# 5. Backend (terminal 1)
cd backend && mvn spring-boot:run

# 6. Frontend (terminal 2)
cd frontend && npm install && npm run dev

# 7. Acesse http://localhost:3000
#    Login: admin@rbm.com.br / Admin@123
```

---

*Manual gerado para a versão do branch `claude/vibrant-galileo-rps3f` — Fases 0 a 7 implementadas.*
