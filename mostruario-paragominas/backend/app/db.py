import json

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def abrir(url: str) -> None:
    global _pool
    _pool = ConnectionPool(url, kwargs={"row_factory": dict_row}, min_size=1, max_size=10, open=True)


def fechar() -> None:
    global _pool
    if _pool:
        _pool.close()
        _pool = None


def get_conn():
    """Uma transação por requisição: commit no sucesso, rollback em qualquer erro."""
    with _pool.connection() as conn:
        yield conn


def auditar(conn: Connection, usuario_id: int | None, entidade: str, entidade_id: int,
            acao: str, antes: dict | None = None, depois: dict | None = None) -> None:
    conn.execute(
        """INSERT INTO auditoria (usuario_id, entidade, entidade_id, acao, dados_antes, dados_depois)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (usuario_id, entidade, entidade_id, acao,
         json.dumps(antes, default=str) if antes else None,
         json.dumps(depois, default=str) if depois else None),
    )
