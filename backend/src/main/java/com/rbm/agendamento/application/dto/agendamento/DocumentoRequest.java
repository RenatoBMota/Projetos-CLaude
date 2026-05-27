package com.rbm.agendamento.application.dto.agendamento;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record DocumentoRequest(
        @NotBlank String tipoDocumento,
        String numero,
        String serie,
        String chaveAcesso,
        String emitente,
        String destinatario,
        BigDecimal peso,
        Integer volumes
) {}
