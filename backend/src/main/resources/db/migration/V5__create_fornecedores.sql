-- V5: Fornecedores

CREATE TABLE tb_fornecedores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    razao_social VARCHAR(300) NOT NULL,
    nome_fantasia VARCHAR(200),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(50),
    tipo_fornecedor VARCHAR(100),
    email VARCHAR(200),
    telefone VARCHAR(20),
    responsavel VARCHAR(200),
    limite_agendamentos_dia INTEGER,
    sla_documental INTEGER,
    bloqueio_automatico BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_fornecedores_cnpj ON tb_fornecedores(cnpj) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_fornecedores_updated_at
    BEFORE UPDATE ON tb_fornecedores
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
