package com.rbm.agendamento.application.dto.doca;

import com.rbm.agendamento.domain.enums.TipoDoca;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record DocaRequest(
        @NotBlank(message = "Código é obrigatório")
        String codigo,

        @NotBlank(message = "Descrição é obrigatória")
        String descricao,

        @NotNull(message = "Tipo é obrigatório")
        TipoDoca tipo,

        @NotNull(message = "Filial é obrigatória")
        UUID filialId,

        Integer capacidadeSimultanea,
        BigDecimal pesoMaximo,
        BigDecimal alturaMaxima,
        BigDecimal comprimentoMaximo,
        String tiposCargaPermitida,
        Boolean ativo
) {}
