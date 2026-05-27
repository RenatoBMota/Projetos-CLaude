package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.produto.ProdutoRequest;
import com.rbm.agendamento.application.dto.produto.ProdutoResponse;
import com.rbm.agendamento.application.service.ProdutoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/produtos")
@Tag(name = "Produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService produtoService;

    @GetMapping
    @Operation(summary = "Listar produtos")
    public ResponseEntity<ApiResponse<Page<ProdutoResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "descricao") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(produtoService.listar(busca, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar produto por ID")
    public ResponseEntity<ApiResponse<ProdutoResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(produtoService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar produto")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProdutoResponse>> criar(@Valid @RequestBody ProdutoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(produtoService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar produto")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProdutoResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody ProdutoRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(produtoService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir produto")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        produtoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
