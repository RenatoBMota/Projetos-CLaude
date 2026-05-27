package com.rbm.agendamento.application.dto.fornecedor;

import com.rbm.agendamento.domain.entity.Fornecedor;

import java.time.LocalDateTime;
import java.util.UUID;

public record FornecedorResponse(
        UUID id, String razaoSocial, String nomeFantasia, String cnpj,
        String inscricaoEstadual, String tipoFornecedor, String email, String telefone,
        String responsavel, Integer limiteAgendamentosDia, Integer slaDocumental,
        Boolean bloqueioAutomatico, Boolean ativo, LocalDateTime createdAt
) {
    public static FornecedorResponse from(Fornecedor f) {
        return new FornecedorResponse(f.getId(), f.getRazaoSocial(), f.getNomeFantasia(), f.getCnpj(),
                f.getInscricaoEstadual(), f.getTipoFornecedor(), f.getEmail(), f.getTelefone(),
                f.getResponsavel(), f.getLimiteAgendamentosDia(), f.getSlaDocumental(),
                f.getBloqueioAutomatico(), f.getAtivo(), f.getCreatedAt());
    }
}
