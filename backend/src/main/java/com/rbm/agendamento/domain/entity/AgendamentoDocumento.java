package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_agendamento_documentos")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class AgendamentoDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;

    @Column(name = "tipo_documento", nullable = false, length = 30)
    private String tipoDocumento;

    @Column(length = 50)
    private String numero;

    @Column(length = 10)
    private String serie;

    @Column(name = "chave_acesso", length = 50)
    private String chaveAcesso;

    @Column(name = "xml_path", length = 500)
    private String xmlPath;

    @Column(length = 200)
    private String emitente;

    @Column(length = 200)
    private String destinatario;

    @Column(precision = 10, scale = 3)
    private BigDecimal peso;

    private Integer volumes;

    @Column(name = "valor_total", precision = 15, scale = 2)
    private BigDecimal valorTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_validacao", nullable = false, length = 20)
    @Builder.Default
    private StatusValidacaoDocumento statusValidacao = StatusValidacaoDocumento.PENDENTE;

    @Column(name = "observacao_validacao", columnDefinition = "TEXT")
    private String observacaoValidacao;

    @Column(name = "nome_arquivo", length = 300)
    private String nomeArquivo;

    @Column(name = "tamanho_arquivo")
    private Long tamanhoArquivo;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "validado_em")
    private LocalDateTime validadoEm;

    @Column(name = "validado_por")
    private UUID validadoPor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
