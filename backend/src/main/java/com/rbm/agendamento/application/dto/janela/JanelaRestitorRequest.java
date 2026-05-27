package com.rbm.agendamento.application.dto.janela;

import com.rbm.agendamento.domain.enums.TipoRestritor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JanelaRestitorRequest(
        @NotNull TipoRestritor tipo,
        @NotBlank String valor
) {}
