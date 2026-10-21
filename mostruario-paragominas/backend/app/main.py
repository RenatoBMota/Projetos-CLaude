import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import errors
from pydantic import ValidationError

from . import config, db, medidas, migracoes
from .rotas import anexos, auth, cadastros, relatorios, solicitacoes, usuarios


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    if not config.JWT_SECRET:
        raise RuntimeError("Defina a variável de ambiente JWT_SECRET")
    for nome in migracoes.aplicar(config.DATABASE_URL):
        print(f"Migração aplicada: {nome}", flush=True)
    if n := medidas.preencher_pendentes(config.DATABASE_URL):
        print(f"Medidas da peça lidas da descrição: {n} produto(s)", flush=True)
    db.abrir(config.DATABASE_URL)
    yield
    db.fechar()


app = FastAPI(title="Mostruário Paragominas", lifespan=ciclo_de_vida)
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(cadastros.router)
app.include_router(solicitacoes.router)
app.include_router(relatorios.router)
app.include_router(anexos.router)


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

    mimetypes.add_type("application/manifest+json", ".webmanifest")
    # index.html e service worker sempre revalidados, para o app atualizar na hora
    _sem_cache = {"Cache-Control": "no-cache"}

    @app.get("/{caminho:path}", include_in_schema=False)
    def spa(caminho: str):
        if caminho.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Rota inexistente"})
        arquivo = (_front / caminho).resolve()
        if caminho and arquivo.is_file() and _front.resolve() in arquivo.parents:
            sem_cache = arquivo.name in ("sw.js", "registerSW.js", "manifest.webmanifest", "index.html")
            return FileResponse(arquivo, headers=_sem_cache if sem_cache else None)
        return FileResponse(_front / "index.html", headers=_sem_cache)
