package com.rbm.agendamento.application.dto.auth;

import com.rbm.agendamento.domain.enums.Role;

import java.util.UUID;

public record LoginResponse(
        String token,
        String refreshToken,
        UsuarioInfo usuario
) {
    public record UsuarioInfo(UUID id, String nome, String email, Role role) {}
}
