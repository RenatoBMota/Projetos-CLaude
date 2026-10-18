from conftest import login


def _criar_usuario(cliente, admin, **extra):
    dados = {"nome": "Maria", "email": "maria@teste.com", "perfis": ["requisitante"],
             "senha_temporaria": "temp12345", **extra}
    r = cliente.post("/api/usuarios", json=dados, headers=admin)
    assert r.status_code == 201, r.text
    return r.json()


def test_login_invalido(cliente):
    r = cliente.post("/api/auth/login", json={"email": "admin@teste.com", "senha": "errada"})
    assert r.status_code == 401


def test_rotas_exigem_login(cliente):
    assert cliente.get("/api/usuarios").status_code == 401
    assert cliente.get("/api/cadastros/produtos").status_code == 401


def test_admin_cria_usuario_que_precisa_trocar_senha(cliente, admin):
    novo = _criar_usuario(cliente, admin)
    assert novo["trocar_senha"] is True
    assert novo["perfis"] == ["requisitante"]

    h = login(cliente, "maria@teste.com", "temp12345")
    assert cliente.get("/api/auth/eu", headers=h).status_code == 200
    assert cliente.get("/api/cadastros/produtos", headers=h).status_code == 403

    r = cliente.post("/api/auth/trocar-senha", headers=h,
                     json={"senha_atual": "temp12345", "nova_senha": "minhasenha1"})
    assert r.status_code == 200 and r.json()["trocar_senha"] is False
    assert cliente.get("/api/cadastros/produtos", headers=h).status_code == 200
    login(cliente, "maria@teste.com", "minhasenha1")


def test_nao_admin_nao_gerencia_usuarios_nem_cadastros(cliente, admin):
    _criar_usuario(cliente, admin)
    h = login(cliente, "maria@teste.com", "temp12345")
    cliente.post("/api/auth/trocar-senha", headers=h, json={"senha_atual": "temp12345", "nova_senha": "minhasenha1"})
    assert cliente.get("/api/usuarios", headers=h).status_code == 403
    r = cliente.post("/api/cadastros/filiais", headers=h, json={"codigo": "X", "nome": "X"})
    assert r.status_code == 403


def test_email_duplicado(cliente, admin):
    _criar_usuario(cliente, admin)
    r = cliente.post("/api/usuarios", headers=admin, json={
        "nome": "Outra", "email": "MARIA@teste.com", "perfis": ["gestor"], "senha_temporaria": "temp12345"})
    assert r.status_code == 409


def test_perfis_e_abrangencia(cliente, admin):
    f1 = cliente.post("/api/cadastros/filiais", headers=admin, json={"codigo": "PGM", "nome": "Paragominas"}).json()
    f2 = cliente.post("/api/cadastros/filiais", headers=admin, json={"codigo": "BEL", "nome": "Belém"}).json()
    novo = _criar_usuario(cliente, admin, filial_id=f1["id"], perfis=["aprovador_comercial", "gestor"],
                          filiais=[f1["id"], f2["id"]])
    assert sorted(novo["perfis"]) == ["aprovador_comercial", "gestor"]
    assert sorted(novo["filiais"]) == sorted([f1["id"], f2["id"]])

    alterado = cliente.put(f"/api/usuarios/{novo['id']}", headers=admin, json={
        "nome": "Maria", "email": "maria@teste.com", "filial_id": f1["id"],
        "perfis": ["deposito"], "filiais": [], "ativo": False}).json()
    assert alterado["perfis"] == ["deposito"] and alterado["filiais"] == [] and alterado["ativo"] is False
    r = cliente.post("/api/auth/login", json={"email": "maria@teste.com", "senha": "temp12345"})
    assert r.status_code == 401


def test_nao_remove_ultimo_admin(cliente, admin):
    r = cliente.put("/api/usuarios/1", headers=admin, json={
        "nome": "Admin", "email": "admin@teste.com", "perfis": ["gestor"], "ativo": True})
    assert r.status_code == 400
    assert "administrador" in r.json()["detail"]
    # alteração foi desfeita
    assert cliente.get("/api/auth/eu", headers=admin).json()["perfis"] == ["admin"]


def test_redefinir_senha(cliente, admin):
    novo = _criar_usuario(cliente, admin)
    r = cliente.post(f"/api/usuarios/{novo['id']}/redefinir-senha", headers=admin,
                     json={"senha_temporaria": "outra12345"})
    assert r.status_code == 200 and r.json()["trocar_senha"] is True
    login(cliente, "maria@teste.com", "outra12345")


def test_senha_curta_rejeitada(cliente, admin):
    r = cliente.post("/api/usuarios", headers=admin, json={
        "nome": "Zé", "email": "ze@teste.com", "perfis": ["gestor"], "senha_temporaria": "123"})
    assert r.status_code == 422


def test_limite_de_tentativas(cliente):
    for _ in range(5):
        r = cliente.post("/api/auth/login", json={"email": "admin@teste.com", "senha": "errada"})
        assert r.status_code == 401
    # bloqueada mesmo com a senha certa
    r = cliente.post("/api/auth/login", json={"email": "ADMIN@teste.com", "senha": "admin12345"})
    assert r.status_code == 429 and "Muitas tentativas" in r.json()["detail"]


def test_sucesso_zera_contador(cliente):
    for _ in range(4):
        cliente.post("/api/auth/login", json={"email": "admin@teste.com", "senha": "errada"})
    login(cliente, "admin@teste.com", "admin12345")
    for _ in range(4):
        cliente.post("/api/auth/login", json={"email": "admin@teste.com", "senha": "errada"})
    login(cliente, "admin@teste.com", "admin12345")
