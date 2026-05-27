package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Transportadora;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface TransportadoraRepository extends JpaRepository<Transportadora, UUID> {
    boolean existsByCnpj(String cnpj);

    @Query("SELECT t FROM Transportadora t WHERE (:busca IS NULL OR LOWER(t.razaoSocial) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(t.cnpj) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Transportadora> buscar(String busca, Pageable pageable);
}
