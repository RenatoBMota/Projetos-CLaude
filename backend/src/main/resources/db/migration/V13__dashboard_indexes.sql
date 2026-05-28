-- Phase 5: Operational Dashboard / Performance Indexes

CREATE INDEX IF NOT EXISTS idx_agendamentos_status_data
    ON tb_agendamentos(status, data_operacao DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_sla_filial
    ON tb_agendamentos(sla_status, filial_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_noshow_data
    ON tb_agendamentos(no_show, data_operacao DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_data_filial
    ON tb_agendamentos(data_operacao, filial_id)
    WHERE deleted_at IS NULL;
