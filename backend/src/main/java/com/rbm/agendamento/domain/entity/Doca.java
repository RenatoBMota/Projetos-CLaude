package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.TipoDoca;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_docas")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Doca extends BaseEntity {

    @Column(nullable = false, length = 20)
    private String codigo;

    @Column(nullable = false, length = 200)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TipoDoca tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filial_id", nullable = false)
    private Filial filial;

    @Column(name = "capacidade_simultanea", nullable = false)
    private Integer capacidadeSimultanea = 1;

    @Column(name = "peso_maximo", precision = 10, scale = 2)
    private BigDecimal pesoMaximo;

    @Column(name = "altura_maxima", precision = 5, scale = 2)
    private BigDecimal alturaMaxima;

    @Column(name = "comprimento_maximo", precision = 5, scale = 2)
    private BigDecimal comprimentoMaximo;

    @Column(name = "tipos_carga_permitida", length = 500)
    private String tiposCargaPermitida;

    @Column(nullable = false)
    private Boolean ativo = true;
}
