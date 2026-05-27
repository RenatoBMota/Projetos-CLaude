package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.RefreshToken;
import com.rbm.agendamento.domain.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revogado = true WHERE r.usuario = :usuario")
    void revogarTodosPorUsuario(Usuario usuario);
}
