package com.rbm.agendamento.infrastructure.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rbm.agendamento.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class YmsClient {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public Optional<Integer> criarAgendamento(YmsScheduleRequest req) {
        AppProperties.Integracao.Yms yms = appProperties.integracao().yms();
        if (!yms.enabled()) return Optional.empty();

        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "scheduled_date",  req.scheduledDate(),
                    "scheduled_time",  req.scheduledTime(),
                    "supplier",        req.supplier(),
                    "nf",              req.nf() != null ? req.nf() : "",
                    "operation_type",  req.operationType(),
                    "unit_id",         req.unitId(),
                    "notes",           req.notes() != null ? req.notes() : ""
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(yms.baseUrl() + "/api/schedules"))
                    .header("Content-Type", "application/json")
                    .header("X-YMS-API-Key", yms.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                Object id = result.get("id");
                if (id instanceof Number num) return Optional.of(num.intValue());
                log.warn("YMS: agendamento criado mas sem id no retorno");
                return Optional.of(-1);
            }
            log.warn("YMS: criarAgendamento retornou status {}: {}", response.statusCode(), response.body());
            return Optional.empty();
        } catch (Exception e) {
            log.error("YMS: erro ao criar agendamento: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean cancelarAgendamento(int scheduleId) {
        AppProperties.Integracao.Yms yms = appProperties.integracao().yms();
        if (!yms.enabled()) return false;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(yms.baseUrl() + "/api/schedules/" + scheduleId))
                    .header("X-YMS-API-Key", yms.apiKey())
                    .DELETE()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("YMS: erro ao cancelar agendamento {}: {}", scheduleId, e.getMessage());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listarUnidades() {
        AppProperties.Integracao.Yms yms = appProperties.integracao().yms();
        if (!yms.enabled()) return List.of();

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(yms.baseUrl() + "/api/units"))
                    .header("X-YMS-API-Key", yms.apiKey())
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return objectMapper.readValue(response.body(), List.class);
            }
        } catch (Exception e) {
            log.error("YMS: erro ao listar unidades: {}", e.getMessage());
        }
        return List.of();
    }

    public boolean testarConexao() {
        AppProperties.Integracao.Yms yms = appProperties.integracao().yms();
        if (!yms.enabled()) return false;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(yms.baseUrl() + "/api/v1/integration/status"))
                    .header("X-YMS-API-Key", yms.apiKey())
                    .GET()
                    .timeout(Duration.ofSeconds(5))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.debug("YMS: teste de conexão falhou: {}", e.getMessage());
            return false;
        }
    }

    public record YmsScheduleRequest(
            String scheduledDate,
            String scheduledTime,
            String supplier,
            String nf,
            String operationType,
            int unitId,
            String notes
    ) {}
}
