package com.rbm.agendamento.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_notificacao_log")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class NotificacaoLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "agendamento_id")
    private UUID agendamentoId;

    @Column(nullable = false, length = 20)
    private String canal;

    @Column(nullable = false, length = 60)
    private String evento;

    @Column(nullable = false, length = 300)
    private String destinatario;

    @Column(length = 300)
    private String assunto;

    @Column(columnDefinition = "TEXT")
    private String corpo;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ENVIADO";

    @Column(columnDefinition = "TEXT")
    private String erro;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
