package com.rbm.agendamento.config;

import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class MinioConfig {

    private final AppProperties appProperties;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(appProperties.minio().endpoint())
                .credentials(appProperties.minio().accessKey(), appProperties.minio().secretKey())
                .build();
    }
}
