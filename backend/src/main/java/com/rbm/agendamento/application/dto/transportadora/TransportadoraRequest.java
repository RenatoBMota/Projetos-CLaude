package com.rbm.agendamento.application.dto.transportadora;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TransportadoraRequest(
        @NotBlank(message = "Razão social é obrigatória")
        String razaoSocial,

        String nomeFantasia,

        @NotBlank(message = "CNPJ é obrigatório")
        String cnpj,

        String inscricaoEstadual,
        String nacionalidade,
        String tipoOperacao,

        @Email(message = "E-mail inválido")
        String email,

        String telefone,
        String responsavel,
        Integer slaPersonalizado,
        Integer prioridade,
        Boolean ativo
) {}
