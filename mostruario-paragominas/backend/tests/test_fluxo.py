import uuid

import pytest

from conftest import criar_usuario


@pytest.fixture
def cenario(cliente, admin):
    post = lambda url, dados: cliente.post(url, headers=admin, json=dados).json()  # noqa: E731
    pgm = post("/api/cadastros/filiais", {"codigo": "PGM", "nome": "Paragominas"})
    bel = post("/api/cadastros/filiais", {"codigo": "BEL", "nome": "Belém"})
    forn = post("/api/cadastros/fornecedores", {"codigo": "F1", "razao_social": "Cerâmica A"})
    p1 = post("/api/cadastros/produtos", {"sku": "P1", "descricao": "Porcelanato", "custo_referencia": 50,
                                          "fornecedor_id": forn["id"]})
    p2 = post("/api/cadastros/produtos", {"sku": "P2", "descricao": "Vinílico", "custo_referencia": 20})
    motivos = {(m["tipo"], m["descricao"]): m["id"]
               for m in cliente.get("/api/cadastros/motivos?limite=500", headers=admin).json()["itens"]}
    return {
        "c": cliente, "admin": admin, "pgm": pgm, "bel": bel, "p1": p1, "p2": p2, "motivos": motivos,
        "req": criar_usuario(cliente, admin, "req@t.com", ["requisitante"], pgm["id"]),
        "com": criar_usuario(cliente, admin, "com@t.com", ["aprovador_comercial"], pgm["id"]),
        "log": criar_usuario(cliente, admin, "log@t.com", ["aprovador_logistica"], pgm["id"]),
        "dep": criar_usuario(cliente, admin, "dep@t.com", ["deposito"], pgm["id"]),
        "ges": criar_usuario(cliente, admin, "ges@t.com", ["gestor"]),
        "bel_req": criar_usuario(cliente, admin, "belreq@t.com", ["requisitante", "aprovador_comercial"], bel["id"]),
    }


def _nova(k, enviar=True, q1=10, q2=4):
    r = k["c"].post("/api/solicitacoes", headers=k["req"], json={
        "filial_id": k["pgm"]["id"], "finalidade": "Mostruário novo", "enviar": enviar,
        "itens": [{"produto_id": k["p1"]["id"], "quantidade": q1}, {"produto_id": k["p2"]["id"], "quantidade": q2}]})
    assert r.status_code == 201, r.text
    return r.json()


def _acao(k, quem, url, dados=None):
    return k["c"].post(url, headers=k[quem], json=dados or {})


def _aprovar_tudo(k, s):
    assert _acao(k, "com", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).status_code == 200
    r = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"})
    assert r.status_code == 200, r.text
    return r.json()


def test_fluxo_completo(cenario):
    k = cenario
    s = _nova(k)
    assert s["status"] == "aguardando_aprovacao_comercial" and s["protocolo"]
    assert float(s["valor_solicitado"]) == 10 * 50 + 4 * 20

    # logística não pode decidir antes do comercial
    assert _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).status_code == 403
    s = _acao(k, "com", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).json()
    assert s["status"] == "aguardando_aprovacao_logistica"

    i1, i2 = s["itens"][0]["item_id"], s["itens"][1]["item_id"]
    # logística reduz o item 2
    # reduzir sem justificativa do item é recusado
    r = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada", "quantidades": {str(i2): 2}})
    assert r.status_code == 400 and "justificativa" in r.json()["detail"]
    s = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao",
              {"decisao": "aprovada", "quantidades": {str(i2): 2}, "justificativas": {str(i2): "Pouca área no painel"}}).json()
    assert s["status"] == "aguardando_expedicao"
    assert s["itens"][1]["ajustes"][0]["justificativa"] == "Pouca área no painel"
    assert s["itens"][1]["ajustes"][0]["tipo"] == "aprovacao_logistica"
    assert [float(i["qtd_aprovada"]) for i in s["itens"]] == [10, 2]
    assert "expedir" not in s["acoes"]  # requisitante não expede

    chave = str(uuid.uuid4())
    sem_just = {"chave": str(uuid.uuid4()), "itens": [{"item_id": i1, "quantidade": 6}]}
    assert _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir", sem_just).status_code == 400
    corpo = {"chave": chave, "itens": [{"item_id": i1, "quantidade": 6, "justificativa": "Restante segue no próximo carregamento"},
                                       {"item_id": i2, "quantidade": 2}]}
    s = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir", corpo).json()
    assert s["status"] == "em_exposicao"
    # reenvio com a mesma chave não duplica
    s = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir", corpo).json()
    assert float(s["itens"][0]["qtd_expedida"]) == 6
    assert s["itens"][0]["status_item"] == "expedido_parcialmente"
    assert s["itens"][0]["ajustes"][-1]["tipo"] == "expedicao_parcial"

    # depósito encerra o saldo que não vai sair
    r = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/itens/{i1}/cancelar-pendente", {"observacao": "Sem estoque"})
    s = r.json()
    assert s["itens"][0]["status_item"] == "em_exposicao" and float(s["itens"][0]["qtd_aprovada"]) == 6

    amostras = k["c"].get("/api/amostras", headers=k["req"]).json()
    assert sum(float(a["qtd_em_loja"]) for a in amostras) == 8

    m = k["motivos"]
    devolucao = {"chave": str(uuid.uuid4()), "lancamentos": [
        {"item_id": i1, "destino": "estoque", "quantidade": 3},
        {"item_id": i1, "destino": "descarte", "quantidade": 2, "motivo_id": m[("descarte", "Quebrada / trincada")]},
    ]}
    s = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/devolver", devolucao).json()
    assert s["status"] == "devolucao_parcial"

    # perda sem motivo é recusada; com motivo encerra
    sem_motivo = {"chave": str(uuid.uuid4()), "lancamentos": [{"item_id": i1, "destino": "perda", "quantidade": 1}]}
    assert _acao(k, "dep", f"/api/solicitacoes/{s['id']}/devolver", sem_motivo).status_code == 400
    # mais do que está na loja: barrado pelo banco
    demais = {"chave": str(uuid.uuid4()), "lancamentos": [{"item_id": i2, "destino": "estoque", "quantidade": 5}]}
    r = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/devolver", demais)
    assert r.status_code == 400 and "saldo em loja" in r.json()["detail"]

    final = {"chave": str(uuid.uuid4()), "lancamentos": [
        {"item_id": i1, "destino": "perda", "quantidade": 1, "motivo_id": m[("perda", "Extraviada na loja")]},
        {"item_id": i2, "destino": "estoque", "quantidade": 2}]}
    s = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/devolver", final).json()
    assert s["status"] == "encerrada" and s["encerrado_em"]
    it = s["itens"][0]
    assert [float(it[c]) for c in ("qtd_estoque", "qtd_descarte", "qtd_perda", "qtd_em_loja")] == [3, 2, 1, 0]
    assert float(it["valor_perda"]) == 50

    # gestor estorna a perda: reabre a requisição
    perda = next(mv for mv in s["movimentacoes"] if mv["tipo"] == "perda")
    assert _acao(k, "dep", f"/api/movimentacoes/{perda['id']}/estornar",
                 {"motivo_id": m[("estorno", "Quantidade informada errada")]}).status_code == 403
    s = _acao(k, "ges", f"/api/movimentacoes/{perda['id']}/estornar",
              {"motivo_id": m[("estorno", "Quantidade informada errada")]}).json()
    assert s["status"] == "devolucao_parcial" and s["encerrado_em"] is None
    assert any(mv["estornada"] for mv in s["movimentacoes"])
    assert len(s["historico"]) >= 6


def test_reprovacao_exige_motivo(cenario):
    k = cenario
    s = _nova(k)
    url = f"/api/solicitacoes/{s['id']}/decisao"
    assert _acao(k, "com", url, {"decisao": "reprovada"}).status_code == 400
    sem_texto = {"decisao": "reprovada", "motivo_id": k["motivos"][("reprovacao", "Quantidade excessiva")]}
    assert _acao(k, "com", url, sem_texto).status_code == 400
    s = _acao(k, "com", url, {**sem_texto, "observacao": "Loja já tem esse modelo"}).json()
    assert s["status"] == "reprovada" and s["aprovacoes"][0]["motivo_descricao"] == "Quantidade excessiva"
    corpo = {"chave": str(uuid.uuid4()), "itens": [{"item_id": s["itens"][0]["item_id"], "quantidade": 1}]}
    assert _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir", corpo).status_code == 403


def test_rascunho_e_cancelamento(cenario):
    k = cenario
    s = _nova(k, enviar=False)
    assert s["status"] == "rascunho" and s["acoes"] == ["editar", "enviar", "cancelar"]
    # rascunho é invisível para os outros
    assert k["c"].get(f"/api/solicitacoes/{s['id']}", headers=k["com"]).status_code == 404
    r = k["c"].put(f"/api/solicitacoes/{s['id']}", headers=k["req"], json={
        "filial_id": k["pgm"]["id"], "itens": [{"produto_id": k["p1"]["id"], "quantidade": 3}]})
    assert len(r.json()["itens"]) == 1
    s = _acao(k, "req", f"/api/solicitacoes/{s['id']}/enviar").json()
    assert s["status"] == "aguardando_aprovacao_comercial"
    assert "editar" not in s["acoes"]
    url = f"/api/solicitacoes/{s['id']}/cancelar"
    assert _acao(k, "req", url).status_code == 400  # motivo obrigatório depois de enviada
    s = _acao(k, "req", url, {"motivo_id": k["motivos"][("cancelamento", "Desistência da loja")]}).json()
    assert s["status"] == "cancelada"


def test_nao_cancela_depois_de_expedir(cenario):
    k = cenario
    s = _aprovar_tudo(k, _nova(k))
    _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir",
          {"chave": str(uuid.uuid4()), "itens": [{"item_id": s["itens"][0]["item_id"], "quantidade": 1,
                                                 "justificativa": "Envio parcial"}]})
    r = _acao(k, "ges", f"/api/solicitacoes/{s['id']}/cancelar",
              {"motivo_id": k["motivos"][("cancelamento", "Desistência da loja")]})
    assert r.status_code == 403


def test_permissoes_e_abrangencia(cenario):
    k = cenario
    # aprovador não aprova a própria requisição
    r = k["c"].post("/api/solicitacoes", headers=k["bel_req"], json={
        "filial_id": k["bel"]["id"], "enviar": True, "itens": [{"produto_id": k["p1"]["id"], "quantidade": 1}]})
    sb = r.json()
    assert "aprovar" not in sb["acoes"]
    assert _acao(k, "bel_req", f"/api/solicitacoes/{sb['id']}/decisao", {"decisao": "aprovada"}).status_code == 403
    # quem é de Paragominas não vê Belém; gestor vê tudo
    assert k["c"].get(f"/api/solicitacoes/{sb['id']}", headers=k["com"]).status_code == 404
    assert k["c"].get(f"/api/solicitacoes/{sb['id']}", headers=k["ges"]).status_code == 200
    # requisitante não cria para filial fora da abrangência
    r = k["c"].post("/api/solicitacoes", headers=k["req"], json={
        "filial_id": k["bel"]["id"], "itens": [{"produto_id": k["p1"]["id"], "quantidade": 1}]})
    assert r.status_code == 400
    # só requisitante cria
    r = k["c"].post("/api/solicitacoes", headers=k["dep"], json={
        "filial_id": k["pgm"]["id"], "itens": [{"produto_id": k["p1"]["id"], "quantidade": 1}]})
    assert r.status_code == 403


def test_filas_e_resumo(cenario):
    k = cenario
    _nova(k)
    s2 = _aprovar_tudo(k, _nova(k))
    assert k["c"].get("/api/solicitacoes/resumo", headers=k["com"]).json()["filas"] == {"comercial": 1}
    assert k["c"].get("/api/solicitacoes/resumo", headers=k["dep"]).json()["filas"] == {"expedicao": 1, "devolucao": 0}
    lista = k["c"].get("/api/solicitacoes?fila=expedicao", headers=k["dep"]).json()
    assert [x["id"] for x in lista["itens"]] == [s2["id"]]
    assert k["c"].get("/api/solicitacoes?busca=vinil", headers=k["ges"]).json()["total"] == 2


def test_aprovacao_zerada_vira_reprovacao(cenario):
    k = cenario
    s = _nova(k)
    _acao(k, "com", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"})
    zeros = {str(i["item_id"]): 0 for i in s["itens"]}
    r = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada", "quantidades": zeros})
    assert r.status_code == 400
    # aumentar acima do solicitado é recusado
    r = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao",
              {"decisao": "aprovada", "quantidades": {str(s["itens"][0]["item_id"]): 99}})
    assert r.status_code == 400


def test_item_cortado_nao_impede_encerramento(cenario):
    k = cenario
    s = _nova(k)
    _acao(k, "com", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"})
    i1, i2 = s["itens"][0]["item_id"], s["itens"][1]["item_id"]
    s = _acao(k, "log", f"/api/solicitacoes/{s['id']}/decisao",
              {"decisao": "aprovada", "quantidades": {str(i2): 0}, "justificativas": {str(i2): "Fora de linha"}}).json()
    assert s["itens"][1]["status_item"] == "sem_atendimento"
    _acao(k, "dep", f"/api/solicitacoes/{s['id']}/expedir",
          {"chave": str(uuid.uuid4()), "itens": [{"item_id": i1, "quantidade": 10}]})
    s = _acao(k, "dep", f"/api/solicitacoes/{s['id']}/devolver",
              {"chave": str(uuid.uuid4()), "lancamentos": [{"item_id": i1, "destino": "estoque", "quantidade": 10}]}).json()
    assert s["status"] == "encerrada"


def test_admin_aprova_a_propria_requisicao(cenario):
    k = cenario
    eu = k["c"].get("/api/auth/eu", headers=k["admin"]).json()
    k["c"].put(f"/api/usuarios/{eu['id']}", headers=k["admin"], json={
        "nome": eu["nome"], "email": eu["email"], "perfis": ["admin", "requisitante"], "ativo": True})
    s = k["c"].post("/api/solicitacoes", headers=k["admin"], json={
        "filial_id": k["pgm"]["id"], "enviar": True, "itens": [{"produto_id": k["p1"]["id"], "quantidade": 3}]}).json()
    assert "aprovar" in s["acoes"]
    assert k["c"].get("/api/solicitacoes/resumo", headers=k["admin"]).json()["filas"]["comercial"] == 1
    s = _acao(k, "admin", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).json()
    s = _acao(k, "admin", f"/api/solicitacoes/{s['id']}/decisao", {"decisao": "aprovada"}).json()
    assert s["status"] == "aguardando_expedicao"


def test_expedicao_cancelando_o_restante(cenario):
    k = cenario
    s = _aprovar_tudo(k, _nova(k))
    i1, i2 = s["itens"][0]["item_id"], s["itens"][1]["item_id"]
    url = f"/api/solicitacoes/{s['id']}/expedir"
    # nada informado
    assert _acao(k, "dep", url, {"chave": str(uuid.uuid4()), "itens": [{"item_id": i1, "quantidade": 0}]}).status_code == 400
    s = _acao(k, "dep", url, {"chave": str(uuid.uuid4()), "itens": [
        {"item_id": i1, "quantidade": 7, "justificativa": "Só havia 7 no depósito", "cancelar_restante": True},
        {"item_id": i2, "quantidade": 0, "justificativa": "Produto em falta", "cancelar_restante": True},
    ]}).json()
    a, b = s["itens"]
    assert float(a["qtd_aprovada"]) == 7 and float(a["qtd_pendente_expedicao"]) == 0
    assert a["ajustes"][-1]["tipo"] == "saldo_cancelado" and a["ajustes"][-1]["justificativa"] == "Só havia 7 no depósito"
    assert b["status_item"] == "sem_atendimento"
    assert s["status"] == "em_exposicao" and "expedir" not in s["acoes"]
