package com.rbm.agendamento.application.dto.agendamento;

import com.rbm.agendamento.domain.entity.Agendamento;
import com.rbm.agendamento.domain.enums.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record AgendamentoResponse(
        UUID id,
        String codigo,
        TipoAgendamento tipo,
        TipoOperacao tipoOperacao,
        StatusAgendamento status,
        UUID filialId,
        String filialNome,
        UUID docaId,
        String docaCodigo,
        UUID janelaId,
        String janelaNome,
        UUID transportadoraId,
        String transportadoraNome,
        UUID fornecedorId,
        String fornecedorNome,
        UUID motoristaId,
        String motoristaNome,
        UUID veiculoId,
        String veiculoPlaca,
        LocalDate dataOperacao,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        BigDecimal pesoBruto,
        BigDecimal pesoLiquido,
        BigDecimal cubagem,
        Integer volumes,
        String observacoes,
        String protocolo,
        String qrCode,
        StatusSLA slaStatus,
        Boolean noShow,
        LocalDateTime expiraEm,
        List<DocumentoResponse> documentos,
        List<HistoricoResponse> historico,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
    public static AgendamentoResponse from(Agendamento a) {
        return new AgendamentoResponse(
                a.getId(),
                a.getCodigo(),
                a.getTipo(),
                a.getTipoOperacao(),
                a.getStatus(),
                a.getFilial().getId(),
                a.getFilial().getNome(),
                a.getDoca() != null ? a.getDoca().getId() : null,
                a.getDoca() != null ? a.getDoca().getCodigo() : null,
                a.getJanela().getId(),
                a.getJanela().getNome(),
                a.getTransportadora() != null ? a.getTransportadora().getId() : null,
                a.getTransportadora() != null ? a.getTransportadora().getRazaoSocial() : null,
                a.getFornecedor() != null ? a.getFornecedor().getId() : null,
                a.getFornecedor() != null ? a.getFornecedor().getRazaoSocial() : null,
                a.getMotorista() != null ? a.getMotorista().getId() : null,
                a.getMotorista() != null ? a.getMotorista().getNome() : null,
                a.getVeiculo() != null ? a.getVeiculo().getId() : null,
                a.getVeiculo() != null ? a.getVeiculo().getPlaca() : null,
                a.getDataOperacao(),
                a.getHorarioInicio(),
                a.getHorarioFim(),
                a.getPesoBruto(),
                a.getPesoLiquido(),
                a.getCubagem(),
                a.getVolumes(),
                a.getObservacoes(),
                a.getProtocolo(),
                a.getQrCode(),
                a.getSlaStatus(),
                a.getNoShow(),
                a.getExpiraEm(),
                a.getDocumentos().stream().map(DocumentoResponse::from).toList(),
                a.getHistorico().stream().map(HistoricoResponse::from).toList(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
