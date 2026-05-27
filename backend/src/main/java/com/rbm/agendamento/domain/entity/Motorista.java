package com.rbm.agendamento.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

@Entity
@Table(name = "tb_motoristas")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Motorista extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, unique = true, length = 14)
    private String cpf;

    @Column(length = 20)
    private String rg;

    @Column(nullable = false, unique = true, length = 20)
    private String cnh;

    @Column(name = "categoria_cnh", nullable = false, length = 5)
    private String categoriaCnh;

    @Column(name = "validade_cnh", nullable = false)
    private LocalDate validadeCnh;

    @Column(length = 20)
    private String telefone;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @Column(length = 50)
    private String nacionalidade = "Brasileiro";

    @Column(name = "foto_path", length = 500)
    private String fotoPath;

    @Column(nullable = false)
    private Boolean blacklist = false;

    @Column(name = "motivo_blacklist", length = 500)
    private String motivoBlacklist;

    @Column(nullable = false)
    private Boolean ativo = true;

    public boolean isCnhVencida() {
        return validadeCnh != null && LocalDate.now().isAfter(validadeCnh);
    }
}
