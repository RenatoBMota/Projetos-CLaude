-- V10: Bloqueios operacionais

CREATE TABLE tb_bloqueios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    filial_id UUID NOT NULL REFERENCES tb_filiais(id),
    doca_id UUID REFERENCES tb_docas(id),
    janela_id UUID REFERENCES tb_janelas(id),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    horario_inicio TIME,
    horario_fim TIME,
    motivo VARCHAR(300) NOT NULL,
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por UUID REFERENCES tb_usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bloqueios_filial ON tb_bloqueios(filial_id, data_inicio, data_fim) WHERE ativo = TRUE;
CREATE INDEX idx_bloqueios_doca   ON tb_bloqueios(doca_id, data_inicio, data_fim)   WHERE ativo = TRUE;

CREATE TRIGGER trg_bloqueios_updated_at
    BEFORE UPDATE ON tb_bloqueios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
