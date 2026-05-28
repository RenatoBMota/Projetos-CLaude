package com.rbm.agendamento.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rbm.agendamento.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppService {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP = HttpClient.newHttpClient();

    public void enviar(String telefone, String mensagem) {
        AppProperties.Notification.WhatsApp cfg = appProperties.notification().whatsapp();
        if (!cfg.enabled()) {
            log.debug("WhatsApp desativado — ignorando envio para {}", telefone);
            return;
        }
        if (cfg.webhookUrl() == null || cfg.webhookUrl().isBlank()) {
            log.warn("WhatsApp webhook URL não configurada");
            return;
        }
        try {
            String numero = telefone.replaceAll("[^0-9+]", "");
            Map<String, Object> payload = Map.of(
                    "to", numero,
                    "message", mensagem,
                    "type", "text"
            );
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(cfg.webhookUrl()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + cfg.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                log.info("WhatsApp enviado para {} — status {}", numero, res.statusCode());
            } else {
                log.warn("WhatsApp retornou status {} para {}: {}", res.statusCode(), numero, res.body());
                throw new RuntimeException("Webhook retornou HTTP " + res.statusCode());
            }
        } catch (Exception e) {
            log.error("Falha ao enviar WhatsApp para {}: {}", telefone, e.getMessage());
            throw new RuntimeException("Falha ao enviar WhatsApp: " + e.getMessage(), e);
        }
    }

    public String formatarMensagem(String evento, String codigo, String dataHora, String filial) {
        return switch (evento) {
            case "agendamento.criado" -> String.format(
                    "✅ *RBM Logistics* — Novo agendamento\n*Código:* %s\n*Data/Hora:* %s\n*Filial:* %s",
                    codigo, dataHora, filial);
            case "agendamento.aceite_pendente" -> String.format(
                    "⏳ *RBM Logistics* — Confirmação necessária\n*Código:* %s\n*Data/Hora:* %s\n*Filial:* %s\nAcesse o portal para aceitar ou recusar.",
                    codigo, dataHora, filial);
            case "agendamento.confirmado" -> String.format(
                    "✅ *RBM Logistics* — Agendamento confirmado\n*Código:* %s\n*Data/Hora:* %s\n*Filial:* %s",
                    codigo, dataHora, filial);
            case "agendamento.cancelado" -> String.format(
                    "❌ *RBM Logistics* — Agendamento cancelado\n*Código:* %s\n*Data/Hora:* %s\nEntre em contato para reagendamento.",
                    codigo, dataHora);
            default -> String.format("*RBM Logistics* — Agendamento %s: %s", evento, codigo);
        };
    }
}
