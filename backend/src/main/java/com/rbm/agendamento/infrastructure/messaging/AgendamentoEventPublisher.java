package com.rbm.agendamento.infrastructure.messaging;

import com.rbm.agendamento.config.RabbitMQConfig;
import com.rbm.agendamento.domain.entity.Agendamento;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgendamentoEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publicarCriado(Agendamento agendamento) {
        publicar(RabbitMQConfig.RK_AGENDAMENTO_CRIADO, agendamento);
    }

    public void publicarConfirmado(Agendamento agendamento) {
        publicar(RabbitMQConfig.RK_AGENDAMENTO_CONFIRMADO, agendamento);
    }

    public void publicarCancelado(Agendamento agendamento) {
        publicar(RabbitMQConfig.RK_AGENDAMENTO_CANCELADO, agendamento);
    }

    private void publicar(String routingKey, Agendamento agendamento) {
        try {
            Map<String, Object> payload = Map.of(
                    "id", agendamento.getId().toString(),
                    "codigo", agendamento.getCodigo(),
                    "status", agendamento.getStatus().name(),
                    "filialId", agendamento.getFilial().getId().toString(),
                    "janelaId", agendamento.getJanela().getId().toString(),
                    "dataOperacao", agendamento.getDataOperacao().toString(),
                    "horarioInicio", agendamento.getHorarioInicio().toString()
            );
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_AGENDAMENTO, routingKey, payload);
            log.debug("Evento publicado: {} para agendamento {}", routingKey, agendamento.getCodigo());
        } catch (Exception e) {
            log.error("Falha ao publicar evento {} para agendamento {}: {}", routingKey, agendamento.getCodigo(), e.getMessage());
        }
    }
}
