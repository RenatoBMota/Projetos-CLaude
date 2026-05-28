package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.agendamento.AgendamentoRequest;
import com.rbm.agendamento.application.dto.agendamento.AgendamentoResponse;
import com.rbm.agendamento.domain.entity.*;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import com.rbm.agendamento.domain.enums.TipoAgendamento;
import com.rbm.agendamento.infrastructure.messaging.AgendamentoEventPublisher;
import com.rbm.agendamento.infrastructure.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgendamentoService {

    private static final List<StatusAgendamento> STATUS_EXCLUIDOS = List.of(
            StatusAgendamento.CANCELADO, StatusAgendamento.NO_SHOW
    );

    private final AgendamentoRepository agendamentoRepository;
    private final FilialRepository filialRepository;
    private final DocaRepository docaRepository;
    private final MotoristaRepository motoristaRepository;
    private final VeiculoRepository veiculoRepository;
    private final TransportadoraRepository transportadoraRepository;
    private final FornecedorRepository fornecedorRepository;
    private final JanelaService janelaService;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listar(UUID filialId, StatusAgendamento status,
                                             LocalDate dataInicio, LocalDate dataFim,
                                             String busca, Pageable pageable) {
        return agendamentoRepository.buscar(filialId, status, dataInicio, dataFim, busca, pageable)
                .map(AgendamentoResponse::from);
    }

    @Transactional(readOnly = true)
    public AgendamentoResponse buscarPorId(UUID id) {
        return AgendamentoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public AgendamentoResponse criar(AgendamentoRequest request, UUID criadoPor) {
        Janela janela = janelaService.buscarEntidade(request.janelaId());
        LocalTime horarioFim = request.horarioInicio().plusMinutes(janela.getDuracaoAtendimento());

        boolean lockAcquired = disponibilidadeService.tentarAcquireLock(
                janela.getId(), request.dataOperacao(), request.horarioInicio());

        if (!lockAcquired)
            throw new BusinessException("SLOT_OCUPADO", "Slot em processo de reserva. Tente novamente.");

        try {
            long ocupado = agendamentoRepository.countOcupacao(
                    janela.getId(), request.dataOperacao(), request.horarioInicio(), STATUS_EXCLUIDOS);

            if (ocupado >= janela.getCapacidadeSimultanea())
                throw new BusinessException("SEM_VAGAS", "Não há vagas disponíveis para este horário");

            Agendamento agendamento = construirAgendamento(request, janela, horarioFim, criadoPor);
            if (Boolean.TRUE.equals(janela.getAceiteObrigatorio())
                    && !Boolean.TRUE.equals(janela.getAprovacaoAutomatica())) {
                agendamento.setStatus(StatusAgendamento.PENDENTE_ACEITE);
            }
            agendamento = agendamentoRepository.save(agendamento);

            registrarHistorico(agendamento, null, agendamento.getStatus(), "Agendamento criado", criadoPor);
            agendamentoRepository.save(agendamento);

            eventPublisher.publicarCriado(agendamento);
            return AgendamentoResponse.from(agendamento);
        } finally {
            disponibilidadeService.releaseLock(janela.getId(), request.dataOperacao(), request.horarioInicio());
        }
    }

    @Transactional
    public AgendamentoResponse confirmar(UUID id, UUID usuarioId) {
        return mudarStatus(id, StatusAgendamento.CONFIRMADO, "Agendamento confirmado", usuarioId);
    }

    @Transactional
    public AgendamentoResponse aceitar(UUID id, UUID usuarioId) {
        Agendamento agendamento = buscarEntidade(id);
        if (agendamento.getStatus() != StatusAgendamento.PENDENTE_ACEITE)
            throw new BusinessException("STATUS_INVALIDO", "Somente agendamentos PENDENTE_ACEITE podem ser aceitos");

        StatusAgendamento anterior = agendamento.getStatus();
        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento.setAceiteEm(java.time.LocalDateTime.now());
        agendamento.setAceitePor(usuarioId);
        registrarHistorico(agendamento, anterior, StatusAgendamento.CONFIRMADO, "Aceito pela transportadora", usuarioId);
        Agendamento salvo = agendamentoRepository.save(agendamento);
        eventPublisher.publicarConfirmado(salvo);
        eventPublisher.publicarIntegracaoYms("CONFIRMADO", salvo);
        return AgendamentoResponse.from(salvo);
    }

    @Transactional
    public AgendamentoResponse recusar(UUID id, String motivo, UUID usuarioId) {
        Agendamento agendamento = buscarEntidade(id);
        if (agendamento.getStatus() != StatusAgendamento.PENDENTE_ACEITE)
            throw new BusinessException("STATUS_INVALIDO", "Somente agendamentos PENDENTE_ACEITE podem ser recusados");

        StatusAgendamento anterior = agendamento.getStatus();
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setAceiteEm(java.time.LocalDateTime.now());
        agendamento.setAceitePor(usuarioId);
        agendamento.setAceiteMotivo(motivo);
        registrarHistorico(agendamento, anterior, StatusAgendamento.CANCELADO,
                "Recusado pela transportadora: " + motivo, usuarioId);
        Agendamento salvo = agendamentoRepository.save(agendamento);
        eventPublisher.publicarCancelado(salvo);
        return AgendamentoResponse.from(salvo);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AgendamentoResponse> listarPorTransportadora(
            UUID transportadoraId, StatusAgendamento status,
            org.springframework.data.domain.Pageable pageable) {
        return agendamentoRepository.findByTransportadora(transportadoraId, status, pageable)
                .map(AgendamentoResponse::from);
    }

    @Transactional
    public AgendamentoResponse cancelar(UUID id, String motivo, UUID usuarioId) {
        Agendamento agendamento = buscarEntidade(id);
        StatusAgendamento statusAnterior = agendamento.getStatus();

        if (statusAnterior == StatusAgendamento.CANCELADO)
            throw new BusinessException("JA_CANCELADO", "Agendamento já está cancelado");
        if (statusAnterior == StatusAgendamento.FINALIZADO)
            throw new BusinessException("FINALIZADO", "Agendamento finalizado não pode ser cancelado");

        agendamento.setStatus(StatusAgendamento.CANCELADO);
        registrarHistorico(agendamento, statusAnterior, StatusAgendamento.CANCELADO, motivo, usuarioId);
        agendamento = agendamentoRepository.save(agendamento);

        eventPublisher.publicarCancelado(agendamento);
        eventPublisher.publicarIntegracaoYms("CANCELADO", agendamento);
        return AgendamentoResponse.from(agendamento);
    }

    @Transactional
    public AgendamentoResponse registrarChegada(UUID id, UUID usuarioId) {
        return mudarStatus(id, StatusAgendamento.CHEGADA_PATIO, "Chegada ao pátio registrada", usuarioId);
    }

    @Transactional
    public AgendamentoResponse iniciarOperacao(UUID id, UUID usuarioId) {
        return mudarStatus(id, StatusAgendamento.EM_OPERACAO, "Operação iniciada", usuarioId);
    }

    @Transactional
    public AgendamentoResponse finalizar(UUID id, UUID usuarioId) {
        return mudarStatus(id, StatusAgendamento.FINALIZADO, "Operação finalizada", usuarioId);
    }

    @Transactional
    public AgendamentoResponse registrarNoShow(UUID id, UUID usuarioId) {
        Agendamento agendamento = buscarEntidade(id);
        StatusAgendamento statusAnterior = agendamento.getStatus();
        agendamento.setStatus(StatusAgendamento.NO_SHOW);
        agendamento.setNoShow(true);
        registrarHistorico(agendamento, statusAnterior, StatusAgendamento.NO_SHOW, "No-show registrado", usuarioId);
        return AgendamentoResponse.from(agendamentoRepository.save(agendamento));
    }

    private AgendamentoResponse mudarStatus(UUID id, StatusAgendamento novoStatus, String obs, UUID usuarioId) {
        Agendamento agendamento = buscarEntidade(id);
        StatusAgendamento statusAnterior = agendamento.getStatus();
        agendamento.setStatus(novoStatus);
        registrarHistorico(agendamento, statusAnterior, novoStatus, obs, usuarioId);
        Agendamento salvo = agendamentoRepository.save(agendamento);
        if (novoStatus == StatusAgendamento.CONFIRMADO) eventPublisher.publicarConfirmado(salvo);
        return AgendamentoResponse.from(salvo);
    }

    private void registrarHistorico(Agendamento agendamento, StatusAgendamento anterior,
                                     StatusAgendamento novo, String obs, UUID usuarioId) {
        AgendamentoHistorico historico = AgendamentoHistorico.builder()
                .agendamento(agendamento)
                .statusAnterior(anterior)
                .statusNovo(novo)
                .observacao(obs)
                .usuarioId(usuarioId)
                .build();
        agendamento.getHistorico().add(historico);
    }

    private Agendamento construirAgendamento(AgendamentoRequest r, Janela janela,
                                              LocalTime horarioFim, UUID criadoPor) {
        Filial filial = filialRepository.findById(r.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", r.filialId()));

        Agendamento.AgendamentoBuilder builder = Agendamento.builder()
                .codigo(gerarCodigo(r.dataOperacao()))
                .tipo(r.tipo() != null ? r.tipo() : TipoAgendamento.AGENDAMENTO)
                .tipoOperacao(r.tipoOperacao())
                .status(StatusAgendamento.CRIADO)
                .filial(filial)
                .janela(janela)
                .dataOperacao(r.dataOperacao())
                .horarioInicio(r.horarioInicio())
                .horarioFim(horarioFim)
                .pesoBruto(r.pesoBruto())
                .pesoLiquido(r.pesoLiquido())
                .cubagem(r.cubagem())
                .volumes(r.volumes())
                .observacoes(r.observacoes())
                .criadoPor(criadoPor);

        if (r.docaId() != null)
            builder.doca(docaRepository.findById(r.docaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Doca", r.docaId())));
        if (r.transportadoraId() != null)
            builder.transportadora(transportadoraRepository.findById(r.transportadoraId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Transportadora", r.transportadoraId())));
        if (r.fornecedorId() != null)
            builder.fornecedor(fornecedorRepository.findById(r.fornecedorId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Fornecedor", r.fornecedorId())));
        if (r.motoristaId() != null)
            builder.motorista(motoristaRepository.findById(r.motoristaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Motorista", r.motoristaId())));
        if (r.veiculoId() != null)
            builder.veiculo(veiculoRepository.findById(r.veiculoId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Veiculo", r.veiculoId())));

        Agendamento agendamento = builder.build();

        if (r.documentos() != null) {
            r.documentos().forEach(dr -> {
                AgendamentoDocumento doc = AgendamentoDocumento.builder()
                        .agendamento(agendamento)
                        .tipoDocumento(dr.tipoDocumento())
                        .numero(dr.numero())
                        .serie(dr.serie())
                        .chaveAcesso(dr.chaveAcesso())
                        .emitente(dr.emitente())
                        .destinatario(dr.destinatario())
                        .peso(dr.peso())
                        .volumes(dr.volumes())
                        .build();
                agendamento.getDocumentos().add(doc);
            });
        }

        return agendamento;
    }

    private synchronized String gerarCodigo(LocalDate data) {
        String prefixo = "RBM-" + data.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        Integer maxSeq = agendamentoRepository.findMaxSequencial(prefixo);
        int proximo = (maxSeq != null ? maxSeq : 0) + 1;
        return prefixo + String.format("%06d", proximo);
    }

    private Agendamento buscarEntidade(UUID id) {
        return agendamentoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Agendamento", id));
    }
}
