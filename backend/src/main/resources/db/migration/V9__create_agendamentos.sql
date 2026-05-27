-- V9: Agendamentos e documentos

CREATE TABLE tb_agendamentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'AGENDAMENTO',
    tipo_operacao VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CRIADO',
    filial_id UUID NOT NULL REFERENCES tb_filiais(id),
    doca_id UUID REFERENCES tb_docas(id),
    janela_id UUID NOT NULL REFERENCES tb_janelas(id),
    transportadora_id UUID REFERENCES tb_transportadoras(id),
    fornecedor_id UUID REFERENCES tb_fornecedores(id),
    motorista_id UUID REFERENCES tb_motoristas(id),
    veiculo_id UUID REFERENCES tb_veiculos(id),
    data_operacao DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    peso_bruto DECIMAL(10,2),
    peso_liquido DECIMAL(10,2),
    cubagem DECIMAL(10,4),
    volumes INTEGER,
    observacoes TEXT,
    protocolo VARCHAR(50),
    qr_code TEXT,
    sla_status VARCHAR(20) NOT NULL DEFAULT 'NO_PRAZO',
    no_show BOOLEAN NOT NULL DEFAULT FALSE,
    expira_em TIMESTAMP,
    criado_por UUID REFERENCES tb_usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_agendamento_documentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agendamento_id UUID NOT NULL REFERENCES tb_agendamentos(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL,
    numero VARCHAR(50),
    serie VARCHAR(10),
    chave_acesso VARCHAR(44),
    xml_path VARCHAR(500),
    emitente VARCHAR(300),
    destinatario VARCHAR(300),
    peso DECIMAL(10,2),
    volumes INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tb_agendamento_historico (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agendamento_id UUID NOT NULL REFERENCES tb_agendamentos(id),
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    observacao TEXT,
    usuario_id UUID REFERENCES tb_usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agendamentos_janela     ON tb_agendamentos(janela_id, data_operacao, horario_inicio) WHERE deleted_at IS NULL;
CREATE INDEX idx_agendamentos_data       ON tb_agendamentos(data_operacao) WHERE deleted_at IS NULL;
CREATE INDEX idx_agendamentos_status     ON tb_agendamentos(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_agendamentos_filial     ON tb_agendamentos(filial_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agendamentos_transp     ON tb_agendamentos(transportadora_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_docs_agendamento        ON tb_agendamento_documentos(agendamento_id);
CREATE INDEX idx_historico_agendamento   ON tb_agendamento_historico(agendamento_id);

CREATE TRIGGER trg_agendamentos_updated_at
    BEFORE UPDATE ON tb_agendamentos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
