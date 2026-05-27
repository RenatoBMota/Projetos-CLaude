package com.rbm.agendamento.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_produtos")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Produto extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(nullable = false, length = 300)
    private String descricao;

    @Column(length = 100)
    private String categoria;

    @Column(name = "peso_medio", precision = 10, scale = 3)
    private BigDecimal pesoMedio;

    @Column(precision = 10, scale = 4)
    private BigDecimal cubagem;

    @Column(name = "tipo_armazenagem", length = 100)
    private String tipoArmazenagem;

    @Column(name = "necessita_refrigeracao", nullable = false)
    private Boolean necessitaRefrigeracao = false;

    @Column(name = "produto_perigoso", nullable = false)
    private Boolean produtoPerigoso = false;

    @Column(name = "classe_risco", length = 50)
    private String classeRisco;

    @Column(nullable = false)
    private Boolean ativo = true;
}
