package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.JanelaRestritor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JanelaRestritorRepository extends JpaRepository<JanelaRestritor, UUID> {

    List<JanelaRestritor> findByJanelaId(UUID janelaId);

    void deleteByJanelaId(UUID janelaId);
}
