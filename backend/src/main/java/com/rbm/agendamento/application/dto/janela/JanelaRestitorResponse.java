package com.rbm.agendamento.application.dto.janela;

import com.rbm.agendamento.domain.entity.JanelaRestritor;
import com.rbm.agendamento.domain.enums.TipoRestritor;

import java.util.UUID;

public record JanelaRestitorResponse(
        UUID id,
        TipoRestritor tipo,
        String valor
) {
    public static JanelaRestitorResponse from(JanelaRestritor r) {
        return new JanelaRestitorResponse(r.getId(), r.getTipo(), r.getValor());
    }
}
