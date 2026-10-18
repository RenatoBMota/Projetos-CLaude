"""Redefine a senha de um usuário pelo terminal (ex.: administrador que esqueceu a senha).

Uso no servidor:
    docker compose exec app python -m app.redefinir_senha --email voce@empresa.com.br
    docker compose restart app   # libera bloqueio por tentativas, se houver
"""
import argparse
import sys

import psycopg

from . import config
from .criar_admin import pedir_senha
from .seguranca import hash_senha


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    senha = pedir_senha()
    with psycopg.connect(config.DATABASE_URL) as conn:
        n = conn.execute(
            "UPDATE usuarios SET senha_hash = %s, trocar_senha = false, ativo = true WHERE lower(email) = lower(%s)",
            (hash_senha(senha), args.email.strip()),
        ).rowcount
    if not n:
        sys.exit("E-mail não encontrado")
    print(f"Senha alterada: {args.email}")


if __name__ == "__main__":
    main()
