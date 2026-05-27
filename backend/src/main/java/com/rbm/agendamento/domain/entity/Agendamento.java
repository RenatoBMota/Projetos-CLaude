package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_agendamentos")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Agendamento extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TipoAgendamento tipo = TipoAgendamento.AGENDAMENTO;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_operacao", nullable = false, length = 50)
    private TipoOperacao tipoOperacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private StatusAgendamento status = StatusAgendamento.CRIADO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filial_id", nullable = false)
    private Filial filial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doca_id")
    private Doca doca;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "janela_id", nullable = false)
    private Janela janela;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transportadora_id")
    private Transportadora transportadora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motorista_id")
    private Motorista motorista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "veiculo_id")
    private Veiculo veiculo;

    @Column(name = "data_operacao", nullable = false)
    private LocalDate dataOperacao;

    @Column(name = "horario_inicio", nullable = false)
    private LocalTime horarioInicio;

    @Column(name = "horario_fim", nullable = false)
    private LocalTime horarioFim;

    @Column(name = "peso_bruto", precision = 10, scale = 3)
    private BigDecimal pesoBruto;

    @Column(name = "peso_liquido", precision = 10, scale = 3)
    private BigDecimal pesoLiquido;

    @Column(precision = 10, scale = 3)
    private BigDecimal cubagem;

    private Integer volumes;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(length = 30)
    private String protocolo;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "sla_status", nullable = false, length = 30)
    @Builder.Default
    private StatusSLA slaStatus = StatusSLA.NO_PRAZO;

    @Column(name = "no_show", nullable = false)
    @Builder.Default
    private Boolean noShow = false;

    @Column(name = "expira_em")
    private LocalDateTime expiraEm;

    @Column(name = "criado_por")
    private UUID criadoPor;

    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AgendamentoDocumento> documentos = new ArrayList<>();

    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AgendamentoHistorico> historico = new ArrayList<>();
}
