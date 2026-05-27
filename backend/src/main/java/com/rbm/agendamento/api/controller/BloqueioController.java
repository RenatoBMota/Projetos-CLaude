package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.bloqueio.BloqueioRequest;
import com.rbm.agendamento.application.dto.bloqueio.BloqueioResponse;
import com.rbm.agendamento.application.service.BloqueioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bloqueios")
@RequiredArgsConstructor
@Tag(name = "Bloqueios", description = "Gestão de bloqueios de janelas")
public class BloqueioController {

    private final BloqueioService bloqueioService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Listar bloqueios por filial")
    public ApiResponse<Page<BloqueioResponse>> listar(
            @RequestParam UUID filialId,
            @RequestParam(required = false) String busca,
            Pageable pageable) {
        return ApiResponse.ok(bloqueioService.listarPorFilial(filialId, busca, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Buscar bloqueio por ID")
    public ApiResponse<BloqueioResponse> buscarPorId(@PathVariable UUID id) {
        return ApiResponse.ok(bloqueioService.buscarPorId(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Criar bloqueio")
    public ApiResponse<BloqueioResponse> criar(@Valid @RequestBody BloqueioRequest request,
                                                @AuthenticationPrincipal UserDetails user) {
        UUID usuarioId = user instanceof com.rbm.agendamento.domain.entity.Usuario u ? u.getId() : null;
        return ApiResponse.ok(bloqueioService.criar(request, usuarioId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Atualizar bloqueio")
    public ApiResponse<BloqueioResponse> atualizar(@PathVariable UUID id,
                                                    @Valid @RequestBody BloqueioRequest request) {
        return ApiResponse.ok(bloqueioService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Excluir bloqueio")
    public void excluir(@PathVariable UUID id) {
        bloqueioService.excluir(id);
    }
}
