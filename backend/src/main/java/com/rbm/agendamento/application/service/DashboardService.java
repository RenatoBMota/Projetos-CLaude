package com.rbm.agendamento.application.service;

import com.rbm.agendamento.application.dto.dashboard.DashboardKpiResponse;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import com.rbm.agendamento.infrastructure.repository.AgendamentoDocumentoRepository;
import com.rbm.agendamento.infrastructure.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final List<StatusAgendamento> STATUS_EXCLUIDOS_CONTAGEM =
            List.of(StatusAgendamento.CANCELADO, StatusAgendamento.NO_SHOW);

    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoDocumentoRepository documentoRepository;

    @Transactional(readOnly = true)
    public DashboardKpiResponse calcular(LocalDate dataInicio, LocalDate dataFim, UUID filialId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1L);
        LocalDate inicioMes = hoje.withDayOfMonth(1);

        long totalHoje = agendamentoRepository.countByDataAndStatusNotIn(hoje, STATUS_EXCLUIDOS_CONTAGEM);
        long totalSemana = agendamentoRepository.countByPeriodAndStatusNotIn(inicioSemana, hoje, STATUS_EXCLUIDOS_CONTAGEM);
        long totalMes = agendamentoRepository.countByPeriodAndStatusNotIn(inicioMes, hoje, STATUS_EXCLUIDOS_CONTAGEM);

        LocalDate inicio = dataInicio != null ? dataInicio : inicioMes;
        LocalDate fim = dataFim != null ? dataFim : hoje;

        Map<String, Long> porStatus = toMap(
                agendamentoRepository.countByStatus(inicio, fim, filialId));

        Map<String, Long> porSla = toMap(
                agendamentoRepository.countBySlaStatus(inicio, fim, filialId));

        double taxaNoShow = nvl(agendamentoRepository.getNoShowRate(inicio, fim, filialId));
        double taxaSla = nvl(agendamentoRepository.getSlaComplianceRate(inicio, fim, filialId));

        long totalPeriodo = porStatus.values().stream().mapToLong(Long::longValue).sum();
        long finalizados = porStatus.getOrDefault("FINALIZADO", 0L);
        double taxaFinalizados = totalPeriodo > 0 ? (finalizados * 100.0 / totalPeriodo) : 0;

        List<DashboardKpiResponse.ItemRanking> topTransportadoras =
                agendamentoRepository.countByTransportadora(inicio, fim, PageRequest.of(0, 5))
                        .stream()
                        .map(r -> new DashboardKpiResponse.ItemRanking((String) r[0], (Long) r[1]))
                        .toList();

        List<DashboardKpiResponse.ItemRanking> porFilial =
                agendamentoRepository.countByFilial(inicio, fim)
                        .stream()
                        .map(r -> new DashboardKpiResponse.ItemRanking((String) r[0], (Long) r[1]))
                        .toList();

        Map<String, Long> docStatus = toMap(documentoRepository.countByStatusValidacao(inicio, fim));

        return new DashboardKpiResponse(
                totalHoje, totalSemana, totalMes,
                porStatus, porSla,
                round(taxaNoShow), round(taxaSla), round(taxaFinalizados),
                topTransportadoras, porFilial,
                docStatus.getOrDefault("PENDENTE", 0L),
                docStatus.getOrDefault("APROVADO", 0L),
                docStatus.getOrDefault("REJEITADO", 0L)
        );
    }

    private Map<String, Long> toMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            map.put(row[0].toString(), (Long) row[1]);
        }
        return map;
    }

    private double nvl(Double v) {
        return v != null ? v : 0.0;
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
