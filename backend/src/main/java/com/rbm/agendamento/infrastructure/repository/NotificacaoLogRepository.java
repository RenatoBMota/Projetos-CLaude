package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.NotificacaoLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificacaoLogRepository extends JpaRepository<NotificacaoLog, UUID> {

    Page<NotificacaoLog> findByOrderByCriadoEmDesc(Pageable pageable);

    Page<NotificacaoLog> findByAgendamentoIdOrderByCriadoEmDesc(UUID agendamentoId, Pageable pageable);

    Page<NotificacaoLog> findByCanalOrderByCriadoEmDesc(String canal, Pageable pageable);
}
