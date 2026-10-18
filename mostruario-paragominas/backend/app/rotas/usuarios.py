from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection
from pydantic import BaseModel, EmailStr, Field

from .. import config
from ..db import auditar, get_conn
from ..seguranca import SQL_USUARIO, buscar_usuario, exigir_perfil, hash_senha

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

Perfil = Literal["requisitante", "aprovador_comercial", "aprovador_logistica",
                 "deposito", "gestor", "admin"]

somente_admin = exigir_perfil("admin")


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=2)
    email: EmailStr
    matricula: str | None = None
    filial_id: int | None = None
    perfis: list[Perfil] = Field(min_length=1)
    # Filiais adicionais em que o usuário pode ver/agir (abrangência).
    filiais: list[int] = []


class UsuarioCriar(UsuarioBase):
    senha_temporaria: str = Field(min_length=config.SENHA_MIN)


class UsuarioAlterar(UsuarioBase):
    ativo: bool = True


class RedefinirSenha(BaseModel):
    senha_temporaria: str = Field(min_length=config.SENHA_MIN)


def _gravar_vinculos(conn: Connection, usuario_id: int, dados: UsuarioBase) -> None:
    conn.execute("DELETE FROM usuario_perfis WHERE usuario_id = %s", (usuario_id,))
    conn.execute("DELETE FROM usuario_filiais WHERE usuario_id = %s", (usuario_id,))
    for perfil in set(dados.perfis):
        conn.execute("INSERT INTO usuario_perfis (usuario_id, perfil) VALUES (%s, %s)", (usuario_id, perfil))
    for filial_id in set(dados.filiais):
        conn.execute("INSERT INTO usuario_filiais (usuario_id, filial_id) VALUES (%s, %s)", (usuario_id, filial_id))


def _garantir_admin_ativo(conn: Connection) -> None:
    n = conn.execute(
        """SELECT count(*) AS n FROM usuarios u JOIN usuario_perfis p ON p.usuario_id = u.id
           WHERE u.ativo AND p.perfil = 'admin'"""
    ).fetchone()["n"]
    if n == 0:
        raise HTTPException(400, "O sistema precisa de pelo menos um administrador ativo")


@router.get("")
def listar(_: dict = Depends(somente_admin), conn: Connection = Depends(get_conn)):
    return conn.execute(SQL_USUARIO + " GROUP BY u.id ORDER BY u.ativo DESC, u.nome").fetchall()


@router.post("", status_code=201)
def criar(dados: UsuarioCriar, admin: dict = Depends(somente_admin), conn: Connection = Depends(get_conn)):
    novo_id = conn.execute(
        """INSERT INTO usuarios (nome, email, matricula, filial_id, senha_hash, trocar_senha)
           VALUES (%s, lower(%s), %s, %s, %s, true) RETURNING id""",
        (dados.nome.strip(), dados.email, dados.matricula or None, dados.filial_id,
         hash_senha(dados.senha_temporaria)),
    ).fetchone()["id"]
    _gravar_vinculos(conn, novo_id, dados)
    usuario = buscar_usuario(conn, novo_id)
    auditar(conn, admin["id"], "usuarios", novo_id, "criar", depois=usuario)
    return usuario


@router.put("/{usuario_id}")
def alterar(usuario_id: int, dados: UsuarioAlterar, admin: dict = Depends(somente_admin),
            conn: Connection = Depends(get_conn)):
    antes = buscar_usuario(conn, usuario_id)
    if antes is None:
        raise HTTPException(404, "Usuário não encontrado")
    conn.execute(
        """UPDATE usuarios SET nome = %s, email = lower(%s), matricula = %s, filial_id = %s, ativo = %s
           WHERE id = %s""",
        (dados.nome.strip(), dados.email, dados.matricula or None, dados.filial_id, dados.ativo, usuario_id),
    )
    _gravar_vinculos(conn, usuario_id, dados)
    _garantir_admin_ativo(conn)
    depois = buscar_usuario(conn, usuario_id)
    auditar(conn, admin["id"], "usuarios", usuario_id, "alterar", antes, depois)
    return depois


@router.post("/{usuario_id}/redefinir-senha")
def redefinir_senha(usuario_id: int, dados: RedefinirSenha, admin: dict = Depends(somente_admin),
                    conn: Connection = Depends(get_conn)):
    r = conn.execute("UPDATE usuarios SET senha_hash = %s, trocar_senha = true WHERE id = %s",
                     (hash_senha(dados.senha_temporaria), usuario_id))
    if r.rowcount == 0:
        raise HTTPException(404, "Usuário não encontrado")
    auditar(conn, admin["id"], "usuarios", usuario_id, "redefinir_senha")
    return buscar_usuario(conn, usuario_id)
