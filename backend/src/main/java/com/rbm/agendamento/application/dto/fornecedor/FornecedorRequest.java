package com.rbm.agendamento.application.dto.fornecedor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record FornecedorRequest(
        @NotBlank(message = "Razão social é obrigatória")
        String razaoSocial,

        String nomeFantasia,

        @NotBlank(message = "CNPJ é obrigatório")
        String cnpj,

        String inscricaoEstadual,
        String tipoFornecedor,

        @Email(message = "E-mail inválido")
        String email,

        String telefone,
        String responsavel,
        Integer limiteAgendamentosDia,
        Integer slaDocumental,
        Boolean bloqueioAutomatico,
        Boolean ativo
) {}
