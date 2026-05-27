package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.TipoCarroceria;
import com.rbm.agendamento.domain.enums.TipoVeiculo;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_veiculos")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Veiculo extends BaseEntity {

    @Column(nullable = false, unique = true, length = 8)
    private String placa;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_veiculo", nullable = false, length = 50)
    private TipoVeiculo tipoVeiculo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_carroceria", nullable = false, length = 50)
    private TipoCarroceria tipoCarroceria;

    @Column(precision = 10, scale = 2)
    private BigDecimal tara;

    @Column(name = "capacidade_maxima", precision = 10, scale = 2)
    private BigDecimal capacidadeMaxima;

    @Column(length = 20)
    private String rntrc;

    @Column(length = 300)
    private String proprietario;

    private Integer ano;

    @Column(length = 100)
    private String modelo;

    @Column(nullable = false)
    private Boolean ativo = true;
}
