package com.rbm.agendamento.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "tb_fornecedores")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Fornecedor extends BaseEntity {

    @Column(name = "razao_social", nullable = false, length = 300)
    private String razaoSocial;

    @Column(name = "nome_fantasia", length = 200)
    private String nomeFantasia;

    @Column(nullable = false, unique = true, length = 18)
    private String cnpj;

    @Column(name = "inscricao_estadual", length = 50)
    private String inscricaoEstadual;

    @Column(name = "tipo_fornecedor", length = 100)
    private String tipoFornecedor;

    @Column(length = 200)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(length = 200)
    private String responsavel;

    @Column(name = "limite_agendamentos_dia")
    private Integer limiteAgendamentosDia;

    @Column(name = "sla_documental")
    private Integer slaDocumental;

    @Column(name = "bloqueio_automatico", nullable = false)
    private Boolean bloqueioAutomatico = false;

    @Column(nullable = false)
    private Boolean ativo = true;
}
