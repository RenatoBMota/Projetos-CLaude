import psycopg

from conftest import BANCO, _url, criar_usuario
from test_fluxo import _acao, cenario  # noqa: F401
from app import migracoes


def _req(k, h, **extra):
    return k["c"].post("/api/solicitacoes", headers=h, json={
        "filial_id": k["pgm"]["id"], "enviar": True,
        "itens": [{"produto_id": k["p1"]["id"], "quantidade": 2}], **extra})


def test_conta_compartilhada_exige_nome_do_promotor(cenario):  # noqa: F811
    k = cenario
    loja = criar_usuario(k["c"], k["admin"], "loja@t.com", ["requisitante_geral"], k["pgm"]["id"])
    assert _req(k, loja).status_code == 400
    assert _req(k, loja, solicitante_nome="  ").status_code == 400

    r = _req(k, loja, solicitante_nome="  Marcos   Silva ", solicitante_empresa="Portobello")
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["solicitante_nome"] == "Marcos Silva" and s["solicitante_empresa"] == "Portobello"
    assert s["requisitante_nome"] == "Marcos Silva" and s["usuario_nome"] == "Loja"

    # aparece com o nome do promotor nas listas, busca e sugestões
    lista = k["c"].get("/api/solicitacoes?busca=marcos", headers=k["ges"]).json()
    assert [x["requisitante_nome"] for x in lista["itens"]] == ["Marcos Silva"]
    sug = k["c"].get("/api/solicitacoes/solicitantes?busca=marc", headers=loja).json()
    assert sug == [{"nome": "Marcos Silva", "empresa": "Portobello"}]

    # o aprovador comum pode aprovar (não é "a própria" requisição dele)
    assert _acao(k, "com", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).status_code == 200

    # relatórios agrupam pelo promotor
    g = k["c"].get("/api/relatorios/gerencial", headers=k["ges"]).json()
    assert g["top_requisitantes"][0]["requisitante"] == "Marcos Silva"
    rel = k["c"].get("/api/relatorios/requisicoes", headers=k["ges"]).json()["linhas"]
    assert rel[0]["requisitante"] == "Marcos Silva"


def test_requisitante_pessoal_nao_informa_outro_nome(cenario):  # noqa: F811
    k = cenario
    s = _req(k, k["req"], solicitante_nome="Outra Pessoa").json()
    assert s["solicitante_nome"] is None and s["requisitante_nome"] == "Req"


def test_migracoes_idempotentes(cliente):
    url = _url(BANCO)
    # a aplicação já rodou as migrações ao iniciar; rodar de novo não faz nada
    assert migracoes.aplicar(url) == []
    with psycopg.connect(url) as conn:
        feitas = [r[0] for r in conn.execute("SELECT nome FROM migracoes")]
        assert "001_requisitante_geral.sql" in feitas
        # simula banco antigo: remove o registro e reaplica (IF NOT EXISTS)
        conn.execute("DELETE FROM migracoes")
    assert migracoes.aplicar(url) == ["001_requisitante_geral.sql", "002_ajustes_item.sql", "003_medidas_peca.sql"]
