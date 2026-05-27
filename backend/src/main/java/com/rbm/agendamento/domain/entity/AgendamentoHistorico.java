package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.StatusAgendamento;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_agendamento_historico")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AgendamentoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 30)
    private StatusAgendamento statusAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", nullable = false, length = 30)
    private StatusAgendamento statusNovo;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(name = "usuario_id")
    private UUID usuarioId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
