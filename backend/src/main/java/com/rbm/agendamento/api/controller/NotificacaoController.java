package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.notificacao.NotificacaoLogResponse;
import com.rbm.agendamento.infrastructure.repository.NotificacaoLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notificacoes")
@RequiredArgsConstructor
@Tag(name = "Notificações", description = "Log de notificações enviadas")
public class NotificacaoController {

    private final NotificacaoLogRepository logRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','AUDIT')")
    @Operation(summary = "Listar log de notificações")
    public ApiResponse<Page<NotificacaoLogResponse>> listar(
            @RequestParam(required = false) String canal,
            Pageable pageable) {
        Page<NotificacaoLogResponse> page = canal != null
                ? logRepository.findByCanalOrderByCriadoEmDesc(canal.toUpperCase(), pageable)
                        .map(NotificacaoLogResponse::from)
                : logRepository.findByOrderByCriadoEmDesc(pageable)
                        .map(NotificacaoLogResponse::from);
        return ApiResponse.ok(page);
    }

    @GetMapping("/agendamento/{agendamentoId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR','AUDIT')")
    @Operation(summary = "Listar notificações por agendamento")
    public ApiResponse<Page<NotificacaoLogResponse>> porAgendamento(
            @PathVariable UUID agendamentoId, Pageable pageable) {
        return ApiResponse.ok(
                logRepository.findByAgendamentoIdOrderByCriadoEmDesc(agendamentoId, pageable)
                        .map(NotificacaoLogResponse::from)
        );
    }
}
