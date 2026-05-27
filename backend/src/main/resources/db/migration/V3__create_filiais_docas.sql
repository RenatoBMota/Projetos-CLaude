-- V3: Filiais e Docas

CREATE TABLE tb_filiais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    razao_social VARCHAR(300) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(50),
    endereco VARCHAR(300),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep VARCHAR(9),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    telefone VARCHAR(20),
    email VARCHAR(200),
    horario_inicio TIME,
    horario_fim TIME,
    limite_diario INTEGER,
    tempo_medio_atendimento INTEGER,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_docas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    filial_id UUID NOT NULL REFERENCES tb_filiais(id),
    capacidade_simultanea INTEGER NOT NULL DEFAULT 1,
    peso_maximo DECIMAL(10,2),
    altura_maxima DECIMAL(5,2),
    comprimento_maximo DECIMAL(5,2),
    tipos_carga_permitida VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT uq_doca_codigo_filial UNIQUE (codigo, filial_id)
);

CREATE INDEX idx_filiais_cnpj    ON tb_filiais(cnpj) WHERE deleted_at IS NULL;
CREATE INDEX idx_docas_filial    ON tb_docas(filial_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_filiais_updated_at
    BEFORE UPDATE ON tb_filiais
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_docas_updated_at
    BEFORE UPDATE ON tb_docas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE tb_usuarios
    ADD CONSTRAINT fk_usuarios_filial
    FOREIGN KEY (filial_id) REFERENCES tb_filiais(id);
