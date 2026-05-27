package com.rbm.agendamento.application.dto.motorista;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record MotoristaRequest(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotBlank(message = "CPF é obrigatório")
        String cpf,

        String rg,

        @NotBlank(message = "CNH é obrigatória")
        String cnh,

        @NotBlank(message = "Categoria CNH é obrigatória")
        String categoriaCnh,

        @NotNull(message = "Validade CNH é obrigatória")
        LocalDate validadeCnh,

        String telefone,
        LocalDate dataNascimento,
        String nacionalidade,
        Boolean ativo
) {}
