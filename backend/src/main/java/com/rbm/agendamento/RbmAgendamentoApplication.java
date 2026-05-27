package com.rbm.agendamento;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class RbmAgendamentoApplication {

    public static void main(String[] args) {
        SpringApplication.run(RbmAgendamentoApplication.class, args);
    }
}
