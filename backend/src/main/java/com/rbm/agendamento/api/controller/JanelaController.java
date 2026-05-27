package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.janela.JanelaRequest;
import com.rbm.agendamento.application.dto.janela.JanelaResponse;
import com.rbm.agendamento.application.service.JanelaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/janelas")
@RequiredArgsConstructor
@Tag(name = "Janelas", description = "Gestão de janelas de agendamento")
public class JanelaController {

    private final JanelaService janelaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Listar janelas por filial")
    public ApiResponse<Page<JanelaResponse>> listar(
            @RequestParam UUID filialId,
            @RequestParam(required = false) String busca,
            Pageable pageable) {
        return ApiResponse.ok(janelaService.listarPorFilial(filialId, busca, pageable));
    }

    @GetMapping("/ativas")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar janelas ativas por filial")
    public ApiResponse<List<JanelaResponse>> listarAtivas(@RequestParam UUID filialId) {
        return ApiResponse.ok(janelaService.listarAtivasPorFilial(filialId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Buscar janela por ID")
    public ApiResponse<JanelaResponse> buscarPorId(@PathVariable UUID id) {
        return ApiResponse.ok(janelaService.buscarPorId(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Criar janela")
    public ApiResponse<JanelaResponse> criar(@Valid @RequestBody JanelaRequest request) {
        return ApiResponse.ok(janelaService.criar(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Atualizar janela")
    public ApiResponse<JanelaResponse> atualizar(@PathVariable UUID id,
                                                   @Valid @RequestBody JanelaRequest request) {
        return ApiResponse.ok(janelaService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Excluir janela (soft delete)")
    public void excluir(@PathVariable UUID id) {
        janelaService.excluir(id);
    }
}
