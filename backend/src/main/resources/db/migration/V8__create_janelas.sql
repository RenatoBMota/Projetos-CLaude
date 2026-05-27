-- V8: Janelas operacionais e restritores

CREATE TABLE tb_janelas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    tipo_processo VARCHAR(50) NOT NULL,
    descricao TEXT,
    prioridade INTEGER NOT NULL DEFAULT 0,
    filial_id UUID NOT NULL REFERENCES tb_filiais(id),
    doca_id UUID REFERENCES tb_docas(id),
    area_operacional VARCHAR(200),
    capacidade_simultanea INTEGER NOT NULL DEFAULT 1,
    duracao_atendimento INTEGER NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    sla_atraso INTEGER,
    tempo_reagendamento INTEGER NOT NULL DEFAULT 24,
    tempo_cancelamento INTEGER NOT NULL DEFAULT 4,
    tempo_edicao_terceiros INTEGER NOT NULL DEFAULT 48,
    buffer_entre_operacoes INTEGER NOT NULL DEFAULT 0,
    -- Itens obrigatórios
    obrigatorio_epi BOOLEAN NOT NULL DEFAULT FALSE,
    obrigatorio_nfe BOOLEAN NOT NULL DEFAULT TRUE,
    obrigatorio_xml BOOLEAN NOT NULL DEFAULT FALSE,
    obrigatorio_lacre BOOLEAN NOT NULL DEFAULT FALSE,
    obrigatorio_foto_carga BOOLEAN NOT NULL DEFAULT FALSE,
    -- Aceite
    aceite_obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
    quem_aprova VARCHAR(100),
    sla_aprovacao INTEGER,
    aprovacao_automatica BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tb_janela_restritores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    janela_id UUID NOT NULL REFERENCES tb_janelas(id) ON DELETE CASCADE,
    tipo VARCHAR(80) NOT NULL,
    valor VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_janelas_filial ON tb_janelas(filial_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_janelas_doca   ON tb_janelas(doca_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_restritores_janela ON tb_janela_restritores(janela_id);

CREATE TRIGGER trg_janelas_updated_at
    BEFORE UPDATE ON tb_janelas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
