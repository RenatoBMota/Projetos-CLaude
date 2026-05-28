package com.rbm.agendamento.application.dto.dashboard;

import java.util.List;
import java.util.Map;

public record DashboardKpiResponse(
        long totalHoje,
        long totalSemana,
        long totalMes,

        Map<String, Long> porStatus,
        Map<String, Long> porSla,

        double taxaNoShow,
        double taxaSlaConformidade,
        double taxaFinalizados,

        List<ItemRanking> topTransportadoras,
        List<ItemRanking> porFilial,

        long documentosPendentes,
        long documentosAprovados,
        long documentosRejeitados
) {
    public record ItemRanking(String nome, long total) {}
}
