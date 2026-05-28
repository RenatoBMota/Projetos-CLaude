package com.rbm.agendamento.api.controller;

import com.rbm.agendamento.api.response.ApiResponse;
import com.rbm.agendamento.application.dto.agendamento.DocumentoResponse;
import com.rbm.agendamento.application.dto.checklist.ChecklistDocumentalResponse;
import com.rbm.agendamento.application.service.DocumentoFiscalService;
import com.rbm.agendamento.domain.entity.Usuario;
import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agendamentos/{agendamentoId}/documentos")
@RequiredArgsConstructor
@Tag(name = "Documentos Fiscais", description = "Gestão de documentos por agendamento")
public class DocumentoController {

    private final DocumentoFiscalService documentoService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar documentos do agendamento")
    public ApiResponse<List<DocumentoResponse>> listar(@PathVariable UUID agendamentoId) {
        return ApiResponse.ok(documentoService.listar(agendamentoId));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Fazer upload de documento")
    public ApiResponse<DocumentoResponse> upload(
            @PathVariable UUID agendamentoId,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam("tipoDocumento") String tipoDocumento,
            @AuthenticationPrincipal UserDetails user) {
        UUID usuarioId = user instanceof Usuario u ? u.getId() : null;
        return ApiResponse.ok(documentoService.upload(agendamentoId, arquivo, tipoDocumento, usuarioId));
    }

    @PostMapping("/{documentoId}/validar")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Validar ou rejeitar documento")
    public ApiResponse<DocumentoResponse> validar(
            @PathVariable UUID agendamentoId,
            @PathVariable UUID documentoId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails user) {
        StatusValidacaoDocumento status = StatusValidacaoDocumento.valueOf(
                body.getOrDefault("status", "APROVADO").toUpperCase());
        String obs = body.get("observacao");
        UUID usuarioId = user instanceof Usuario u ? u.getId() : null;
        return ApiResponse.ok(documentoService.validar(agendamentoId, documentoId, status, obs, usuarioId));
    }

    @GetMapping("/{documentoId}/download-url")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obter URL de download (válida por 30 minutos)")
    public ApiResponse<Map<String, String>> downloadUrl(
            @PathVariable UUID agendamentoId,
            @PathVariable UUID documentoId) {
        String url = documentoService.gerarUrlDownload(agendamentoId, documentoId);
        return ApiResponse.ok(Map.of("url", url));
    }

    @DeleteMapping("/{documentoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Remover documento")
    public void excluir(@PathVariable UUID agendamentoId, @PathVariable UUID documentoId) {
        documentoService.excluir(agendamentoId, documentoId);
    }

    @GetMapping("/checklist")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Consultar checklist documental do agendamento")
    public ApiResponse<ChecklistDocumentalResponse> checklist(@PathVariable UUID agendamentoId) {
        return ApiResponse.ok(documentoService.consultarChecklist(agendamentoId));
    }
}
