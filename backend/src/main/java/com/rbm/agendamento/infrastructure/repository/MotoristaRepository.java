package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Motorista;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface MotoristaRepository extends JpaRepository<Motorista, UUID> {
    boolean existsByCpf(String cpf);
    boolean existsByCnh(String cnh);

    @Query("SELECT m FROM Motorista m WHERE (:busca IS NULL OR LOWER(m.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(m.cpf) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(m.cnh) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Motorista> buscar(String busca, Pageable pageable);
}
