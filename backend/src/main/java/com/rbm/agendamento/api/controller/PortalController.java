package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.agendamento.AgendamentoResponse;
import com.rbm.agendamento.application.service.AgendamentoService;
import com.rbm.agendamento.domain.entity.Usuario;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portal")
@RequiredArgsConstructor
@Tag(name = "Portal Transportadora", description = "Portal externo para transportadoras")
public class PortalController {

    private final AgendamentoService agendamentoService;

    @GetMapping("/agendamentos")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CARRIER')")
    @Operation(summary = "Listar agendamentos da transportadora autenticada")
    public ApiResponse<Page<AgendamentoResponse>> listar(
            @RequestParam(required = false) StatusAgendamento status,
            @AuthenticationPrincipal UserDetails user,
            Pageable pageable) {

        UUID transportadoraId = extrairTransportadoraId(user);
        return ApiResponse.ok(agendamentoService.listarPorTransportadora(transportadoraId, status, pageable));
    }

    @GetMapping("/agendamentos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CARRIER')")
    @Operation(summary = "Detalhar agendamento (portal)")
    public ApiResponse<AgendamentoResponse> detalhar(@PathVariable UUID id) {
        return ApiResponse.ok(agendamentoService.buscarPorId(id));
    }

    @PostMapping("/agendamentos/{id}/aceitar")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CARRIER')")
    @Operation(summary = "Aceitar agendamento")
    public ApiResponse<AgendamentoResponse> aceitar(@PathVariable UUID id,
                                                     @AuthenticationPrincipal UserDetails user) {
        return ApiResponse.ok(agendamentoService.aceitar(id, extrairUsuarioId(user)));
    }

    @PostMapping("/agendamentos/{id}/recusar")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CARRIER')")
    @Operation(summary = "Recusar agendamento")
    public ApiResponse<AgendamentoResponse> recusar(@PathVariable UUID id,
                                                     @RequestBody(required = false) Map<String, String> body,
                                                     @AuthenticationPrincipal UserDetails user) {
        String motivo = body != null ? body.getOrDefault("motivo", "Recusado") : "Recusado";
        return ApiResponse.ok(agendamentoService.recusar(id, motivo, extrairUsuarioId(user)));
    }

    private UUID extrairTransportadoraId(UserDetails user) {
        if (user instanceof Usuario u) {
            if (u.getTransportadoraId() == null)
                throw new BusinessException("SEM_TRANSPORTADORA", "Usuário não está vinculado a uma transportadora");
            return u.getTransportadoraId();
        }
        throw new BusinessException("AUTH_ERROR", "Usuário não autenticado corretamente");
    }

    private UUID extrairUsuarioId(UserDetails user) {
        if (user instanceof Usuario u) return u.getId();
        return null;
    }
}
