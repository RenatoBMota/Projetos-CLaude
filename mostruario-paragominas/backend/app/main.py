from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import errors
from pydantic import ValidationError

from . import config, db
from .rotas import auth, cadastros, usuarios


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    if not config.JWT_SECRET:
        raise RuntimeError("Defina a variável de ambiente JWT_SECRET")
    db.abrir(config.DATABASE_URL)
    yield
    db.fechar()


app = FastAPI(title="Mostruário Paragominas", lifespan=ciclo_de_vida)
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(cadastros.router)


@app.exception_handler(ValidationError)
def erro_validacao(_: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors(include_url=False, include_context=False)})


@app.exception_handler(errors.UniqueViolation)
def erro_duplicado(_: Request, exc: errors.UniqueViolation):
    campo = getattr(exc.diag, "constraint_name", "") or ""
    return JSONResponse(status_code=409, content={"detail": f"Registro duplicado ({campo})"})


@app.exception_handler(errors.ForeignKeyViolation)
def erro_referencia(_: Request, __: errors.ForeignKeyViolation):
    return JSONResponse(status_code=400, content={"detail": "Referência inválida (registro relacionado não existe)"})


@app.exception_handler(errors.RaiseException)
def erro_regra(_: Request, exc: errors.RaiseException):
    # Regras de negócio validadas por trigger no banco.
    return JSONResponse(status_code=400, content={"detail": exc.diag.message_primary})


@app.get("/api/saude")
def saude():
    return {"ok": True}


if config.FRONTEND_DIR and Path(config.FRONTEND_DIR, "index.html").exists():
    _front = Path(config.FRONTEND_DIR)
    app.mount("/assets", StaticFiles(directory=_front / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def spa(caminho: str):
        arquivo = (_front / caminho).resolve()
        if caminho and arquivo.is_file() and _front.resolve() in arquivo.parents:
            return FileResponse(arquivo)
        return FileResponse(_front / "index.html")
