package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.fornecedor.FornecedorRequest;
import com.rbm.agendamento.application.dto.fornecedor.FornecedorResponse;
import com.rbm.agendamento.application.service.FornecedorService;
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
@RequestMapping("/api/v1/fornecedores")
@Tag(name = "Fornecedores")
@RequiredArgsConstructor
public class FornecedorController {

    private final FornecedorService fornecedorService;

    @GetMapping
    @Operation(summary = "Listar fornecedores")
    public ResponseEntity<ApiResponse<Page<FornecedorResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "razaoSocial") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(fornecedorService.listar(busca, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar fornecedor por ID")
    public ResponseEntity<ApiResponse<FornecedorResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(fornecedorService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar fornecedor")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<FornecedorResponse>> criar(@Valid @RequestBody FornecedorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(fornecedorService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar fornecedor")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<FornecedorResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody FornecedorRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(fornecedorService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir fornecedor")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        fornecedorService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
