package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.TipoRestritor;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_janela_restritores")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class JanelaRestritor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "janela_id", nullable = false)
    private Janela janela;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TipoRestritor tipo;

    @Column(nullable = false, length = 200)
    private String valor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
