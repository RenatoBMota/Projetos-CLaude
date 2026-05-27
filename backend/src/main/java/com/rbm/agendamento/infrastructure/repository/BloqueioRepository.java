package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Bloqueio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BloqueioRepository extends JpaRepository<Bloqueio, UUID> {

    @Query("""
            SELECT b FROM Bloqueio b
            WHERE b.filial.id = :filialId
            AND (:busca IS NULL OR LOWER(b.motivo) LIKE LOWER(CONCAT('%', :busca, '%')))
            ORDER BY b.dataInicio DESC
            """)
    Page<Bloqueio> buscarPorFilial(@Param("filialId") UUID filialId,
                                    @Param("busca") String busca,
                                    Pageable pageable);

    @Query("""
            SELECT b FROM Bloqueio b
            WHERE b.ativo = true
            AND b.filial.id = :filialId
            AND b.dataInicio <= :data
            AND b.dataFim >= :data
            AND (:janelaId IS NULL OR b.janela IS NULL OR b.janela.id = :janelaId)
            AND (:docaId IS NULL OR b.doca IS NULL OR b.doca.id = :docaId)
            """)
    List<Bloqueio> findAtivosParaData(@Param("filialId") UUID filialId,
                                       @Param("data") LocalDate data,
                                       @Param("janelaId") UUID janelaId,
                                       @Param("docaId") UUID docaId);
}
