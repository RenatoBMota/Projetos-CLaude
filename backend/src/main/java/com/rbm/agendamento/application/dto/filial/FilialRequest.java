package com.rbm.agendamento.application.dto.filial;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalTime;

public record FilialRequest(
        @NotBlank(message = "Código é obrigatório") @Size(max = 20)
        String codigo,

        @NotBlank(message = "Nome é obrigatório") @Size(max = 200)
        String nome,

        @NotBlank(message = "Razão social é obrigatória") @Size(max = 300)
        String razaoSocial,

        @NotBlank(message = "CNPJ é obrigatório") @Size(max = 18)
        String cnpj,

        String inscricaoEstadual,
        String endereco,
        String numero,
        String complemento,
        String bairro,

        @NotBlank(message = "Cidade é obrigatória")
        String cidade,

        @NotBlank(message = "UF é obrigatória") @Size(min = 2, max = 2)
        String uf,

        String cep,
        BigDecimal latitude,
        BigDecimal longitude,
        String telefone,

        @Email(message = "E-mail inválido")
        String email,

        LocalTime horarioInicio,
        LocalTime horarioFim,
        Integer limiteDiario,
        Integer tempoMedioAtendimento,
        Boolean ativo
) {}
