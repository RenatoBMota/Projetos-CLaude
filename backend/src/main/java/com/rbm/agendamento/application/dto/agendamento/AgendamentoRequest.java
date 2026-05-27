package com.rbm.agendamento.application.dto.agendamento;

import com.rbm.agendamento.domain.enums.TipoAgendamento;
import com.rbm.agendamento.domain.enums.TipoOperacao;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record AgendamentoRequest(
        TipoAgendamento tipo,
        @NotNull TipoOperacao tipoOperacao,
        @NotNull UUID filialId,
        UUID docaId,
        @NotNull UUID janelaId,
        UUID transportadoraId,
        UUID fornecedorId,
        UUID motoristaId,
        UUID veiculoId,
        @NotNull LocalDate dataOperacao,
        @NotNull LocalTime horarioInicio,
        BigDecimal pesoBruto,
        BigDecimal pesoLiquido,
        BigDecimal cubagem,
        Integer volumes,
        String observacoes,
        List<DocumentoRequest> documentos
) {}
