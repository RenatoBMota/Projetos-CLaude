import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/mostruario")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_HORAS = int(os.environ.get("JWT_HORAS", "10"))
# Pasta com o build do frontend (servido pelo próprio backend em produção).
FRONTEND_DIR = os.environ.get("FRONTEND_DIR", "")

SENHA_MIN = 8
