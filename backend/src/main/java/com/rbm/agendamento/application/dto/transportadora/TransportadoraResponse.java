package com.rbm.agendamento.application.dto.transportadora;

import com.rbm.agendamento.domain.entity.Transportadora;

import java.time.LocalDateTime;
import java.util.UUID;

public record TransportadoraResponse(
        UUID id,
        String razaoSocial,
        String nomeFantasia,
        String cnpj,
        String inscricaoEstadual,
        String nacionalidade,
        String tipoOperacao,
        String email,
        String telefone,
        String responsavel,
        Integer slaPersonalizado,
        Integer prioridade,
        Boolean bloqueada,
        Boolean blacklist,
        String motivoBloqueio,
        Boolean ativo,
        LocalDateTime createdAt
) {
    public static TransportadoraResponse from(Transportadora t) {
        return new TransportadoraResponse(t.getId(), t.getRazaoSocial(), t.getNomeFantasia(),
                t.getCnpj(), t.getInscricaoEstadual(), t.getNacionalidade(), t.getTipoOperacao(),
                t.getEmail(), t.getTelefone(), t.getResponsavel(), t.getSlaPersonalizado(),
                t.getPrioridade(), t.getBloqueada(), t.getBlacklist(), t.getMotivoBloqueio(),
                t.getAtivo(), t.getCreatedAt());
    }
}
