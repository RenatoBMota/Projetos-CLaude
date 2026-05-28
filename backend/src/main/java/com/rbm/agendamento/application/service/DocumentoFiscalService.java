package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.agendamento.DocumentoResponse;
import com.rbm.agendamento.application.dto.checklist.ChecklistDocumentalResponse;
import com.rbm.agendamento.domain.entity.*;
import com.rbm.agendamento.domain.enums.StatusValidacaoDocumento;
import com.rbm.agendamento.infrastructure.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentoFiscalService {

    private static final int URL_EXPIRACAO_MINUTOS = 30;

    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoDocumentoRepository documentoRepository;
    private final ChecklistDocumentalRepository checklistRepository;
    private final MinioService minioService;
    private final NFeXmlParserService nfeParser;

    @Transactional(readOnly = true)
    public List<DocumentoResponse> listar(UUID agendamentoId) {
        buscarAgendamento(agendamentoId);
        return documentoRepository.findByAgendamentoId(agendamentoId)
                .stream().map(DocumentoResponse::from).toList();
    }

    @Transactional
    public DocumentoResponse upload(UUID agendamentoId, MultipartFile arquivo,
                                     String tipoDocumento, UUID usuarioId) {
        Agendamento agendamento = buscarAgendamento(agendamentoId);

        if (arquivo.isEmpty())
            throw new BusinessException("ARQUIVO_VAZIO", "O arquivo não pode estar vazio");

        String objectName = buildObjectName(agendamentoId, tipoDocumento, arquivo.getOriginalFilename());
        String contentType = arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream";

        try {
            minioService.upload(
                    minioService.getBucketDocumentos(),
                    objectName,
                    arquivo.getInputStream(),
                    arquivo.getSize(),
                    contentType
            );
        } catch (IOException e) {
            throw new BusinessException("UPLOAD_FALHOU", "Erro ao ler arquivo: " + e.getMessage());
        }

        AgendamentoDocumento documento = AgendamentoDocumento.builder()
                .agendamento(agendamento)
                .tipoDocumento(tipoDocumento)
                .xmlPath(objectName)
                .nomeArquivo(arquivo.getOriginalFilename())
                .tamanhoArquivo(arquivo.getSize())
                .contentType(contentType)
                .statusValidacao(StatusValidacaoDocumento.PENDENTE)
                .build();

        // Auto-parse NF-e / CT-e XML
        if (isXml(contentType, arquivo.getOriginalFilename())) {
            try {
                nfeParser.parsear(arquivo.getBytes(), tipoDocumento).ifPresent(dados -> {
                    documento.setChaveAcesso(dados.chaveAcesso());
                    documento.setNumero(dados.numero());
                    documento.setSerie(dados.serie());
                    documento.setEmitente(dados.emitente());
                    documento.setDestinatario(dados.destinatario());
                    documento.setValorTotal(dados.valorTotal());
                    documento.setPeso(dados.pesoBruto());
                    documento.setVolumes(dados.volumes());
                    log.info("NF-e/CT-e parseada: chave={}", dados.chaveAcesso());
                });
            } catch (IOException e) {
                log.warn("Falha ao parsear XML automaticamente: {}", e.getMessage());
            }
        }

        AgendamentoDocumento salvo = documentoRepository.save(documento);
        recalcularChecklist(agendamento);
        return DocumentoResponse.from(salvo);
    }

    @Transactional
    public DocumentoResponse validar(UUID agendamentoId, UUID documentoId,
                                      StatusValidacaoDocumento status, String observacao,
                                      UUID usuarioId) {
        buscarAgendamento(agendamentoId);
        AgendamentoDocumento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> ResourceNotFoundException.of("Documento", documentoId));

        if (!doc.getAgendamento().getId().equals(agendamentoId))
            throw new BusinessException("DOCUMENTO_INVALIDO", "Documento não pertence ao agendamento");

        doc.setStatusValidacao(status);
        doc.setObservacaoValidacao(observacao);
        doc.setValidadoEm(LocalDateTime.now());
        doc.setValidadoPor(usuarioId);

        AgendamentoDocumento salvo = documentoRepository.save(doc);
        recalcularChecklist(doc.getAgendamento());
        return DocumentoResponse.from(salvo);
    }

    @Transactional
    public void excluir(UUID agendamentoId, UUID documentoId) {
        buscarAgendamento(agendamentoId);
        AgendamentoDocumento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> ResourceNotFoundException.of("Documento", documentoId));

        if (doc.getXmlPath() != null) {
            minioService.excluir(minioService.getBucketDocumentos(), doc.getXmlPath());
        }
        documentoRepository.delete(doc);
        recalcularChecklist(doc.getAgendamento());
    }

    @Transactional(readOnly = true)
    public String gerarUrlDownload(UUID agendamentoId, UUID documentoId) {
        buscarAgendamento(agendamentoId);
        AgendamentoDocumento doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> ResourceNotFoundException.of("Documento", documentoId));

        if (doc.getXmlPath() == null)
            throw new BusinessException("SEM_ARQUIVO", "Este documento não possui arquivo");

        return minioService.gerarUrlPresignada(
                minioService.getBucketDocumentos(),
                doc.getXmlPath(),
                URL_EXPIRACAO_MINUTOS
        );
    }

    @Transactional(readOnly = true)
    public ChecklistDocumentalResponse consultarChecklist(UUID agendamentoId) {
        Agendamento agendamento = buscarAgendamento(agendamentoId);
        ChecklistDocumental checklist = checklistRepository.findByAgendamentoId(agendamentoId)
                .orElse(criarChecklistVazio(agendamento));
        return toChecklistResponse(checklist, agendamento);
    }

    private void recalcularChecklist(Agendamento agendamento) {
        Janela janela = agendamento.getJanela();
        List<AgendamentoDocumento> docs = documentoRepository.findByAgendamentoId(agendamento.getId());

        boolean nfePresente     = docs.stream().anyMatch(d -> tipoContem(d.getTipoDocumento(), "NFE", "NF_E", "NF-E")
                && d.getStatusValidacao() != StatusValidacaoDocumento.REJEITADO);
        boolean xmlPresente     = docs.stream().anyMatch(d -> d.getXmlPath() != null
                && d.getStatusValidacao() != StatusValidacaoDocumento.REJEITADO);
        boolean lacrePresente   = docs.stream().anyMatch(d -> tipoContem(d.getTipoDocumento(), "LACRE")
                && d.getStatusValidacao() != StatusValidacaoDocumento.REJEITADO);
        boolean fotoPresente    = docs.stream().anyMatch(d -> tipoContem(d.getTipoDocumento(), "FOTO")
                && d.getStatusValidacao() != StatusValidacaoDocumento.REJEITADO);
        boolean epiPresente     = docs.stream().anyMatch(d -> tipoContem(d.getTipoDocumento(), "EPI")
                && d.getStatusValidacao() != StatusValidacaoDocumento.REJEITADO);

        boolean nfeOk    = !janela.getObrigatorioNfe()        || nfePresente;
        boolean xmlOk    = !janela.getObrigatorioXml()        || xmlPresente;
        boolean lacreOk  = !janela.getObrigatorioLacre()      || lacrePresente;
        boolean fotoOk   = !janela.getObrigatorioFotoCarga()  || fotoPresente;
        boolean epiOk    = !janela.getObrigatorioEpi()        || epiPresente;

        StatusValidacaoDocumento statusGeral = (nfeOk && xmlOk && lacreOk && fotoOk && epiOk)
                ? StatusValidacaoDocumento.APROVADO : StatusValidacaoDocumento.PENDENTE;

        ChecklistDocumental checklist = checklistRepository.findByAgendamentoId(agendamento.getId())
                .orElse(ChecklistDocumental.builder().agendamento(agendamento).build());

        checklist.setNfeOk(nfeOk);
        checklist.setXmlOk(xmlOk);
        checklist.setLacreOk(lacreOk);
        checklist.setFotoCargaOk(fotoOk);
        checklist.setEpiOk(epiOk);
        checklist.setStatus(statusGeral);
        checklist.atualizar();
        checklistRepository.save(checklist);
    }

    private ChecklistDocumental criarChecklistVazio(Agendamento agendamento) {
        return ChecklistDocumental.builder().agendamento(agendamento).build();
    }

    private ChecklistDocumentalResponse toChecklistResponse(ChecklistDocumental c, Agendamento agendamento) {
        Janela j = agendamento.getJanela();
        return ChecklistDocumentalResponse.from(c,
                j.getObrigatorioNfe(), j.getObrigatorioXml(),
                j.getObrigatorioLacre(), j.getObrigatorioFotoCarga(), j.getObrigatorioEpi());
    }

    private Agendamento buscarAgendamento(UUID id) {
        return agendamentoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Agendamento", id));
    }

    private String buildObjectName(UUID agendamentoId, String tipo, String nomeOriginal) {
        String ext = (nomeOriginal != null && nomeOriginal.contains("."))
                ? nomeOriginal.substring(nomeOriginal.lastIndexOf('.')) : "";
        return String.format("agendamentos/%s/%s/%s%s",
                agendamentoId, tipo.toLowerCase(), UUID.randomUUID(), ext);
    }

    private boolean isXml(String contentType, String filename) {
        if (contentType != null && (contentType.contains("xml") || contentType.contains("text/plain"))) return true;
        return filename != null && filename.toLowerCase().endsWith(".xml");
    }

    private boolean tipoContem(String tipo, String... termos) {
        if (tipo == null) return false;
        String upper = tipo.toUpperCase();
        for (String t : termos) if (upper.contains(t)) return true;
        return false;
    }
}
