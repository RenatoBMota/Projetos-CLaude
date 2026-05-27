package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.AgendamentoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgendamentoHistoricoRepository extends JpaRepository<AgendamentoHistorico, UUID> {

    List<AgendamentoHistorico> findByAgendamentoIdOrderByCreatedAtAsc(UUID agendamentoId);
}
