package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Filial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FilialRepository extends JpaRepository<Filial, UUID> {
    boolean existsByCnpj(String cnpj);
    boolean existsByCodigo(String codigo);

    @Query("SELECT f FROM Filial f WHERE (:busca IS NULL OR LOWER(f.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(f.cnpj) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Filial> buscar(String busca, Pageable pageable);

    List<Filial> findAllByAtivoTrue();
}
