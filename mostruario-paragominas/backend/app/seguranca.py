from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from . import config
from .db import get_conn

_ph = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)

SQL_USUARIO = """
SELECT u.id, u.nome, u.email, u.matricula, u.filial_id, u.ativo, u.trocar_senha,
       COALESCE(array_agg(DISTINCT up.perfil::text) FILTER (WHERE up.perfil IS NOT NULL), '{}') AS perfis,
       COALESCE(array_agg(DISTINCT uf.filial_id) FILTER (WHERE uf.filial_id IS NOT NULL), '{}') AS filiais
FROM usuarios u
LEFT JOIN usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN usuario_filiais uf ON uf.usuario_id = u.id
"""


def hash_senha(senha: str) -> str:
    return _ph.hash(senha)


def verificar_senha(senha_hash: str, senha: str) -> bool:
    try:
        return _ph.verify(senha_hash, senha)
    except (VerifyMismatchError, InvalidHashError):
        return False


def criar_token(usuario_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=config.JWT_HORAS)
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, config.JWT_SECRET, algorithm="HS256")


def buscar_usuario(conn: Connection, usuario_id: int) -> dict | None:
    return conn.execute(SQL_USUARIO + " WHERE u.id = %s GROUP BY u.id", (usuario_id,)).fetchone()


def usuario_autenticado(cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
                        conn: Connection = Depends(get_conn)) -> dict:
    """Usuário do token, mesmo que ainda precise trocar a senha."""
    if cred is None:
        raise HTTPException(401, "Não autenticado")
    try:
        dados = jwt.decode(cred.credentials, config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Sessão inválida ou expirada")
    usuario = buscar_usuario(conn, int(dados["sub"]))
    if usuario is None or not usuario["ativo"]:
        raise HTTPException(401, "Usuário inativo")
    return usuario


def usuario_atual(usuario: dict = Depends(usuario_autenticado)) -> dict:
    if usuario["trocar_senha"]:
        raise HTTPException(403, "Troque a senha antes de continuar")
    return usuario


def tem_perfil(usuario: dict, *perfis: str) -> bool:
    return bool(set(perfis) & set(usuario["perfis"]))


def filiais_permitidas(usuario: dict) -> set[int] | None:
    """Filiais que o usuário pode ver/atender; None = todas.

    Gestor e administrador veem tudo, assim como usuários corporativos
    (sem filial de lotação e sem abrangência definida).
    """
    if tem_perfil(usuario, "gestor", "admin"):
        return None
    filiais = set(usuario["filiais"])
    if usuario["filial_id"] is not None:
        filiais.add(usuario["filial_id"])
    return filiais or None


def pode_ver_filial(usuario: dict, filial_id: int) -> bool:
    permitidas = filiais_permitidas(usuario)
    return permitidas is None or filial_id in permitidas


def exigir_perfil(*perfis: str):
    def dependencia(usuario: dict = Depends(usuario_atual)) -> dict:
        if not set(perfis) & set(usuario["perfis"]):
            raise HTTPException(403, "Sem permissão para esta ação")
        return usuario
    return dependencia
