package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.doca.DocaRequest;
import com.rbm.agendamento.application.dto.doca.DocaResponse;
import com.rbm.agendamento.application.service.DocaService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/docas")
@Tag(name = "Docas")
@RequiredArgsConstructor
public class DocaController {

    private final DocaService docaService;

    @GetMapping("/filial/{filialId}")
    @Operation(summary = "Listar docas por filial")
    public ResponseEntity<ApiResponse<Page<DocaResponse>>> listarPorFilial(
            @PathVariable UUID filialId,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(docaService.listarPorFilial(filialId, busca, pageable)));
    }

    @GetMapping("/filial/{filialId}/ativas")
    @Operation(summary = "Listar docas ativas por filial")
    public ResponseEntity<ApiResponse<List<DocaResponse>>> listarAtivasPorFilial(@PathVariable UUID filialId) {
        return ResponseEntity.ok(ApiResponse.ok(docaService.listarAtivasPorFilial(filialId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar doca por ID")
    public ResponseEntity<ApiResponse<DocaResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(docaService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar doca")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<DocaResponse>> criar(@Valid @RequestBody DocaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(docaService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar doca")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<DocaResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody DocaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(docaService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir doca")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        docaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
