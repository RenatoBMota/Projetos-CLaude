package com.rbm.agendamento.application.dto.janela;

import com.rbm.agendamento.domain.enums.TipoProcesso;
import jakarta.validation.constraints.*;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record JanelaRequest(
        @NotBlank @Size(max = 200) String nome,
        @NotNull TipoProcesso tipoProcesso,
        String descricao,
        Integer prioridade,
        @NotNull UUID filialId,
        UUID docaId,
        @Size(max = 200) String areaOperacional,
        @Min(1) Integer capacidadeSimultanea,
        @NotNull @Min(1) Integer duracaoAtendimento,
        @NotNull LocalTime horarioInicio,
        @NotNull LocalTime horarioFim,
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
        @Size(max = 100) String quemAprova,
        Integer slaAprovacao,
        Boolean aprovacaoAutomatica,
        Boolean ativo,
        List<JanelaRestitorRequest> restritores
) {}
