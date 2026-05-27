package com.rbm.agendamento.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ─── Exchanges ──────────────────────────────────────────────────────────
    public static final String EXCHANGE_AGENDAMENTO  = "rbm.agendamento";
    public static final String EXCHANGE_NOTIFICACAO  = "rbm.notificacao";
    public static final String EXCHANGE_INTEGRACAO   = "rbm.integracao";
    public static final String EXCHANGE_DEAD_LETTER  = "rbm.dead-letter";

    // ─── Queues ─────────────────────────────────────────────────────────────
    public static final String QUEUE_AGENDAMENTO_CRIADO     = "rbm.agendamento.criado";
    public static final String QUEUE_AGENDAMENTO_CONFIRMADO = "rbm.agendamento.confirmado";
    public static final String QUEUE_AGENDAMENTO_CANCELADO  = "rbm.agendamento.cancelado";
    public static final String QUEUE_NOTIFICACOES           = "rbm.notificacoes";
    public static final String QUEUE_INTEGRACAO_YMS         = "rbm.integracao.yms";
    public static final String QUEUE_INTEGRACAO_WMS         = "rbm.integracao.wms";
    public static final String QUEUE_DEAD_LETTER            = "rbm.dead-letter";

    // ─── Routing Keys ───────────────────────────────────────────────────────
    public static final String RK_AGENDAMENTO_CRIADO     = "agendamento.criado";
    public static final String RK_AGENDAMENTO_CONFIRMADO = "agendamento.confirmado";
    public static final String RK_AGENDAMENTO_CANCELADO  = "agendamento.cancelado";

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory factory) {
        var template = new RabbitTemplate(factory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory factory) {
        var containerFactory = new SimpleRabbitListenerContainerFactory();
        containerFactory.setConnectionFactory(factory);
        containerFactory.setMessageConverter(messageConverter());
        containerFactory.setDefaultRequeueRejected(false);
        return containerFactory;
    }

    // ─── Exchanges ──────────────────────────────────────────────────────────

    @Bean
    public TopicExchange agendamentoExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE_AGENDAMENTO).durable(true).build();
    }

    @Bean
    public FanoutExchange notificacaoExchange() {
        return ExchangeBuilder.fanoutExchange(EXCHANGE_NOTIFICACAO).durable(true).build();
    }

    @Bean
    public TopicExchange integracaoExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE_INTEGRACAO).durable(true).build();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(EXCHANGE_DEAD_LETTER).durable(true).build();
    }

    // ─── Queues ─────────────────────────────────────────────────────────────

    @Bean
    public Queue queueAgendamentoCriado() {
        return QueueBuilder.durable(QUEUE_AGENDAMENTO_CRIADO)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueAgendamentoConfirmado() {
        return QueueBuilder.durable(QUEUE_AGENDAMENTO_CONFIRMADO)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueAgendamentoCancelado() {
        return QueueBuilder.durable(QUEUE_AGENDAMENTO_CANCELADO)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueNotificacoes() {
        return QueueBuilder.durable(QUEUE_NOTIFICACOES)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueIntegracaoYms() {
        return QueueBuilder.durable(QUEUE_INTEGRACAO_YMS)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueIntegracaoWms() {
        return QueueBuilder.durable(QUEUE_INTEGRACAO_WMS)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DEAD_LETTER)
                .build();
    }

    @Bean
    public Queue queueDeadLetter() {
        return QueueBuilder.durable(QUEUE_DEAD_LETTER).build();
    }

    // ─── Bindings ───────────────────────────────────────────────────────────

    @Bean
    public Binding bindingAgendamentoCriado() {
        return BindingBuilder.bind(queueAgendamentoCriado())
                .to(agendamentoExchange())
                .with(RK_AGENDAMENTO_CRIADO);
    }

    @Bean
    public Binding bindingAgendamentoConfirmado() {
        return BindingBuilder.bind(queueAgendamentoConfirmado())
                .to(agendamentoExchange())
                .with(RK_AGENDAMENTO_CONFIRMADO);
    }

    @Bean
    public Binding bindingAgendamentoCancelado() {
        return BindingBuilder.bind(queueAgendamentoCancelado())
                .to(agendamentoExchange())
                .with(RK_AGENDAMENTO_CANCELADO);
    }

    @Bean
    public Binding bindingDeadLetter() {
        return BindingBuilder.bind(queueDeadLetter())
                .to(deadLetterExchange())
                .with(QUEUE_DEAD_LETTER);
    }
}
