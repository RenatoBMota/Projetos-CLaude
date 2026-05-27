package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.produto.ProdutoRequest;
import com.rbm.agendamento.application.dto.produto.ProdutoResponse;
import com.rbm.agendamento.domain.entity.Produto;
import com.rbm.agendamento.infrastructure.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    @Transactional(readOnly = true)
    public Page<ProdutoResponse> listar(String busca, Pageable pageable) {
        return produtoRepository.buscar(busca, pageable).map(ProdutoResponse::from);
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarPorId(UUID id) {
        return ProdutoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest request) {
        if (produtoRepository.existsByCodigo(request.codigo()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de produto já cadastrado: " + request.codigo());
        return ProdutoResponse.from(produtoRepository.save(mapear(new Produto(), request)));
    }

    @Transactional
    public ProdutoResponse atualizar(UUID id, ProdutoRequest request) {
        Produto p = buscarEntidade(id);
        if (!p.getCodigo().equals(request.codigo()) && produtoRepository.existsByCodigo(request.codigo()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de produto já cadastrado: " + request.codigo());
        return ProdutoResponse.from(produtoRepository.save(mapear(p, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Produto p = buscarEntidade(id);
        p.softDelete();
        produtoRepository.save(p);
    }

    private Produto buscarEntidade(UUID id) {
        return produtoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Produto", id));
    }

    private Produto mapear(Produto p, ProdutoRequest r) {
        p.setCodigo(r.codigo());
        p.setDescricao(r.descricao());
        p.setCategoria(r.categoria());
        p.setPesoMedio(r.pesoMedio());
        p.setCubagem(r.cubagem());
        p.setTipoArmazenagem(r.tipoArmazenagem());
        if (r.necessitaRefrigeracao() != null) p.setNecessitaRefrigeracao(r.necessitaRefrigeracao());
        if (r.produtoPerigoso() != null) p.setProdutoPerigoso(r.produtoPerigoso());
        p.setClasseRisco(r.classeRisco());
        if (r.ativo() != null) p.setAtivo(r.ativo());
        return p;
    }
}
