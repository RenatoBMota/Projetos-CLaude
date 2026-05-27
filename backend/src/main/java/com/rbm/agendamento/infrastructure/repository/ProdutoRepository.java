package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface ProdutoRepository extends JpaRepository<Produto, UUID> {
    boolean existsByCodigo(String codigo);

    @Query("SELECT p FROM Produto p WHERE (:busca IS NULL OR LOWER(p.descricao) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(p.codigo) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Produto> buscar(String busca, Pageable pageable);
}
