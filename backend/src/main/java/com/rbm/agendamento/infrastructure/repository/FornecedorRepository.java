package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Fornecedor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface FornecedorRepository extends JpaRepository<Fornecedor, UUID> {
    boolean existsByCnpj(String cnpj);

    @Query("SELECT f FROM Fornecedor f WHERE (:busca IS NULL OR LOWER(f.razaoSocial) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(f.cnpj) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Fornecedor> buscar(String busca, Pageable pageable);
}
