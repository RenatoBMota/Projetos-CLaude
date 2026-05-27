package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Health", description = "Verificação de saúde da API")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Retorna o status da aplicação")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.ok(Map.of(
                "status", "UP",
                "service", "rbm-agendamento",
                "version", "1.0.0"
        ));
    }
}
