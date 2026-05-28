-- V11: Módulo Documental — campos adicionais em documentos e checklist

ALTER TABLE tb_agendamento_documentos
    ADD COLUMN IF NOT EXISTS status_validacao VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS observacao_validacao TEXT,
    ADD COLUMN IF NOT EXISTS nome_arquivo       VARCHAR(300),
    ADD COLUMN IF NOT EXISTS tamanho_arquivo    BIGINT,
    ADD COLUMN IF NOT EXISTS content_type       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS valor_total        NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS validado_em        TIMESTAMP,
    ADD COLUMN IF NOT EXISTS validado_por       UUID;

CREATE TABLE IF NOT EXISTS tb_checklist_documental (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id      uuid NOT NULL REFERENCES tb_agendamentos(id) ON DELETE CASCADE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    nfe_ok              boolean      NOT NULL DEFAULT false,
    xml_ok              boolean      NOT NULL DEFAULT false,
    lacre_ok            boolean      NOT NULL DEFAULT false,
    foto_carga_ok       boolean      NOT NULL DEFAULT false,
    epi_ok              boolean      NOT NULL DEFAULT false,
    observacao          TEXT,
    atualizado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_checklist_agendamento UNIQUE (agendamento_id)
);

CREATE INDEX IF NOT EXISTS idx_agd_documentos_status ON tb_agendamento_documentos(status_validacao);
CREATE INDEX IF NOT EXISTS idx_checklist_status       ON tb_checklist_documental(status);
