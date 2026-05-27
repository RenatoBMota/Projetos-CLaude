package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Doca;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface DocaRepository extends JpaRepository<Doca, UUID> {
    boolean existsByCodigoAndFilialId(String codigo, UUID filialId);

    List<Doca> findByFilialIdAndAtivoTrue(UUID filialId);

    @Query("SELECT d FROM Doca d WHERE d.filial.id = :filialId AND (:busca IS NULL OR LOWER(d.descricao) LIKE LOWER(CONCAT('%', :busca, '%')))")
    Page<Doca> buscarPorFilial(UUID filialId, String busca, Pageable pageable);
}
