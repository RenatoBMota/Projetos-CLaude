-- V2: Usuários e tokens de refresh

CREATE TABLE tb_usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    filial_id UUID,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_refresh_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES tb_usuarios(id),
    token VARCHAR(500) NOT NULL UNIQUE,
    expira_em TIMESTAMP NOT NULL,
    revogado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email   ON tb_usuarios(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_token    ON tb_refresh_tokens(token);
CREATE INDEX idx_refresh_usuario  ON tb_refresh_tokens(usuario_id);

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON tb_usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
