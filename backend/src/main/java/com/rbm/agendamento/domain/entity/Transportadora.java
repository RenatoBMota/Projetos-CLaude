package com.rbm.agendamento.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "tb_transportadoras")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Transportadora extends BaseEntity {

    @Column(name = "razao_social", nullable = false, length = 300)
    private String razaoSocial;

    @Column(name = "nome_fantasia", length = 200)
    private String nomeFantasia;

    @Column(nullable = false, unique = true, length = 18)
    private String cnpj;

    @Column(name = "inscricao_estadual", length = 50)
    private String inscricaoEstadual;

    @Column(length = 50)
    private String nacionalidade = "Brasileira";

    @Column(name = "tipo_operacao", length = 50)
    private String tipoOperacao;

    @Column(length = 200)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(length = 200)
    private String responsavel;

    @Column(name = "sla_personalizado")
    private Integer slaPersonalizado;

    @Column(nullable = false)
    private Integer prioridade = 0;

    @Column(nullable = false)
    private Boolean bloqueada = false;

    @Column(nullable = false)
    private Boolean blacklist = false;

    @Column(name = "motivo_bloqueio", length = 500)
    private String motivoBloqueio;

    @Column(nullable = false)
    private Boolean ativo = true;
}
