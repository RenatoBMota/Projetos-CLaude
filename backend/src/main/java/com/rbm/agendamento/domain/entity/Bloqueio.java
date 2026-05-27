package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.TipoBloqueio;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "tb_bloqueios")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Bloqueio extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TipoBloqueio tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filial_id", nullable = false)
    private Filial filial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doca_id")
    private Doca doca;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "janela_id")
    private Janela janela;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "horario_inicio")
    private LocalTime horarioInicio;

    @Column(name = "horario_fim")
    private LocalTime horarioFim;

    @Column(nullable = false, length = 200)
    private String motivo;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "criado_por")
    private UUID criadoPor;
}
