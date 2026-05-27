package com.rbm.agendamento.application.dto.veiculo;

import com.rbm.agendamento.domain.entity.Veiculo;
import com.rbm.agendamento.domain.enums.TipoCarroceria;
import com.rbm.agendamento.domain.enums.TipoVeiculo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record VeiculoResponse(
        UUID id, String placa, TipoVeiculo tipoVeiculo, TipoCarroceria tipoCarroceria,
        BigDecimal tara, BigDecimal capacidadeMaxima, String rntrc,
        String proprietario, Integer ano, String modelo, Boolean ativo, LocalDateTime createdAt
) {
    public static VeiculoResponse from(Veiculo v) {
        return new VeiculoResponse(v.getId(), v.getPlaca(), v.getTipoVeiculo(), v.getTipoCarroceria(),
                v.getTara(), v.getCapacidadeMaxima(), v.getRntrc(), v.getProprietario(),
                v.getAno(), v.getModelo(), v.getAtivo(), v.getCreatedAt());
    }
}
