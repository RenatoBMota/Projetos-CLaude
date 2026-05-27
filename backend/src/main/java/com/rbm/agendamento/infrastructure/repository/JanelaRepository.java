package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Janela;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface JanelaRepository extends JpaRepository<Janela, UUID> {

    @Query("""
            SELECT j FROM Janela j
            WHERE j.filial.id = :filialId
            AND (:busca IS NULL OR LOWER(j.nome) LIKE LOWER(CONCAT('%', :busca, '%')))
            ORDER BY j.prioridade ASC, j.nome ASC
            """)
    Page<Janela> buscarPorFilial(@Param("filialId") UUID filialId,
                                  @Param("busca") String busca,
                                  Pageable pageable);

    List<Janela> findByFilialIdAndAtivoTrue(UUID filialId);

    boolean existsByNomeAndFilialId(String nome, UUID filialId);
}
