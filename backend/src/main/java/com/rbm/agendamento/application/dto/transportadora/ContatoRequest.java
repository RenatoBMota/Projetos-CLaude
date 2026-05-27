package com.rbm.agendamento.application.dto.transportadora;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ContatoRequest(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @Email(message = "E-mail inválido")
        String email,

        String telefone,
        String cargo
) {}
