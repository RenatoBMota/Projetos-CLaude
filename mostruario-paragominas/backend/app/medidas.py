"""Medidas da peça a partir da descrição do produto.

Padrão das descrições do ERP: primeiro o tamanho da peça (cm) e, no fim,
os m² da caixa. Ex.: "CERBRAS 33X46A CARIRI AZUL 2,23" → peça 33×46 cm,
caixa com 2,23 m² → 15 peças por caixa.
"""
import re
from decimal import Decimal, InvalidOperation

_DIMENSAO = re.compile(r"(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)")
_DECIMAL = re.compile(r"\d+,\d+|\d+\.\d+")


def _num(texto: str) -> Decimal | None:
    try:
        return Decimal(texto.replace(",", "."))
    except InvalidOperation:
        return None


def extrair(descricao: str | None) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    """(largura_cm, comprimento_cm, m2_caixa); None no que não for encontrado."""
    m = _DIMENSAO.search(descricao or "")
    if not m:
        return None, None, None
    largura, comprimento = _num(m.group(1)), _num(m.group(2))
    if not (largura and comprimento and 1 <= largura <= 400 and 1 <= comprimento <= 400):
        return None, None, None
    decimais = _DECIMAL.findall(descricao[m.end():])
    caixa = _num(decimais[-1]) if decimais else None
    if caixa is not None and not (Decimal("0.05") <= caixa <= 20):
        caixa = None
    return largura, comprimento, caixa


def pecas_por_caixa(largura, comprimento, caixa) -> int | None:
    if not (largura and comprimento and caixa):
        return None
    n = round(Decimal(caixa) / (Decimal(largura) * Decimal(comprimento) / 10000))
    return n or None


def completar(dados: dict) -> dict:
    """Preenche as medidas pela descrição quando não foram informadas."""
    if dados.get("peca_largura_cm") or dados.get("peca_comprimento_cm") or dados.get("m2_caixa"):
        return dados
    largura, comprimento, caixa = extrair(dados.get("descricao"))
    return {**dados, "peca_largura_cm": largura, "peca_comprimento_cm": comprimento, "m2_caixa": caixa}


def preencher_pendentes(url: str) -> int:
    """Lê as medidas dos produtos que ainda não têm (ex.: cadastrados antes desta versão)."""
    import psycopg

    n = 0
    with psycopg.connect(url) as conn:
        for pid, descricao in conn.execute(
                "SELECT id, descricao FROM produtos WHERE peca_largura_cm IS NULL AND m2_caixa IS NULL").fetchall():
            largura, comprimento, caixa = extrair(descricao)
            if largura:
                conn.execute(
                    "UPDATE produtos SET peca_largura_cm = %s, peca_comprimento_cm = %s, m2_caixa = %s WHERE id = %s",
                    (largura, comprimento, caixa, pid))
                n += 1
    return n
