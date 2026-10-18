"""Testes contra um PostgreSQL real.

Defina TEST_PG_URL apontando para um servidor onde o usuário possa criar bancos,
ex.: postgresql://postgres@localhost:5432/postgres
Cada teste roda num banco novo criado a partir de db/schema.sql.
"""
import os
from pathlib import Path

import psycopg
import pytest

PG_URL = os.environ.get("TEST_PG_URL", "postgresql://postgres@localhost:5432/postgres")
BANCO = "mostruario_teste"
MODELO = "mostruario_teste_modelo"
SCHEMA = Path(__file__).resolve().parents[2] / "db" / "schema.sql"


def _url(banco: str) -> str:
    return psycopg.conninfo.make_conninfo(PG_URL, dbname=banco)


os.environ["DATABASE_URL"] = _url(BANCO)
os.environ["JWT_SECRET"] = "segredo-de-teste"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seguranca import hash_senha  # noqa: E402

SENHA_ADMIN = "admin12345"


@pytest.fixture(scope="session", autouse=True)
def banco_modelo():
    with psycopg.connect(PG_URL, autocommit=True) as conn:
        conn.execute(f"DROP DATABASE IF EXISTS {MODELO}")
        conn.execute(f"CREATE DATABASE {MODELO}")
    with psycopg.connect(_url(MODELO), autocommit=True) as conn:
        conn.execute(SCHEMA.read_text())
        conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, trocar_senha) VALUES ('Admin', 'admin@teste.com', %s, false)",
            (hash_senha(SENHA_ADMIN),),
        )
        conn.execute("INSERT INTO usuario_perfis VALUES (1, 'admin')")
    yield
    with psycopg.connect(PG_URL, autocommit=True) as conn:
        conn.execute(f"DROP DATABASE IF EXISTS {BANCO} WITH (FORCE)")
        conn.execute(f"DROP DATABASE IF EXISTS {MODELO}")


@pytest.fixture
def cliente():
    with psycopg.connect(PG_URL, autocommit=True) as conn:
        conn.execute(f"DROP DATABASE IF EXISTS {BANCO} WITH (FORCE)")
        conn.execute(f"CREATE DATABASE {BANCO} TEMPLATE {MODELO}")
    with TestClient(app) as c:
        yield c


def login(cliente, email: str, senha: str) -> dict:
    r = cliente.post("/api/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture
def admin(cliente):
    return login(cliente, "admin@teste.com", SENHA_ADMIN)


def criar_usuario(cliente, admin, email: str, perfis: list[str], filial_id=None, filiais=()) -> dict:
    """Cria o usuário, troca a senha temporária e devolve os cabeçalhos de acesso."""
    r = cliente.post("/api/usuarios", headers=admin, json={
        "nome": email.split("@")[0].title(), "email": email, "perfis": perfis,
        "filial_id": filial_id, "filiais": list(filiais), "senha_temporaria": "temp12345"})
    assert r.status_code == 201, r.text
    h = login(cliente, email, "temp12345")
    r = cliente.post("/api/auth/trocar-senha", headers=h, json={"senha_atual": "temp12345", "nova_senha": "senha12345"})
    assert r.status_code == 200, r.text
    return h
