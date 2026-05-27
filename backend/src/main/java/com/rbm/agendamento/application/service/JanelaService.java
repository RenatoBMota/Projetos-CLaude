package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.janela.JanelaRequest;
import com.rbm.agendamento.application.dto.janela.JanelaResponse;
import com.rbm.agendamento.domain.entity.*;
import com.rbm.agendamento.infrastructure.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JanelaService {

    private final JanelaRepository janelaRepository;
    private final FilialRepository filialRepository;
    private final DocaRepository docaRepository;

    @Transactional(readOnly = true)
    public Page<JanelaResponse> listarPorFilial(UUID filialId, String busca, Pageable pageable) {
        return janelaRepository.buscarPorFilial(filialId, busca, pageable).map(JanelaResponse::from);
    }

    @Transactional(readOnly = true)
    public List<JanelaResponse> listarAtivasPorFilial(UUID filialId) {
        return janelaRepository.findByFilialIdAndAtivoTrue(filialId)
                .stream().map(JanelaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public JanelaResponse buscarPorId(UUID id) {
        return JanelaResponse.from(buscarEntidade(id));
    }

    @Transactional
    public JanelaResponse criar(JanelaRequest request) {
        if (janelaRepository.existsByNomeAndFilialId(request.nome(), request.filialId()))
            throw new BusinessException("NOME_DUPLICADO", "Janela com este nome já existe nesta filial");

        Filial filial = filialRepository.findById(request.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", request.filialId()));

        Janela janela = mapear(new Janela(), request, filial);
        return JanelaResponse.from(janelaRepository.save(janela));
    }

    @Transactional
    public JanelaResponse atualizar(UUID id, JanelaRequest request) {
        Janela janela = buscarEntidade(id);
        Filial filial = filialRepository.findById(request.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", request.filialId()));

        if (!janela.getNome().equals(request.nome()) &&
                janelaRepository.existsByNomeAndFilialId(request.nome(), request.filialId()))
            throw new BusinessException("NOME_DUPLICADO", "Janela com este nome já existe nesta filial");

        return JanelaResponse.from(janelaRepository.save(mapear(janela, request, filial)));
    }

    @Transactional
    public void excluir(UUID id) {
        Janela janela = buscarEntidade(id);
        janela.softDelete();
        janelaRepository.save(janela);
    }

    public Janela buscarEntidade(UUID id) {
        return janelaRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Janela", id));
    }

    private Janela mapear(Janela janela, JanelaRequest r, Filial filial) {
        janela.setNome(r.nome());
        janela.setTipoProcesso(r.tipoProcesso());
        janela.setDescricao(r.descricao());
        janela.setPrioridade(r.prioridade() != null ? r.prioridade() : 0);
        janela.setFilial(filial);
        janela.setAreaOperacional(r.areaOperacional());
        janela.setCapacidadeSimultanea(r.capacidadeSimultanea() != null ? r.capacidadeSimultanea() : 1);
        janela.setDuracaoAtendimento(r.duracaoAtendimento());
        janela.setHorarioInicio(r.horarioInicio());
        janela.setHorarioFim(r.horarioFim());
        janela.setSlaAtraso(r.slaAtraso());
        janela.setTempoReagendamento(r.tempoReagendamento() != null ? r.tempoReagendamento() : 24);
        janela.setTempoCancelamento(r.tempoCancelamento() != null ? r.tempoCancelamento() : 4);
        janela.setTempoEdicaoTerceiros(r.tempoEdicaoTerceiros() != null ? r.tempoEdicaoTerceiros() : 48);
        janela.setBufferEntreOperacoes(r.bufferEntreOperacoes() != null ? r.bufferEntreOperacoes() : 0);
        janela.setObrigatorioEpi(r.obrigatorioEpi() != null ? r.obrigatorioEpi() : false);
        janela.setObrigatorioNfe(r.obrigatorioNfe() != null ? r.obrigatorioNfe() : true);
        janela.setObrigatorioXml(r.obrigatorioXml() != null ? r.obrigatorioXml() : false);
        janela.setObrigatorioLacre(r.obrigatorioLacre() != null ? r.obrigatorioLacre() : false);
        janela.setObrigatorioFotoCarga(r.obrigatorioFotoCarga() != null ? r.obrigatorioFotoCarga() : false);
        janela.setAceiteObrigatorio(r.aceiteObrigatorio() != null ? r.aceiteObrigatorio() : false);
        janela.setQuemAprova(r.quemAprova());
        janela.setSlaAprovacao(r.slaAprovacao());
        janela.setAprovacaoAutomatica(r.aprovacaoAutomatica() != null ? r.aprovacaoAutomatica() : false);
        if (r.ativo() != null) janela.setAtivo(r.ativo());

        if (r.docaId() != null) {
            Doca doca = docaRepository.findById(r.docaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Doca", r.docaId()));
            janela.setDoca(doca);
        } else {
            janela.setDoca(null);
        }

        janela.getRestritores().clear();
        if (r.restritores() != null) {
            r.restritores().forEach(rr -> {
                JanelaRestritor restritor = JanelaRestritor.builder()
                        .janela(janela)
                        .tipo(rr.tipo())
                        .valor(rr.valor())
                        .build();
                janela.getRestritores().add(restritor);
            });
        }

        return janela;
    }
}
