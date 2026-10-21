from decimal import Decimal

import pytest

from app.medidas import extrair, pecas_por_caixa
from test_fluxo import cenario  # noqa: F401


@pytest.mark.parametrize("descricao, esperado, pecas", [
    ("CERBRAS 33X46A CARIRI AZUL 2,23", ("33", "46", "2.23"), 15),
    ("EMBRAMACO RET 63X122A P63541 2,30", ("63", "122", "2.30"), 3),
    ("INCENOR RET 63X63A ACT 63670R 2,79", ("63", "63", "2.79"), 7),
    ("EMBRAMACO 33X60A HD53106 BR CX2,43", ("33", "60", "2.43"), 12),
    ("INCENOR 58X58A IV 66470 2,68M", ("58", "58", "2.68"), 8),
    ("INCENOR 32,5X57A 57260 CX2,21**", ("32.5", "57", "2.21"), 12),
])
def test_extrair_medidas(descricao, esperado, pecas):
    l, c, cx = extrair(descricao)
    assert (l, c, cx) == tuple(Decimal(x) for x in esperado)
    assert pecas_por_caixa(l, c, cx) == pecas


def test_sem_medida():
    assert extrair("PORCELANATO CINZA") == (None, None, None)


def test_requisicao_por_pecas(cenario):  # noqa: F811
    k = cenario
    p = k["c"].post("/api/cadastros/produtos", headers=k["admin"], json={
        "sku": "379999", "descricao": "CERBRAS 33X46A CARIRI AZUL 2,23", "unidade": "M2", "custo_referencia": 40}).json()
    assert p["pecas_caixa"] == 15 and float(p["peca_largura_cm"]) == 33 and float(p["m2_caixa"]) == 2.23
    r = k["c"].post("/api/solicitacoes", headers=k["req"], json={
        "filial_id": k["pgm"]["id"], "itens": [{"produto_id": p["id"], "pecas": 15}, {"produto_id": k["p2"]["id"], "quantidade": 3}]})
    assert r.status_code == 201, r.text
    a, b = r.json()["itens"]
    assert float(a["quantidade_solicitada"]) == 2.23 and float(a["quantidade_pecas"]) == 15  # 1 caixa
    assert float(b["quantidade_solicitada"]) == 3 and b["quantidade_pecas"] is None
    # produto sem medida não aceita peças
    r = k["c"].post("/api/solicitacoes", headers=k["req"], json={
        "filial_id": k["pgm"]["id"], "itens": [{"produto_id": k["p2"]["id"], "pecas": 2}]})
    assert r.status_code == 400 and "m²" in r.json()["detail"]
    # medidas informadas à mão prevalecem
    alt = k["c"].put(f"/api/cadastros/produtos/{p['id']}", headers=k["admin"], json={
        "sku": "379999", "descricao": "CERBRAS 33X46A CARIRI AZUL 2,23", "peca_largura_cm": 33,
        "peca_comprimento_cm": 46, "m2_caixa": 2.28}).json()
    assert float(alt["m2_caixa"]) == 2.28
