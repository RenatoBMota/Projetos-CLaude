-- V4: Transportadoras e Contatos

CREATE TABLE tb_transportadoras (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    razao_social VARCHAR(300) NOT NULL,
    nome_fantasia VARCHAR(200),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(50),
    nacionalidade VARCHAR(50) NOT NULL DEFAULT 'Brasileira',
    tipo_operacao VARCHAR(50),
    email VARCHAR(200),
    telefone VARCHAR(20),
    responsavel VARCHAR(200),
    sla_personalizado INTEGER,
    prioridade INTEGER NOT NULL DEFAULT 0,
    bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
    blacklist BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_bloqueio VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_transportadora_contatos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transportadora_id UUID NOT NULL REFERENCES tb_transportadoras(id),
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    telefone VARCHAR(20),
    cargo VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transportadoras_cnpj       ON tb_transportadoras(cnpj) WHERE deleted_at IS NULL;
CREATE INDEX idx_contatos_transportadora    ON tb_transportadora_contatos(transportadora_id);

CREATE TRIGGER trg_transportadoras_updated_at
    BEFORE UPDATE ON tb_transportadoras
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
