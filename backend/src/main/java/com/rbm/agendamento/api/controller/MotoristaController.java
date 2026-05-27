package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.motorista.MotoristaRequest;
import com.rbm.agendamento.application.dto.motorista.MotoristaResponse;
import com.rbm.agendamento.application.service.MotoristaService;
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
@RequestMapping("/api/v1/motoristas")
@Tag(name = "Motoristas")
@RequiredArgsConstructor
public class MotoristaController {

    private final MotoristaService motoristaService;

    @GetMapping
    @Operation(summary = "Listar motoristas")
    public ResponseEntity<ApiResponse<Page<MotoristaResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(motoristaService.listar(busca, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar motorista por ID")
    public ResponseEntity<ApiResponse<MotoristaResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(motoristaService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar motorista")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<MotoristaResponse>> criar(@Valid @RequestBody MotoristaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(motoristaService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar motorista")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public ResponseEntity<ApiResponse<MotoristaResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody MotoristaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(motoristaService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir motorista")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        motoristaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
