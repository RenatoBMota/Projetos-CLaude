import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/mostruario")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_HORAS = int(os.environ.get("JWT_HORAS", "10"))
# Pasta com o build do frontend (servido pelo próprio backend em produção).
FRONTEND_DIR = os.environ.get("FRONTEND_DIR", "")

# Pasta onde ficam os anexos (fotos e comprovantes).
ANEXOS_DIR = os.environ.get("ANEXOS_DIR", "anexos")
ANEXO_MAX_MB = int(os.environ.get("ANEXO_MAX_MB", "10"))

SENHA_MIN = 8
