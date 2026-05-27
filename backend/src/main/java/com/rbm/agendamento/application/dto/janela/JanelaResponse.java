package com.rbm.agendamento.application.dto.janela;

import com.rbm.agendamento.domain.entity.Janela;
import com.rbm.agendamento.domain.enums.TipoProcesso;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record JanelaResponse(
        UUID id,
        String nome,
        TipoProcesso tipoProcesso,
        String descricao,
        Integer prioridade,
        UUID filialId,
        String filialNome,
        UUID docaId,
        String docaCodigo,
        String areaOperacional,
        Integer capacidadeSimultanea,
        Integer duracaoAtendimento,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        Integer slaAtraso,
        Integer tempoReagendamento,
        Integer tempoCancelamento,
        Integer tempoEdicaoTerceiros,
        Integer bufferEntreOperacoes,
        Boolean obrigatorioEpi,
        Boolean obrigatorioNfe,
        Boolean obrigatorioXml,
        Boolean obrigatorioLacre,
        Boolean obrigatorioFotoCarga,
        Boolean aceiteObrigatorio,
        String quemAprova,
        Integer slaAprovacao,
        Boolean aprovacaoAutomatica,
        Boolean ativo,
        List<JanelaRestitorResponse> restritores,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
    public static JanelaResponse from(Janela j) {
        return new JanelaResponse(
                j.getId(),
                j.getNome(),
                j.getTipoProcesso(),
                j.getDescricao(),
                j.getPrioridade(),
                j.getFilial().getId(),
                j.getFilial().getNome(),
                j.getDoca() != null ? j.getDoca().getId() : null,
                j.getDoca() != null ? j.getDoca().getCodigo() : null,
                j.getAreaOperacional(),
                j.getCapacidadeSimultanea(),
                j.getDuracaoAtendimento(),
                j.getHorarioInicio(),
                j.getHorarioFim(),
                j.getSlaAtraso(),
                j.getTempoReagendamento(),
                j.getTempoCancelamento(),
                j.getTempoEdicaoTerceiros(),
                j.getBufferEntreOperacoes(),
                j.getObrigatorioEpi(),
                j.getObrigatorioNfe(),
                j.getObrigatorioXml(),
                j.getObrigatorioLacre(),
                j.getObrigatorioFotoCarga(),
                j.getAceiteObrigatorio(),
                j.getQuemAprova(),
                j.getSlaAprovacao(),
                j.getAprovacaoAutomatica(),
                j.getAtivo(),
                j.getRestritores().stream().map(JanelaRestitorResponse::from).toList(),
                j.getCreatedAt(),
                j.getUpdatedAt()
        );
    }
}
