package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.disponibilidade.DisponibilidadeResponse;
import com.rbm.agendamento.application.service.DisponibilidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/disponibilidade")
@RequiredArgsConstructor
@Tag(name = "Disponibilidade", description = "Consulta de disponibilidade de slots")
public class DisponibilidadeController {

    private final DisponibilidadeService disponibilidadeService;

    @GetMapping("/{janelaId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Consultar disponibilidade de uma janela em uma data")
    public ApiResponse<DisponibilidadeResponse> consultar(
            @PathVariable UUID janelaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return ApiResponse.ok(disponibilidadeService.consultarDisponibilidade(janelaId, data));
    }

    @GetMapping("/{janelaId}/periodo")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Consultar disponibilidade de uma janela em um período de datas")
    public ApiResponse<List<DisponibilidadeResponse>> consultarPeriodo(
            @PathVariable UUID janelaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        List<DisponibilidadeResponse> resultado = new ArrayList<>();
        LocalDate cursor = dataInicio;
        while (!cursor.isAfter(dataFim)) {
            resultado.add(disponibilidadeService.consultarDisponibilidade(janelaId, cursor));
            cursor = cursor.plusDays(1);
        }
        return ApiResponse.ok(resultado);
    }
}
