-- Phase 6: Notification Logging

CREATE TABLE tb_notificacao_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id  UUID        REFERENCES tb_agendamentos(id) ON DELETE SET NULL,
    canal           VARCHAR(20) NOT NULL,    -- EMAIL | WHATSAPP
    evento          VARCHAR(60) NOT NULL,    -- agendamento.criado | confirmado | cancelado
    destinatario    VARCHAR(300) NOT NULL,
    assunto         VARCHAR(300),
    corpo           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'ENVIADO',  -- ENVIADO | FALHOU | DESATIVADO
    erro            TEXT,
    criado_em       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacao_log_agendamento ON tb_notificacao_log(agendamento_id);
CREATE INDEX idx_notificacao_log_canal_status ON tb_notificacao_log(canal, status);
CREATE INDEX idx_notificacao_log_criado ON tb_notificacao_log(criado_em DESC);
