package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.transportadora.*;
import com.rbm.agendamento.application.service.TransportadoraService;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transportadoras")
@Tag(name = "Transportadoras")
@RequiredArgsConstructor
public class TransportadoraController {

    private final TransportadoraService transportadoraService;

    @GetMapping
    @Operation(summary = "Listar transportadoras")
    public ResponseEntity<ApiResponse<Page<TransportadoraResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "razaoSocial") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.listar(busca, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar transportadora por ID")
    public ResponseEntity<ApiResponse<TransportadoraResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar transportadora")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransportadoraResponse>> criar(@Valid @RequestBody TransportadoraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(transportadoraService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar transportadora")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransportadoraResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody TransportadoraRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir transportadora")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        transportadoraService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/bloquear")
    @Operation(summary = "Bloquear transportadora")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransportadoraResponse>> bloquear(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.bloquear(id, body.get("motivo"))));
    }

    @PatchMapping("/{id}/desbloquear")
    @Operation(summary = "Desbloquear transportadora")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<TransportadoraResponse>> desbloquear(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.desbloquear(id)));
    }

    @GetMapping("/{id}/contatos")
    @Operation(summary = "Listar contatos da transportadora")
    public ResponseEntity<ApiResponse<List<ContatoResponse>>> listarContatos(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(transportadoraService.listarContatos(id)));
    }

    @PostMapping("/{id}/contatos")
    @Operation(summary = "Adicionar contato")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ContatoResponse>> adicionarContato(
            @PathVariable UUID id, @Valid @RequestBody ContatoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(transportadoraService.adicionarContato(id, request)));
    }

    @DeleteMapping("/{id}/contatos/{contatoId}")
    @Operation(summary = "Remover contato")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> removerContato(@PathVariable UUID id, @PathVariable UUID contatoId) {
        transportadoraService.removerContato(id, contatoId);
        return ResponseEntity.noContent().build();
    }
}
