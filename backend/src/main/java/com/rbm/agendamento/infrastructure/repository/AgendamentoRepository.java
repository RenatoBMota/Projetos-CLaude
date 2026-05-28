package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.Agendamento;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgendamentoRepository extends JpaRepository<Agendamento, UUID> {

    Optional<Agendamento> findByCodigo(String codigo);

    @Query("""
            SELECT a FROM Agendamento a
            WHERE (:filialId IS NULL OR a.filial.id = :filialId)
            AND (:status IS NULL OR a.status = :status)
            AND (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            AND (:busca IS NULL OR LOWER(a.codigo) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(a.protocolo) LIKE LOWER(CONCAT('%', :busca, '%')))
            ORDER BY a.dataOperacao DESC, a.horarioInicio ASC
            """)
    Page<Agendamento> buscar(@Param("filialId") UUID filialId,
                              @Param("status") StatusAgendamento status,
                              @Param("dataInicio") LocalDate dataInicio,
                              @Param("dataFim") LocalDate dataFim,
                              @Param("busca") String busca,
                              Pageable pageable);

    @Query("""
            SELECT COUNT(a) FROM Agendamento a
            WHERE a.janela.id = :janelaId
            AND a.dataOperacao = :data
            AND a.horarioInicio = :horario
            AND a.status NOT IN :statusExcluidos
            """)
    long countOcupacao(@Param("janelaId") UUID janelaId,
                       @Param("data") LocalDate data,
                       @Param("horario") LocalTime horario,
                       @Param("statusExcluidos") List<StatusAgendamento> statusExcluidos);

    @Query("""
            SELECT a FROM Agendamento a
            WHERE a.janela.id = :janelaId
            AND a.dataOperacao = :data
            AND a.status NOT IN :statusExcluidos
            ORDER BY a.horarioInicio ASC
            """)
    List<Agendamento> findByJanelaAndData(@Param("janelaId") UUID janelaId,
                                           @Param("data") LocalDate data,
                                           @Param("statusExcluidos") List<StatusAgendamento> statusExcluidos);

    boolean existsByCodigo(String codigo);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(a.codigo, 13) AS int)), 0) FROM Agendamento a WHERE a.codigo LIKE :prefixo%")
    Integer findMaxSequencial(@Param("prefixo") String prefixo);

    @Query("""
            SELECT a FROM Agendamento a
            WHERE a.transportadora.id = :transportadoraId
            AND (:status IS NULL OR a.status = :status)
            ORDER BY a.dataOperacao ASC, a.horarioInicio ASC
            """)
    Page<Agendamento> findByTransportadora(@Param("transportadoraId") UUID transportadoraId,
                                            @Param("status") StatusAgendamento status,
                                            Pageable pageable);
}
