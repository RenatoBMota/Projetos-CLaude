package com.rbm.agendamento.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Security security, Minio minio) {

    public record Security(Jwt jwt) {
        public record Jwt(String secret, long expirationMs, long refreshExpirationMs) {}
    }

    public record Minio(
            String endpoint,
            String accessKey,
            String secretKey,
            String bucketDocuments,
            String bucketAttachments
    ) {}
}
