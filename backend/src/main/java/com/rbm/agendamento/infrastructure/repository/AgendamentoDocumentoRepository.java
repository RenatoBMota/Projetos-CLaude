package com.rbm.agendamento.infrastructure.repository;

import com.rbm.agendamento.domain.entity.AgendamentoDocumento;
import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AgendamentoDocumentoRepository extends JpaRepository<AgendamentoDocumento, UUID> {

    List<AgendamentoDocumento> findByAgendamentoId(UUID agendamentoId);

    @Query("""
            SELECT d.statusValidacao, COUNT(d) FROM AgendamentoDocumento d
            WHERE (:dataInicio IS NULL OR d.agendamento.dataOperacao >= :dataInicio)
            AND (:dataFim IS NULL OR d.agendamento.dataOperacao <= :dataFim)
            GROUP BY d.statusValidacao
            """)
    List<Object[]> countByStatusValidacao(@Param("dataInicio") LocalDate dataInicio,
                                           @Param("dataFim") LocalDate dataFim);
}
