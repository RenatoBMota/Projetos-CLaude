package com.rbm.agendamento.application.dto.agendamento;

import com.rbm.agendamento.domain.entity.AgendamentoDocumento;

import java.math.BigDecimal;
import java.util.UUID;

public record DocumentoResponse(
        UUID id,
        String tipoDocumento,
        String numero,
        String serie,
        String chaveAcesso,
        String emitente,
        String destinatario,
        BigDecimal peso,
        Integer volumes
) {
    public static DocumentoResponse from(AgendamentoDocumento d) {
        return new DocumentoResponse(
                d.getId(),
                d.getTipoDocumento(),
                d.getNumero(),
                d.getSerie(),
                d.getChaveAcesso(),
                d.getEmitente(),
                d.getDestinatario(),
                d.getPeso(),
                d.getVolumes()
        );
    }
}
