package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Veiculo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface VeiculoRepository extends JpaRepository<Veiculo, UUID> {
    boolean existsByPlaca(String placa);

    @Query("SELECT v FROM Veiculo v WHERE (:busca IS NULL OR LOWER(v.placa) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(v.modelo) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Veiculo> buscar(String busca, Pageable pageable);
}
