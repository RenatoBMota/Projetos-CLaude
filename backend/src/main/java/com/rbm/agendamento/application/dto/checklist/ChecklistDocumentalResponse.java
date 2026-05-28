package com.rbm.agendamento.application.dto.checklist;

import com.rbm.agendamento.domain.entity.ChecklistDocumental;
import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChecklistDocumentalResponse(
        UUID id,
        UUID agendamentoId,
        String agendamentoCodigo,
        StatusValidacaoDocumento status,
        boolean nfeOk,
        boolean xmlOk,
        boolean lacreOk,
        boolean fotoCargaOk,
        boolean epiOk,
        boolean nfeExigida,
        boolean xmlExigido,
        boolean lacreExigido,
        boolean fotoCargaExigida,
        boolean epiExigido,
        String observacao,
        LocalDateTime atualizadoEm
) {
    public static ChecklistDocumentalResponse from(ChecklistDocumental c,
                                                    boolean nfeExigida, boolean xmlExigido,
                                                    boolean lacreExigido, boolean fotoCargaExigida,
                                                    boolean epiExigido) {
        return new ChecklistDocumentalResponse(
                c.getId(),
                c.getAgendamento().getId(),
                c.getAgendamento().getCodigo(),
                c.getStatus(),
                c.getNfeOk(),
                c.getXmlOk(),
                c.getLacreOk(),
                c.getFotoCargaOk(),
                c.getEpiOk(),
                nfeExigida, xmlExigido, lacreExigido, fotoCargaExigida, epiExigido,
                c.getObservacao(),
                c.getAtualizadoEm()
        );
    }
}
