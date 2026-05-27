package com.rbm.agendamento.application.dto.agendamento;

import com.rbm.agendamento.domain.entity.AgendamentoHistorico;
import com.rbm.agendamento.domain.enums.StatusAgendamento;

import java.time.LocalDateTime;
import java.util.UUID;

public record HistoricoResponse(
        UUID id,
        StatusAgendamento statusAnterior,
        StatusAgendamento statusNovo,
        String observacao,
        UUID usuarioId,
        LocalDateTime createdAt
) {
    public static HistoricoResponse from(AgendamentoHistorico h) {
        return new HistoricoResponse(
                h.getId(),
                h.getStatusAnterior(),
                h.getStatusNovo(),
                h.getObservacao(),
                h.getUsuarioId(),
                h.getCreatedAt()
        );
    }
}
