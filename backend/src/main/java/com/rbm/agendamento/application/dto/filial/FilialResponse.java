package com.rbm.agendamento.application.dto.filial;

import com.rbm.agendamento.domain.entity.Filial;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public record FilialResponse(
        UUID id,
        String codigo,
        String nome,
        String razaoSocial,
        String cnpj,
        String inscricaoEstadual,
        String endereco,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf,
        String cep,
        BigDecimal latitude,
        BigDecimal longitude,
        String telefone,
        String email,
        LocalTime horarioInicio,
        LocalTime horarioFim,
        Integer limiteDiario,
        Integer tempoMedioAtendimento,
        Boolean ativo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FilialResponse from(Filial f) {
        return new FilialResponse(f.getId(), f.getCodigo(), f.getNome(), f.getRazaoSocial(),
                f.getCnpj(), f.getInscricaoEstadual(), f.getEndereco(), f.getNumero(),
                f.getComplemento(), f.getBairro(), f.getCidade(), f.getUf(), f.getCep(),
                f.getLatitude(), f.getLongitude(), f.getTelefone(), f.getEmail(),
                f.getHorarioInicio(), f.getHorarioFim(), f.getLimiteDiario(),
                f.getTempoMedioAtendimento(), f.getAtivo(), f.getCreatedAt(), f.getUpdatedAt());
    }
}
