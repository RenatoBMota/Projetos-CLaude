package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.TransportadoraContato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransportadoraContatoRepository extends JpaRepository<TransportadoraContato, UUID> {
    List<TransportadoraContato> findByTransportadoraIdAndAtivoTrue(UUID transportadoraId);
}
