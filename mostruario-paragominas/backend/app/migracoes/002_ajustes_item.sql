-- Ajustes de quantidade por item, sempre com justificativa:
-- redução na aprovação comercial/logística, expedição menor que o aprovado
-- e cancelamento do saldo que não será expedido.
CREATE TABLE IF NOT EXISTS ajustes_item (
    id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id              bigint NOT NULL REFERENCES itens_solicitacao(id),
    tipo                 text NOT NULL CHECK (tipo IN ('aprovacao_comercial', 'aprovacao_logistica',
                                                       'expedicao_parcial', 'saldo_cancelado')),
    quantidade_anterior  numeric(12,3) NOT NULL,
    quantidade_nova      numeric(12,3) NOT NULL,
    justificativa        text NOT NULL CHECK (length(trim(justificativa)) >= 3),
    usuario_id           bigint NOT NULL REFERENCES usuarios(id),
    criado_em            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ajustes_item_item_id_idx ON ajustes_item (item_id);
