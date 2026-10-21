from test_fluxo import _aprovar_tudo, _nova, cenario  # noqa: F401


def test_versao_muda_a_cada_alteracao(cenario):  # noqa: F811
    k = cenario
    ver = lambda: k["c"].get("/api/versao", headers=k["com"]).json()["versao"]  # noqa: E731
    assert k["c"].get("/api/versao").status_code == 401
    v0 = ver()
    assert ver() == v0
    s = _nova(k)
    v1 = ver()
    assert v1 != v0
    _aprovar_tudo(k, s)
    assert ver() not in (v0, v1)
