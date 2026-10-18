from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection
from pydantic import BaseModel, Field

from .. import config
from ..db import auditar, get_conn
from ..seguranca import (buscar_usuario, criar_token, hash_senha, usuario_autenticado,
                         verificar_senha)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    senha: str


class TrocarSenhaIn(BaseModel):
    senha_atual: str
    nova_senha: str = Field(min_length=config.SENHA_MIN)


@router.post("/login")
def login(dados: LoginIn, conn: Connection = Depends(get_conn)):
    linha = conn.execute(
        "SELECT id, senha_hash, ativo FROM usuarios WHERE lower(email) = lower(%s)",
        (dados.email.strip(),),
    ).fetchone()
    if not linha or not linha["ativo"] or not verificar_senha(linha["senha_hash"], dados.senha):
        raise HTTPException(401, "E-mail ou senha inválidos")
    return {"token": criar_token(linha["id"]), "usuario": buscar_usuario(conn, linha["id"])}


@router.get("/eu")
def eu(usuario: dict = Depends(usuario_autenticado)):
    return usuario


@router.post("/trocar-senha")
def trocar_senha(dados: TrocarSenhaIn, usuario: dict = Depends(usuario_autenticado),
                 conn: Connection = Depends(get_conn)):
    atual = conn.execute("SELECT senha_hash FROM usuarios WHERE id = %s", (usuario["id"],)).fetchone()
    if not verificar_senha(atual["senha_hash"], dados.senha_atual):
        raise HTTPException(400, "Senha atual incorreta")
    if dados.nova_senha == dados.senha_atual:
        raise HTTPException(400, "A nova senha deve ser diferente da atual")
    conn.execute("UPDATE usuarios SET senha_hash = %s, trocar_senha = false WHERE id = %s",
                 (hash_senha(dados.nova_senha), usuario["id"]))
    auditar(conn, usuario["id"], "usuarios", usuario["id"], "trocar_senha")
    return buscar_usuario(conn, usuario["id"])
