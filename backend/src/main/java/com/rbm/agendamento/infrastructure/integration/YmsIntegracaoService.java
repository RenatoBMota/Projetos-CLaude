package com.rbm.agendamento.infrastructure.integration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class YmsIntegracaoService {

    private final YmsClient ymsClient;

    /** Maps TipoOperacao enum value to YMS operation_type string. */
    private static String mapOperacao(String tipoOperacao) {
        if (tipoOperacao == null) return "supplier";
        return switch (tipoOperacao) {
            case "RECEBIMENTO"  -> "supplier";
            case "EXPEDICAO"    -> "loading";
            case "TRANSFERENCIA"-> "transfer";
            case "DEVOLUCAO"    -> "return";
            default             -> "supplier";
        };
    }

    /** Resolves YMS unit_id by matching filial name (case-insensitive partial match). */
    private int resolveUnitId(String filialNome) {
        List<Map<String, Object>> units = ymsClient.listarUnidades();
        for (Map<String, Object> unit : units) {
            String name = String.valueOf(unit.getOrDefault("name", "")).toLowerCase();
            if (name.contains(filialNome.toLowerCase()) ||
                filialNome.toLowerCase().contains(name)) {
                Object id = unit.get("id");
                if (id instanceof Number num) return num.intValue();
            }
        }
        // Fallback: first unit
        if (!units.isEmpty()) {
            Object id = units.get(0).get("id");
            if (id instanceof Number num) return num.intValue();
        }
        return 1;
    }

    public Optional<Integer> sincronizarConfirmado(Map<String, Object> evento) {
        String agendamentoId = (String) evento.get("id");
        String codigo        = (String) evento.get("codigo");
        String filialNome    = (String) evento.getOrDefault("filialNome", "");
        String dataOperacao  = (String) evento.get("dataOperacao");
        String horarioInicio = (String) evento.getOrDefault("horarioInicio", "08:00:00");
        String tipoOperacao  = (String) evento.get("tipoOperacao");
        String fornecedor    = (String) evento.getOrDefault("fornecedorNome",
                                evento.getOrDefault("transportadoraNome", "Não informado"));
        String nf            = (String) evento.get("nf");

        String horario = horarioInicio.length() >= 5 ? horarioInicio.substring(0, 5) : horarioInicio;

        int unitId = resolveUnitId(filialNome);

        YmsClient.YmsScheduleRequest req = new YmsClient.YmsScheduleRequest(
                dataOperacao,
                horario,
                fornecedor != null ? fornecedor : "Não informado",
                nf,
                mapOperacao(tipoOperacao),
                unitId,
                "Agendamento RBM #" + codigo + " | ID: " + agendamentoId
        );

        Optional<Integer> scheduleId = ymsClient.criarAgendamento(req);
        scheduleId.ifPresentOrElse(
                id -> log.info("YMS: agendamento {} sincronizado → schedule_id={}", codigo, id),
                ()  -> log.warn("YMS: falha ao sincronizar agendamento {}", codigo)
        );
        return scheduleId;
    }

    public void sincronizarCancelado(Map<String, Object> evento) {
        // Se tiver o ymsScheduleId salvo no evento, cancela diretamente
        Object ymsId = evento.get("ymsScheduleId");
        if (ymsId instanceof Number num) {
            boolean ok = ymsClient.cancelarAgendamento(num.intValue());
            log.info("YMS: cancelamento schedule_id={} resultado={}", num.intValue(), ok);
        } else {
            log.debug("YMS: evento CANCELADO sem ymsScheduleId — nenhuma ação no YMS");
        }
    }
}
