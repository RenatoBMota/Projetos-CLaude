package com.rbm.agendamento.application.dto.bloqueio;

import com.rbm.agendamento.domain.enums.TipoBloqueio;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record BloqueioRequest(
        @NotNull TipoBloqueio tipo,
        @NotNull UUID filialId,
        UUID docaId,
        UUID janelaId,
        @NotNull LocalDate dataInicio,
        @NotNull LocalDate dataFim,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        @NotBlank String motivo,
        String observacao,
        Boolean ativo
) {}
