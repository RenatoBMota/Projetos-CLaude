package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.filial.FilialRequest;
import com.rbm.agendamento.application.dto.filial.FilialResponse;
import com.rbm.agendamento.application.service.FilialService;
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
@RequestMapping("/api/v1/filiais")
@Tag(name = "Filiais")
@RequiredArgsConstructor
public class FilialController {

    private final FilialService filialService;

    @GetMapping
    @Operation(summary = "Listar filiais")
    public ResponseEntity<ApiResponse<Page<FilialResponse>>> listar(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(filialService.listar(busca, pageable)));
    }

    @GetMapping("/ativas")
    @Operation(summary = "Listar filiais ativas")
    public ResponseEntity<ApiResponse<List<FilialResponse>>> listarAtivas() {
        return ResponseEntity.ok(ApiResponse.ok(filialService.listarAtivas()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar filial por ID")
    public ResponseEntity<ApiResponse<FilialResponse>> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(filialService.buscarPorId(id)));
    }

    @PostMapping
    @Operation(summary = "Criar filial")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FilialResponse>> criar(@Valid @RequestBody FilialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(filialService.criar(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar filial")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FilialResponse>> atualizar(@PathVariable UUID id, @Valid @RequestBody FilialRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(filialService.atualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir filial")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        filialService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
