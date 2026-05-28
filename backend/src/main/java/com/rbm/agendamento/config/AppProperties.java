package com.rbm.agendamento.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Security security, Minio minio, Notification notification, Integracao integracao) {

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

    public record Notification(Email email, WhatsApp whatsapp) {
        public record Email(boolean enabled, String from, String fromName) {}
        public record WhatsApp(boolean enabled, String webhookUrl, String apiKey) {}
    }

    public record Integracao(Yms yms) {
        public record Yms(
                boolean enabled,
                String baseUrl,
                String apiKey,
                String webhookSecret
        ) {}
    }
}
