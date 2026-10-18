from fastapi import APIRouter, Depends, HTTPException, Request
from psycopg import Connection
from pydantic import BaseModel, Field

from .. import config, limite_login
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
def login(dados: LoginIn, request: Request, conn: Connection = Depends(get_conn)):
    email = dados.email.strip().lower()
    ip = request.client.host if request.client else "?"
    espera = limite_login.bloqueado(email, ip)
    if espera:
        raise HTTPException(429, f"Muitas tentativas. Tente de novo em {max(1, espera // 60)} minuto(s).")
    linha = conn.execute(
        "SELECT id, senha_hash, ativo FROM usuarios WHERE lower(email) = %s", (email,)
    ).fetchone()
    if not linha or not linha["ativo"] or not verificar_senha(linha["senha_hash"], dados.senha):
        limite_login.registrar_falha(email, ip)
        raise HTTPException(401, "E-mail ou senha inválidos")
    limite_login.registrar_sucesso(email)
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
