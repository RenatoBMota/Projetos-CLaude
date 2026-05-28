package com.rbm.agendamento.infrastructure.messaging;

import com.rbm.agendamento.config.RabbitMQConfig;
import com.rbm.agendamento.infrastructure.integration.YmsIntegracaoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class IntegracaoYmsListener {

    private final YmsIntegracaoService ymsIntegracaoService;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_INTEGRACAO_YMS, ackMode = "AUTO")
    public void processar(Map<String, Object> evento, Message message) {
        String tipo = (String) evento.getOrDefault("tipo", "");
        String codigo = (String) evento.getOrDefault("codigo", "?");
        log.info("IntegracaoYms: processando evento tipo={} agendamento={}", tipo, codigo);

        try {
            switch (tipo) {
                case "CONFIRMADO" -> ymsIntegracaoService.sincronizarConfirmado(evento);
                case "CANCELADO"  -> ymsIntegracaoService.sincronizarCancelado(evento);
                default           -> log.warn("IntegracaoYms: tipo desconhecido '{}'", tipo);
            }
        } catch (Exception e) {
            log.error("IntegracaoYms: erro ao processar evento tipo={} agendamento={}: {}", tipo, codigo, e.getMessage());
            // Não re-enfileira — falha de integração não deve bloquear o sistema principal
        }
    }
}
