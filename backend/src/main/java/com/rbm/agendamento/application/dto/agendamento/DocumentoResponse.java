package com.rbm.agendamento.application.dto.agendamento;

import com.rbm.agendamento.domain.entity.AgendamentoDocumento;
import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record DocumentoResponse(
        UUID id,
        String tipoDocumento,
        String numero,
        String serie,
        String chaveAcesso,
        String emitente,
        String destinatario,
        BigDecimal peso,
        Integer volumes,
        BigDecimal valorTotal,
        StatusValidacaoDocumento statusValidacao,
        String observacaoValidacao,
        String nomeArquivo,
        Long tamanhoArquivo,
        String contentType,
        boolean temArquivo,
        LocalDateTime createdAt
) {
    public static DocumentoResponse from(AgendamentoDocumento d) {
        return new DocumentoResponse(
                d.getId(),
                d.getTipoDocumento(),
                d.getNumero(),
                d.getSerie(),
                d.getChaveAcesso(),
                d.getEmitente(),
                d.getDestinatario(),
                d.getPeso(),
                d.getVolumes(),
                d.getValorTotal(),
                d.getStatusValidacao(),
                d.getObservacaoValidacao(),
                d.getNomeArquivo(),
                d.getTamanhoArquivo(),
                d.getContentType(),
                d.getXmlPath() != null,
                d.getCreatedAt()
        );
    }
}
