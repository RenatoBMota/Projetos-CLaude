package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.service.AgendamentoService;
import com.rbm.agendamento.config.AppProperties;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import com.rbm.agendamento.infrastructure.integration.YmsClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/integracao/yms")
@RequiredArgsConstructor
@Tag(name = "Integração YMS", description = "Webhook e status da integração com o YMS")
public class IntegracaoYmsController {

    private final AppProperties appProperties;
    private final AgendamentoService agendamentoService;
    private final YmsClient ymsClient;

    /** YMS calls this when a vehicle checks in or finishes an operation. */
    @PostMapping("/webhook")
    @Operation(summary = "Webhook recebido do YMS (check-in / finalização de veículo)")
    public ResponseEntity<Map<String, Object>> receberEvento(
            @RequestHeader(value = "X-YMS-Webhook-Secret", required = false) String secret,
            @RequestBody Map<String, Object> payload) {

        String expectedSecret = appProperties.integracao().yms().webhookSecret();
        if (expectedSecret != null && !expectedSecret.isBlank()
                && !expectedSecret.equals(secret)) {
            log.warn("YMS webhook: secret inválido recebido");
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        String evento     = (String) payload.getOrDefault("evento", "");
        String agendamentoIdStr = (String) payload.get("agendamento_id");
        log.info("YMS webhook: evento={} agendamento_id={}", evento, agendamentoIdStr);

        try {
            if (agendamentoIdStr != null) {
                UUID agendamentoId = UUID.fromString(agendamentoIdStr);
                switch (evento) {
                    case "CHECK_IN" -> {
                        // Marca chegada ao pátio
                        agendamentoService.registrarChegada(agendamentoId, null);
                        log.info("YMS webhook: chegada registrada para agendamento {}", agendamentoId);
                    }
                    case "FINALIZADO" -> {
                        // Finaliza a operação
                        agendamentoService.finalizar(agendamentoId, null);
                        log.info("YMS webhook: operação finalizada para agendamento {}", agendamentoId);
                    }
                    default -> log.debug("YMS webhook: evento '{}' ignorado", evento);
                }
            }
        } catch (Exception e) {
            log.warn("YMS webhook: não foi possível atualizar agendamento {}: {}", agendamentoIdStr, e.getMessage());
        }

        return ResponseEntity.ok(Map.of("received", true, "evento", evento));
    }

    /** Health check endpoint — YMS can call this to verify connectivity. */
    @GetMapping("/status")
    @Operation(summary = "Status da integração YMS")
    public ApiResponse<Map<String, Object>> status() {
        boolean ymsEnabled = appProperties.integracao().yms().enabled();
        boolean ymsOnline = ymsEnabled && ymsClient.testarConexao();
        return ApiResponse.ok(Map.of(
                "enabled",  ymsEnabled,
                "ymsOnline", ymsOnline,
                "baseUrl",  appProperties.integracao().yms().baseUrl()
        ));
    }
}
