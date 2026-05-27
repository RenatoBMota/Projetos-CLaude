package com.rbm.agendamento.application.dto.doca;

import com.rbm.agendamento.domain.entity.Doca;
import com.rbm.agendamento.domain.enums.TipoDoca;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record DocaResponse(
        UUID id,
        String codigo,
        String descricao,
        TipoDoca tipo,
        UUID filialId,
        String filialNome,
        Integer capacidadeSimultanea,
        BigDecimal pesoMaximo,
        BigDecimal alturaMaxima,
        BigDecimal comprimentoMaximo,
        String tiposCargaPermitida,
        Boolean ativo,
        LocalDateTime createdAt
) {
    public static DocaResponse from(Doca d) {
        return new DocaResponse(d.getId(), d.getCodigo(), d.getDescricao(), d.getTipo(),
                d.getFilial().getId(), d.getFilial().getNome(), d.getCapacidadeSimultanea(),
                d.getPesoMaximo(), d.getAlturaMaxima(), d.getComprimentoMaximo(),
                d.getTiposCargaPermitida(), d.getAtivo(), d.getCreatedAt());
    }
}
