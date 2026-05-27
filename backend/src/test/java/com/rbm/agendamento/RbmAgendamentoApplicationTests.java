package com.rbm.agendamento;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:tc:postgresql:16:///rbm_test",
        "spring.flyway.enabled=true",
        "spring.data.redis.host=localhost",
        "spring.rabbitmq.host=localhost"
})
class RbmAgendamentoApplicationTests {

    @Test
    void contextLoads() {
    }
}
