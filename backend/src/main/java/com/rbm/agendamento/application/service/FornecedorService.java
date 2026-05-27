package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.fornecedor.FornecedorRequest;
import com.rbm.agendamento.application.dto.fornecedor.FornecedorResponse;
import com.rbm.agendamento.domain.entity.Fornecedor;
import com.rbm.agendamento.infrastructure.repository.FornecedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FornecedorService {

    private final FornecedorRepository fornecedorRepository;

    @Transactional(readOnly = true)
    public Page<FornecedorResponse> listar(String busca, Pageable pageable) {
        return fornecedorRepository.buscar(busca, pageable).map(FornecedorResponse::from);
    }

    @Transactional(readOnly = true)
    public FornecedorResponse buscarPorId(UUID id) {
        return FornecedorResponse.from(buscarEntidade(id));
    }

    @Transactional
    public FornecedorResponse criar(FornecedorRequest request) {
        if (fornecedorRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());
        return FornecedorResponse.from(fornecedorRepository.save(mapear(new Fornecedor(), request)));
    }

    @Transactional
    public FornecedorResponse atualizar(UUID id, FornecedorRequest request) {
        Fornecedor f = buscarEntidade(id);
        if (!f.getCnpj().equals(request.cnpj()) && fornecedorRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());
        return FornecedorResponse.from(fornecedorRepository.save(mapear(f, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Fornecedor f = buscarEntidade(id);
        f.softDelete();
        fornecedorRepository.save(f);
    }

    private Fornecedor buscarEntidade(UUID id) {
        return fornecedorRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Fornecedor", id));
    }

    private Fornecedor mapear(Fornecedor f, FornecedorRequest r) {
        f.setRazaoSocial(r.razaoSocial());
        f.setNomeFantasia(r.nomeFantasia());
        f.setCnpj(r.cnpj());
        f.setInscricaoEstadual(r.inscricaoEstadual());
        f.setTipoFornecedor(r.tipoFornecedor());
        f.setEmail(r.email());
        f.setTelefone(r.telefone());
        f.setResponsavel(r.responsavel());
        f.setLimiteAgendamentosDia(r.limiteAgendamentosDia());
        f.setSlaDocumental(r.slaDocumental());
        if (r.bloqueioAutomatico() != null) f.setBloqueioAutomatico(r.bloqueioAutomatico());
        if (r.ativo() != null) f.setAtivo(r.ativo());
        return f;
    }
}
