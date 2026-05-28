package com.rbm.agendamento.infrastructure.messaging;

import com.rabbitmq.client.Channel;
import com.rbm.agendamento.application.service.NotificacaoService;
import com.rbm.agendamento.config.RabbitMQConfig;
import com.rbm.agendamento.infrastructure.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgendamentoNotificacaoListener {

    private final NotificacaoService notificacaoService;
    private final AgendamentoRepository agendamentoRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AGENDAMENTO_CRIADO,
                    containerFactory = "rabbitListenerContainerFactory")
    public void onCriado(Map<String, Object> payload, Message message, Channel channel) throws Exception {
        processar(payload, message, channel, "criado");
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AGENDAMENTO_CONFIRMADO,
                    containerFactory = "rabbitListenerContainerFactory")
    public void onConfirmado(Map<String, Object> payload, Message message, Channel channel) throws Exception {
        processar(payload, message, channel, "confirmado");
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AGENDAMENTO_CANCELADO,
                    containerFactory = "rabbitListenerContainerFactory")
    public void onCancelado(Map<String, Object> payload, Message message, Channel channel) throws Exception {
        processar(payload, message, channel, "cancelado");
    }

    private void processar(Map<String, Object> payload, Message message, Channel channel,
                            String tipo) throws Exception {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        try {
            String idStr = (String) payload.get("id");
            if (idStr == null) {
                log.warn("Evento sem campo 'id', descartando");
                channel.basicAck(deliveryTag, false);
                return;
            }
            UUID agendamentoId = UUID.fromString(idStr);
            agendamentoRepository.findById(agendamentoId).ifPresentOrElse(
                    ag -> {
                        switch (tipo) {
                            case "criado"    -> notificacaoService.notificarCriado(ag);
                            case "confirmado" -> notificacaoService.notificarConfirmado(ag);
                            case "cancelado" -> notificacaoService.notificarCancelado(ag);
                        }
                    },
                    () -> log.warn("Agendamento {} não encontrado, pulando notificação", agendamentoId)
            );
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro ao processar evento {}: {}", tipo, e.getMessage());
            boolean requeue = message.getMessageProperties().getRedelivered() == null
                    || !message.getMessageProperties().getRedelivered();
            channel.basicNack(deliveryTag, false, requeue);
        }
    }
}
