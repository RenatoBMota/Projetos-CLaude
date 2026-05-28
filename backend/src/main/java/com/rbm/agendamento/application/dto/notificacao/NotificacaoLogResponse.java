package com.rbm.agendamento.application.dto.notificacao;

import com.rbm.agendamento.domain.entity.NotificacaoLog;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificacaoLogResponse(
        UUID id,
        UUID agendamentoId,
        String canal,
        String evento,
        String destinatario,
        String assunto,
        String status,
        String erro,
        LocalDateTime criadoEm
) {
    public static NotificacaoLogResponse from(NotificacaoLog n) {
        return new NotificacaoLogResponse(
                n.getId(), n.getAgendamentoId(), n.getCanal(), n.getEvento(),
                n.getDestinatario(), n.getAssunto(), n.getStatus(), n.getErro(), n.getCriadoEm()
        );
    }
}
