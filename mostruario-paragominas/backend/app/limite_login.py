"""Limite de tentativas de login (proteção contra adivinhação de senha).

Guardado em memória: suficiente para um único processo do servidor, que é
como o sistema roda. Reiniciar o servidor zera os contadores.
"""
import threading
import time
from collections import deque

JANELA_SEG = 15 * 60
MAX_POR_EMAIL = 5    # erros seguidos na mesma conta
MAX_POR_IP = 20      # erros vindos do mesmo endereço (várias contas)

_falhas: dict[str, deque] = {}
_trava = threading.Lock()


def _recentes(chave: str, agora: float) -> deque:
    fila = _falhas.setdefault(chave, deque())
    while fila and agora - fila[0] > JANELA_SEG:
        fila.popleft()
    return fila


def bloqueado(email: str, ip: str) -> int:
    """Segundos até liberar (0 = liberado)."""
    agora = time.monotonic()
    with _trava:
        espera = 0
        for chave, limite in ((f"email:{email}", MAX_POR_EMAIL), (f"ip:{ip}", MAX_POR_IP)):
            fila = _recentes(chave, agora)
            if len(fila) >= limite:
                espera = max(espera, int(JANELA_SEG - (agora - fila[0])) + 1)
        return espera


def registrar_falha(email: str, ip: str) -> None:
    agora = time.monotonic()
    with _trava:
        for chave in (f"email:{email}", f"ip:{ip}"):
            _recentes(chave, agora).append(agora)


def registrar_sucesso(email: str) -> None:
    with _trava:
        _falhas.pop(f"email:{email}", None)


def limpar() -> None:
    with _trava:
        _falhas.clear()
