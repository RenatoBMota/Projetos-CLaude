package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.agendamento.AgendamentoRequest;
import com.rbm.agendamento.application.dto.agendamento.AgendamentoResponse;
import com.rbm.agendamento.application.service.AgendamentoService;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agendamentos")
@RequiredArgsConstructor
@Tag(name = "Agendamentos", description = "Motor de agendamento logístico")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR','AUDIT')")
    @Operation(summary = "Listar agendamentos com filtros")
    public ApiResponse<Page<AgendamentoResponse>> listar(
            @RequestParam(required = false) UUID filialId,
            @RequestParam(required = false) StatusAgendamento status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String busca,
            Pageable pageable) {
        return ApiResponse.ok(agendamentoService.listar(filialId, status, dataInicio, dataFim, busca, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Buscar agendamento por ID")
    public ApiResponse<AgendamentoResponse> buscarPorId(@PathVariable UUID id) {
        return ApiResponse.ok(agendamentoService.buscarPorId(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Criar agendamento")
    public ApiResponse<AgendamentoResponse> criar(@Valid @RequestBody AgendamentoRequest request,
                                                   @AuthenticationPrincipal UserDetails user) {
        UUID usuarioId = extrairUsuarioId(user);
        return ApiResponse.ok(agendamentoService.criar(request, usuarioId));
    }

    @PostMapping("/{id}/confirmar")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Confirmar agendamento")
    public ApiResponse<AgendamentoResponse> confirmar(@PathVariable UUID id,
                                                       @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.confirmar(id, extrairUsuarioId(user)));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancelar agendamento")
    public ApiResponse<AgendamentoResponse> cancelar(@PathVariable UUID id,
                                                      @RequestBody(required = false) Map<String, String> body,
                                                      @AuthenticationPrincipal UserDetails user) {
        String motivo = body != null ? body.getOrDefault("motivo", "Cancelado pelo usuário") : "Cancelado pelo usuário";
        return ApiResponse.ok(agendamentoService.cancelar(id, motivo, extrairUsuarioId(user)));
    }

    @PostMapping("/{id}/chegada")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Registrar chegada no pátio")
    public ApiResponse<AgendamentoResponse> registrarChegada(@PathVariable UUID id,
                                                              @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.registrarChegada(id, extrairUsuarioId(user)));
    }

    @PostMapping("/{id}/iniciar-operacao")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Iniciar operação na doca")
    public ApiResponse<AgendamentoResponse> iniciarOperacao(@PathVariable UUID id,
                                                             @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.iniciarOperacao(id, extrairUsuarioId(user)));
    }

    @PostMapping("/{id}/finalizar")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Finalizar operação")
    public ApiResponse<AgendamentoResponse> finalizar(@PathVariable UUID id,
                                                       @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.finalizar(id, extrairUsuarioId(user)));
    }

    @PostMapping("/{id}/no-show")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Registrar no-show")
    public ApiResponse<AgendamentoResponse> noShow(@PathVariable UUID id,
                                                    @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.registrarNoShow(id, extrairUsuarioId(user)));
    }

    private UUID extrairUsuarioId(UserDetails user) {
        if (user instanceof com.rbm.agendamento.domain.entity.Usuario u) return u.getId();
        return null;
    }
}
