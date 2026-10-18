"""Cria o administrador inicial.

Uso:
    python -m app.criar_admin --nome "Renato" --email renato@empresa.com.br

A senha é pedida no terminal (ou lida de ADMIN_SENHA). O administrador
cria os demais usuários pela tela Configuração > Usuários.
"""
import argparse
import getpass
import os
import sys

import psycopg

from . import config
from .seguranca import hash_senha


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--nome", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    senha = os.environ.get("ADMIN_SENHA") or getpass.getpass("Senha do administrador: ")
    if len(senha) < config.SENHA_MIN:
        sys.exit(f"A senha precisa ter pelo menos {config.SENHA_MIN} caracteres")

    with psycopg.connect(config.DATABASE_URL) as conn:
        if conn.execute("SELECT 1 FROM usuarios WHERE lower(email) = lower(%s)", (args.email,)).fetchone():
            sys.exit("Já existe um usuário com este e-mail")
        usuario_id = conn.execute(
            """INSERT INTO usuarios (nome, email, senha_hash, trocar_senha)
               VALUES (%s, lower(%s), %s, false) RETURNING id""",
            (args.nome, args.email, hash_senha(senha)),
        ).fetchone()[0]
        conn.execute("INSERT INTO usuario_perfis (usuario_id, perfil) VALUES (%s, 'admin')", (usuario_id,))
    print(f"Administrador criado: {args.email}")


if __name__ == "__main__":
    main()
