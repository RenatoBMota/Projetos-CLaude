-- Phase 4: Portal Externo / Aceite de Transportadoras

-- Link carrier users to their transportadora
ALTER TABLE tb_usuarios
    ADD COLUMN IF NOT EXISTS transportadora_id UUID REFERENCES tb_transportadoras(id);

-- Aceite tracking on agendamentos
ALTER TABLE tb_agendamentos
    ADD COLUMN IF NOT EXISTS aceite_em      TIMESTAMP,
    ADD COLUMN IF NOT EXISTS aceite_por     UUID,
    ADD COLUMN IF NOT EXISTS aceite_motivo  TEXT;

-- Index for portal queries (filter by transportadora)
CREATE INDEX IF NOT EXISTS idx_agendamentos_transportadora_status
    ON tb_agendamentos(transportadora_id, status)
    WHERE deleted_at IS NULL;
