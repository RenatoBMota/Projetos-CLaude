package com.rbm.agendamento.application.dto.produto;

import com.rbm.agendamento.domain.entity.Produto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProdutoResponse(
        UUID id, String codigo, String descricao, String categoria,
        BigDecimal pesoMedio, BigDecimal cubagem, String tipoArmazenagem,
        Boolean necessitaRefrigeracao, Boolean produtoPerigoso, String classeRisco,
        Boolean ativo, LocalDateTime createdAt
) {
    public static ProdutoResponse from(Produto p) {
        return new ProdutoResponse(p.getId(), p.getCodigo(), p.getDescricao(), p.getCategoria(),
                p.getPesoMedio(), p.getCubagem(), p.getTipoArmazenagem(),
                p.getNecessitaRefrigeracao(), p.getProdutoPerigoso(), p.getClasseRisco(),
                p.getAtivo(), p.getCreatedAt());
    }
}
