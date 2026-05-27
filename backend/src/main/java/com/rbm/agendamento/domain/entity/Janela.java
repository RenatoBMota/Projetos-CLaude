package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.TipoProcesso;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tb_janelas")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Janela extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_processo", nullable = false, length = 50)
    private TipoProcesso tipoProcesso;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false)
    private Integer prioridade = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filial_id", nullable = false)
    private Filial filial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doca_id")
    private Doca doca;

    @Column(name = "area_operacional", length = 200)
    private String areaOperacional;

    @Column(name = "capacidade_simultanea", nullable = false)
    private Integer capacidadeSimultanea = 1;

    @Column(name = "duracao_atendimento", nullable = false)
    private Integer duracaoAtendimento;

    @Column(name = "horario_inicio", nullable = false)
    private LocalTime horarioInicio;

    @Column(name = "horario_fim", nullable = false)
    private LocalTime horarioFim;

    @Column(name = "sla_atraso")
    private Integer slaAtraso;

    @Column(name = "tempo_reagendamento", nullable = false)
    private Integer tempoReagendamento = 24;

    @Column(name = "tempo_cancelamento", nullable = false)
    private Integer tempoCancelamento = 4;

    @Column(name = "tempo_edicao_terceiros", nullable = false)
    private Integer tempoEdicaoTerceiros = 48;

    @Column(name = "buffer_entre_operacoes", nullable = false)
    private Integer bufferEntreOperacoes = 0;

    @Column(name = "obrigatorio_epi", nullable = false)
    private Boolean obrigatorioEpi = false;

    @Column(name = "obrigatorio_nfe", nullable = false)
    private Boolean obrigatorioNfe = true;

    @Column(name = "obrigatorio_xml", nullable = false)
    private Boolean obrigatorioXml = false;

    @Column(name = "obrigatorio_lacre", nullable = false)
    private Boolean obrigatorioLacre = false;

    @Column(name = "obrigatorio_foto_carga", nullable = false)
    private Boolean obrigatorioFotoCarga = false;

    @Column(name = "aceite_obrigatorio", nullable = false)
    private Boolean aceiteObrigatorio = false;

    @Column(name = "quem_aprova", length = 100)
    private String quemAprova;

    @Column(name = "sla_aprovacao")
    private Integer slaAprovacao;

    @Column(name = "aprovacao_automatica", nullable = false)
    private Boolean aprovacaoAutomatica = false;

    @Column(nullable = false)
    private Boolean ativo = true;

    @OneToMany(mappedBy = "janela", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<JanelaRestritor> restritores = new ArrayList<>();
}
