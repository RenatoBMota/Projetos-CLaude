"""Atualização automática do banco.

Na inicialização, aplica em ordem os arquivos app/migracoes/NNN_*.sql que
ainda não constam na tabela `migracoes`. Cada migração roda numa transação e
deve ser idempotente (IF NOT EXISTS), pois o db/schema.sql de uma instalação
nova já traz as mesmas mudanças.
"""
from pathlib import Path

import psycopg

PASTA = Path(__file__).parent / "migracoes"
TRAVA = 7_402_001  # chave do advisory lock (evita duas aplicações simultâneas)


def aplicar(url: str) -> list[str]:
    aplicadas = []
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("SELECT pg_advisory_lock(%s)", (TRAVA,))
        try:
            conn.execute("""CREATE TABLE IF NOT EXISTS migracoes (
                                nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())""")
            feitas = {r[0] for r in conn.execute("SELECT nome FROM migracoes")}
            for arquivo in sorted(PASTA.glob("*.sql")):
                if arquivo.name in feitas:
                    continue
                with conn.transaction():
                    conn.execute(arquivo.read_text())
                    conn.execute("INSERT INTO migracoes (nome) VALUES (%s)", (arquivo.name,))
                aplicadas.append(arquivo.name)
        finally:
            conn.execute("SELECT pg_advisory_unlock(%s)", (TRAVA,))
    return aplicadas
