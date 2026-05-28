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

    @Query("""
            SELECT a.status, COUNT(a) FROM Agendamento a
            WHERE (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            AND (:filialId IS NULL OR a.filial.id = :filialId)
            GROUP BY a.status
            """)
    List<Object[]> countByStatus(@Param("dataInicio") LocalDate dataInicio,
                                  @Param("dataFim") LocalDate dataFim,
                                  @Param("filialId") UUID filialId);

    @Query("""
            SELECT a.slaStatus, COUNT(a) FROM Agendamento a
            WHERE (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            AND (:filialId IS NULL OR a.filial.id = :filialId)
            GROUP BY a.slaStatus
            """)
    List<Object[]> countBySlaStatus(@Param("dataInicio") LocalDate dataInicio,
                                     @Param("dataFim") LocalDate dataFim,
                                     @Param("filialId") UUID filialId);

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN a.noShow = TRUE THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a), 0), 0)
            FROM Agendamento a
            WHERE (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            AND (:filialId IS NULL OR a.filial.id = :filialId)
            """)
    Double getNoShowRate(@Param("dataInicio") LocalDate dataInicio,
                          @Param("dataFim") LocalDate dataFim,
                          @Param("filialId") UUID filialId);

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN a.slaStatus = 'NO_PRAZO' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a), 0), 0)
            FROM Agendamento a
            WHERE a.status NOT IN ('CRIADO','CANCELADO')
            AND (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            AND (:filialId IS NULL OR a.filial.id = :filialId)
            """)
    Double getSlaComplianceRate(@Param("dataInicio") LocalDate dataInicio,
                                 @Param("dataFim") LocalDate dataFim,
                                 @Param("filialId") UUID filialId);

    @Query("""
            SELECT a.transportadora.razaoSocial, COUNT(a)
            FROM Agendamento a
            WHERE a.transportadora IS NOT NULL
            AND (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            GROUP BY a.transportadora.id, a.transportadora.razaoSocial
            ORDER BY COUNT(a) DESC
            """)
    List<Object[]> countByTransportadora(@Param("dataInicio") LocalDate dataInicio,
                                          @Param("dataFim") LocalDate dataFim,
                                          Pageable pageable);

    @Query("""
            SELECT a.filial.nome, COUNT(a)
            FROM Agendamento a
            WHERE (:dataInicio IS NULL OR a.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR a.dataOperacao <= :dataFim)
            GROUP BY a.filial.id, a.filial.nome
            ORDER BY COUNT(a) DESC
            """)
    List<Object[]> countByFilial(@Param("dataInicio") LocalDate dataInicio,
                                  @Param("dataFim") LocalDate dataFim);

    @Query("SELECT COUNT(a) FROM Agendamento a WHERE a.dataOperacao = :data AND a.status NOT IN :excluidos")
    long countByDataAndStatusNotIn(@Param("data") LocalDate data,
                                    @Param("excluidos") List<StatusAgendamento> excluidos);

    @Query("""
            SELECT COUNT(a) FROM Agendamento a
            WHERE a.dataOperacao >= :dataInicio AND a.dataOperacao <= :dataFim
            AND a.status NOT IN :excluidos
            """)
    long countByPeriodAndStatusNotIn(@Param("dataInicio") LocalDate dataInicio,
                                      @Param("dataFim") LocalDate dataFim,
                                      @Param("excluidos") List<StatusAgendamento> excluidos);
}
