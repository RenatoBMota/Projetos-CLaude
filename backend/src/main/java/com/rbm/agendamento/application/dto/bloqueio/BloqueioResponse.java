package com.rbm.agendamento.application.dto.bloqueio;

import com.rbm.agendamento.domain.entity.Bloqueio;
import com.rbm.agendamento.domain.enums.TipoBloqueio;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public record BloqueioResponse(
        UUID id,
        TipoBloqueio tipo,
        UUID filialId,
        String filialNome,
        UUID docaId,
        String docaCodigo,
        UUID janelaId,
        String janelaNome,
        LocalDate dataInicio,
        LocalDate dataFim,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        String motivo,
        String observacao,
        Boolean ativo,
        LocalDateTime criadoEm
) {
    public static BloqueioResponse from(Bloqueio b) {
        return new BloqueioResponse(
                b.getId(),
                b.getTipo(),
                b.getFilial().getId(),
                b.getFilial().getNome(),
                b.getDoca() != null ? b.getDoca().getId() : null,
                b.getDoca() != null ? b.getDoca().getCodigo() : null,
                b.getJanela() != null ? b.getJanela().getId() : null,
                b.getJanela() != null ? b.getJanela().getNome() : null,
                b.getDataInicio(),
                b.getDataFim(),
                b.getHorarioInicio(),
                b.getHorarioFim(),
                b.getMotivo(),
                b.getObservacao(),
                b.getAtivo(),
                b.getCreatedAt()
        );
    }
}
