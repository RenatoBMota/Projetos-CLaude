package com.rbm.agendamento.domain.entity;

import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_checklist_documental")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ChecklistDocumental {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false, unique = true)
    private Agendamento agendamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusValidacaoDocumento status = StatusValidacaoDocumento.PENDENTE;

    @Column(name = "nfe_ok", nullable = false)
    @Builder.Default
    private Boolean nfeOk = false;

    @Column(name = "xml_ok", nullable = false)
    @Builder.Default
    private Boolean xmlOk = false;

    @Column(name = "lacre_ok", nullable = false)
    @Builder.Default
    private Boolean lacreOk = false;

    @Column(name = "foto_carga_ok", nullable = false)
    @Builder.Default
    private Boolean fotoCargaOk = false;

    @Column(name = "epi_ok", nullable = false)
    @Builder.Default
    private Boolean epiOk = false;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(name = "atualizado_em", nullable = false)
    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    public void atualizar() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
