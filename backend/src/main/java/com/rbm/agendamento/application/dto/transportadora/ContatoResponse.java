package com.rbm.agendamento.application.dto.transportadora;

import com.rbm.agendamento.domain.entity.TransportadoraContato;

import java.util.UUID;

public record ContatoResponse(UUID id, String nome, String email, String telefone, String cargo, Boolean ativo) {
    public static ContatoResponse from(TransportadoraContato c) {
        return new ContatoResponse(c.getId(), c.getNome(), c.getEmail(), c.getTelefone(), c.getCargo(), c.getAtivo());
    }
}
