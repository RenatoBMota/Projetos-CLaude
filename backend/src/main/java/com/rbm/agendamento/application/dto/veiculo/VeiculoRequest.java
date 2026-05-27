package com.rbm.agendamento.application.dto.veiculo;

import com.rbm.agendamento.domain.enums.TipoCarroceria;
import com.rbm.agendamento.domain.enums.TipoVeiculo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record VeiculoRequest(
        @NotBlank(message = "Placa é obrigatória")
        String placa,

        @NotNull(message = "Tipo de veículo é obrigatório")
        TipoVeiculo tipoVeiculo,

        @NotNull(message = "Tipo de carroceria é obrigatório")
        TipoCarroceria tipoCarroceria,

        BigDecimal tara,
        BigDecimal capacidadeMaxima,
        String rntrc,
        String proprietario,
        Integer ano,
        String modelo,
        Boolean ativo
) {}
