package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.veiculo.VeiculoRequest;
import com.rbm.agendamento.application.dto.veiculo.VeiculoResponse;
import com.rbm.agendamento.application.service.VeiculoService;
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
@RequestMapping("/api/v1/veiculos")
@Tag(name = "Veículos")
@RequiredArgsConstructor
public class VeiculoController {

    private final VeiculoService veiculoService;

    @GetMapping
    @Operation(summary = "Listar veículos")
    public ResponseEntity<ApiResponse<Page<VeiculoResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "placa") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(veiculoService.listar(busca, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar veículo por ID")
    public ResponseEntity<ApiResponse<VeiculoResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(veiculoService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar veículo")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<VeiculoResponse>> criar(@Valid @RequestBody VeiculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(veiculoService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar veículo")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<VeiculoResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody VeiculoRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(veiculoService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir veículo")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        veiculoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
