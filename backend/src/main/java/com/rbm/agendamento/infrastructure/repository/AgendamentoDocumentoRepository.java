package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.AgendamentoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgendamentoDocumentoRepository extends JpaRepository<AgendamentoDocumento, UUID> {

    List<AgendamentoDocumento> findByAgendamentoId(UUID agendamentoId);
}
