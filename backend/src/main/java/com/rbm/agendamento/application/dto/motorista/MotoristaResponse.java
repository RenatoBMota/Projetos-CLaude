package com.rbm.agendamento.application.dto.motorista;

import com.rbm.agendamento.domain.entity.Motorista;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MotoristaResponse(
        UUID id, String nome, String cpf, String rg, String cnh, String categoriaCnh,
        LocalDate validadeCnh, String telefone, LocalDate dataNascimento,
        String nacionalidade, Boolean blacklist, Boolean cnhVencida, Boolean ativo,
        LocalDateTime createdAt
) {
    public static MotoristaResponse from(Motorista m) {
        return new MotoristaResponse(m.getId(), m.getNome(), m.getCpf(), m.getRg(), m.getCnh(),
                m.getCategoriaCnh(), m.getValidadeCnh(), m.getTelefone(), m.getDataNascimento(),
                m.getNacionalidade(), m.getBlacklist(), m.isCnhVencida(), m.getAtivo(), m.getCreatedAt());
    }
}
