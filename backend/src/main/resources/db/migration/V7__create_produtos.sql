-- V7: Produtos e seed do usuário administrador

CREATE TABLE tb_produtos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(300) NOT NULL,
    categoria VARCHAR(100),
    peso_medio DECIMAL(10,3),
    cubagem DECIMAL(10,4),
    tipo_armazenagem VARCHAR(100),
    necessita_refrigeracao BOOLEAN NOT NULL DEFAULT FALSE,
    produto_perigoso BOOLEAN NOT NULL DEFAULT FALSE,
    classe_risco VARCHAR(50),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_produtos_codigo ON tb_produtos(codigo) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_produtos_updated_at
    BEFORE UPDATE ON tb_produtos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Usuário administrador padrão (senha: Admin@123)
INSERT INTO tb_usuarios (id, nome, email, senha, role, ativo)
VALUES (
    uuid_generate_v4(),
    'Administrador',
    'admin@rbm.com.br',
    '$2a$12$TGlHF0gY2PJqBhVhvk5LeeNMxcBuiCEJ3NlUdMDa6G2VjDyV9G4dC',
    'ROLE_ADMIN',
    TRUE
);
