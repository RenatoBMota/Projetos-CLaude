-- Tabela de log de sincronização com o YMS
CREATE TABLE IF NOT EXISTS tb_integracao_yms_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id  UUID REFERENCES tb_agendamentos(id) ON DELETE SET NULL,
    evento          VARCHAR(30) NOT NULL,  -- CONFIRMADO, CANCELADO, CHECK_IN, FINALIZADO
    direcao         CHAR(1) NOT NULL,      -- E=enviado, R=recebido
    payload         TEXT,
    yms_schedule_id INTEGER,
    sucesso         BOOLEAN NOT NULL DEFAULT FALSE,
    erro            TEXT,
    criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integracao_yms_agendamento
    ON tb_integracao_yms_log(agendamento_id);

CREATE INDEX IF NOT EXISTS idx_integracao_yms_criado_em
    ON tb_integracao_yms_log(criado_em DESC);
