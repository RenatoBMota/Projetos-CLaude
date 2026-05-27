package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.transportadora.*;
import com.rbm.agendamento.domain.entity.Transportadora;
import com.rbm.agendamento.domain.entity.TransportadoraContato;
import com.rbm.agendamento.infrastructure.repository.TransportadoraContatoRepository;
import com.rbm.agendamento.infrastructure.repository.TransportadoraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransportadoraService {

    private final TransportadoraRepository transportadoraRepository;
    private final TransportadoraContatoRepository contatoRepository;

    @Transactional(readOnly = true)
    public Page<TransportadoraResponse> listar(String busca, Pageable pageable) {
        return transportadoraRepository.buscar(busca, pageable).map(TransportadoraResponse::from);
    }

    @Transactional(readOnly = true)
    public TransportadoraResponse buscarPorId(UUID id) {
        return TransportadoraResponse.from(buscarEntidade(id));
    }

    @Transactional
    public TransportadoraResponse criar(TransportadoraRequest request) {
        if (transportadoraRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());
        return TransportadoraResponse.from(transportadoraRepository.save(mapear(new Transportadora(), request)));
    }

    @Transactional
    public TransportadoraResponse atualizar(UUID id, TransportadoraRequest request) {
        Transportadora t = buscarEntidade(id);
        if (!t.getCnpj().equals(request.cnpj()) && transportadoraRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());
        return TransportadoraResponse.from(transportadoraRepository.save(mapear(t, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Transportadora t = buscarEntidade(id);
        t.softDelete();
        transportadoraRepository.save(t);
    }

    @Transactional
    public TransportadoraResponse bloquear(UUID id, String motivo) {
        Transportadora t = buscarEntidade(id);
        t.setBloqueada(true);
        t.setMotivoBloqueio(motivo);
        return TransportadoraResponse.from(transportadoraRepository.save(t));
    }

    @Transactional
    public TransportadoraResponse desbloquear(UUID id) {
        Transportadora t = buscarEntidade(id);
        t.setBloqueada(false);
        t.setMotivoBloqueio(null);
        return TransportadoraResponse.from(transportadoraRepository.save(t));
    }

    @Transactional(readOnly = true)
    public List<ContatoResponse> listarContatos(UUID id) {
        buscarEntidade(id);
        return contatoRepository.findByTransportadoraIdAndAtivoTrue(id)
                .stream().map(ContatoResponse::from).toList();
    }

    @Transactional
    public ContatoResponse adicionarContato(UUID id, ContatoRequest request) {
        Transportadora t = buscarEntidade(id);
        TransportadoraContato contato = TransportadoraContato.builder()
                .transportadora(t)
                .nome(request.nome())
                .email(request.email())
                .telefone(request.telefone())
                .cargo(request.cargo())
                .ativo(true)
                .build();
        return ContatoResponse.from(contatoRepository.save(contato));
    }

    @Transactional
    public void removerContato(UUID transportadoraId, UUID contatoId) {
        buscarEntidade(transportadoraId);
        TransportadoraContato contato = contatoRepository.findById(contatoId)
                .orElseThrow(() -> ResourceNotFoundException.of("Contato", contatoId));
        contato.setAtivo(false);
        contatoRepository.save(contato);
    }

    private Transportadora buscarEntidade(UUID id) {
        return transportadoraRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Transportadora", id));
    }

    private Transportadora mapear(Transportadora t, TransportadoraRequest r) {
        t.setRazaoSocial(r.razaoSocial());
        t.setNomeFantasia(r.nomeFantasia());
        t.setCnpj(r.cnpj());
        t.setInscricaoEstadual(r.inscricaoEstadual());
        t.setNacionalidade(r.nacionalidade() != null ? r.nacionalidade() : "Brasileira");
        t.setTipoOperacao(r.tipoOperacao());
        t.setEmail(r.email());
        t.setTelefone(r.telefone());
        t.setResponsavel(r.responsavel());
        t.setSlaPersonalizado(r.slaPersonalizado());
        t.setPrioridade(r.prioridade() != null ? r.prioridade() : 0);
        if (r.ativo() != null) t.setAtivo(r.ativo());
        return t;
    }
}
