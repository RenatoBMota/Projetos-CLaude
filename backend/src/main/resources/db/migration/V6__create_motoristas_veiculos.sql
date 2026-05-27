-- V6: Motoristas e Veículos

CREATE TABLE tb_motoristas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    rg VARCHAR(20),
    cnh VARCHAR(20) NOT NULL UNIQUE,
    categoria_cnh CHAR(5) NOT NULL,
    validade_cnh DATE NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    nacionalidade VARCHAR(50) DEFAULT 'Brasileiro',
    foto_path VARCHAR(500),
    blacklist BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_blacklist VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_veiculos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    placa VARCHAR(8) NOT NULL UNIQUE,
    tipo_veiculo VARCHAR(50) NOT NULL,
    tipo_carroceria VARCHAR(50) NOT NULL,
    tara DECIMAL(10,2),
    capacidade_maxima DECIMAL(10,2),
    rntrc VARCHAR(20),
    proprietario VARCHAR(300),
    ano INTEGER,
    modelo VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_motoristas_cpf   ON tb_motoristas(cpf) WHERE deleted_at IS NULL;
CREATE INDEX idx_motoristas_cnh   ON tb_motoristas(cnh) WHERE deleted_at IS NULL;
CREATE INDEX idx_veiculos_placa   ON tb_veiculos(placa) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_motoristas_updated_at
    BEFORE UPDATE ON tb_motoristas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_veiculos_updated_at
    BEFORE UPDATE ON tb_veiculos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
