FROM node:22-alpine AS frontend
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=frontend /front/dist ./frontend
ENV FRONTEND_DIR=/app/frontend \
    ANEXOS_DIR=/dados/anexos
EXPOSE 8000
# --proxy-headers: usa o IP real do visitante informado pelo Caddy (limite de login).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
