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

    public void publicarIntegracaoYms(String tipo, Agendamento agendamento) {
        try {
            java.util.HashMap<String, Object> payload = new java.util.HashMap<>();
            payload.put("tipo", tipo);
            payload.put("id", agendamento.getId().toString());
            payload.put("codigo", agendamento.getCodigo());
            payload.put("status", agendamento.getStatus().name());
            payload.put("filialId", agendamento.getFilial().getId().toString());
            payload.put("filialNome", agendamento.getFilial().getNome());
            payload.put("dataOperacao", agendamento.getDataOperacao().toString());
            payload.put("horarioInicio", agendamento.getHorarioInicio().toString());
            if (agendamento.getTipoOperacao() != null)
                payload.put("tipoOperacao", agendamento.getTipoOperacao().name());
            if (agendamento.getFornecedor() != null)
                payload.put("fornecedorNome", agendamento.getFornecedor().getRazaoSocial());
            if (agendamento.getTransportadora() != null)
                payload.put("transportadoraNome", agendamento.getTransportadora().getRazaoSocial());
            if (!agendamento.getDocumentos().isEmpty())
                payload.put("nf", agendamento.getDocumentos().get(0).getNumero());

            String routingKey = "integracao.yms." + tipo.toLowerCase();
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_INTEGRACAO, routingKey, payload);
            log.debug("Evento integração YMS publicado: {} para agendamento {}", tipo, agendamento.getCodigo());
        } catch (Exception e) {
            log.error("Falha ao publicar integração YMS {} para agendamento {}: {}", tipo, agendamento.getCodigo(), e.getMessage());
        }
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
