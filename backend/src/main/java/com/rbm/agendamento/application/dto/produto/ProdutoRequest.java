package com.rbm.agendamento.application.dto.produto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record ProdutoRequest(
        @NotBlank(message = "Código é obrigatório")
        String codigo,

        @NotBlank(message = "Descrição é obrigatória")
        String descricao,

        String categoria,
        BigDecimal pesoMedio,
        BigDecimal cubagem,
        String tipoArmazenagem,
        Boolean necessitaRefrigeracao,
        Boolean produtoPerigoso,
        String classeRisco,
        Boolean ativo
) {}
