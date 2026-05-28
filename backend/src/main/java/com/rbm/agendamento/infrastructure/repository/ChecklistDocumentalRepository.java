package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.ChecklistDocumental;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChecklistDocumentalRepository extends JpaRepository<ChecklistDocumental, UUID> {

    Optional<ChecklistDocumental> findByAgendamentoId(UUID agendamentoId);
}
