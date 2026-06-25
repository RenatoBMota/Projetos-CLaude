"""
wsgi.py — ponto de entrada para produção (Gunicorn).

Uso: gunicorn -w 3 -b 127.0.0.1:8000 wsgi:app
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()
