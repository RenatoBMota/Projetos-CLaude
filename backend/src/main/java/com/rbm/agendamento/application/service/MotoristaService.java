package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.motorista.MotoristaRequest;
import com.rbm.agendamento.application.dto.motorista.MotoristaResponse;
import com.rbm.agendamento.domain.entity.Motorista;
import com.rbm.agendamento.infrastructure.repository.MotoristaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MotoristaService {

    private final MotoristaRepository motoristaRepository;

    @Transactional(readOnly = true)
    public Page<MotoristaResponse> listar(String busca, Pageable pageable) {
        return motoristaRepository.buscar(busca, pageable).map(MotoristaResponse::from);
    }

    @Transactional(readOnly = true)
    public MotoristaResponse buscarPorId(UUID id) {
        return MotoristaResponse.from(buscarEntidade(id));
    }

    @Transactional
    public MotoristaResponse criar(MotoristaRequest request) {
        if (motoristaRepository.existsByCpf(request.cpf()))
            throw new BusinessException("CPF_DUPLICADO", "CPF já cadastrado: " + request.cpf());
        if (motoristaRepository.existsByCnh(request.cnh()))
            throw new BusinessException("CNH_DUPLICADA", "CNH já cadastrada: " + request.cnh());
        return MotoristaResponse.from(motoristaRepository.save(mapear(new Motorista(), request)));
    }

    @Transactional
    public MotoristaResponse atualizar(UUID id, MotoristaRequest request) {
        Motorista m = buscarEntidade(id);
        if (!m.getCpf().equals(request.cpf()) && motoristaRepository.existsByCpf(request.cpf()))
            throw new BusinessException("CPF_DUPLICADO", "CPF já cadastrado: " + request.cpf());
        if (!m.getCnh().equals(request.cnh()) && motoristaRepository.existsByCnh(request.cnh()))
            throw new BusinessException("CNH_DUPLICADA", "CNH já cadastrada: " + request.cnh());
        return MotoristaResponse.from(motoristaRepository.save(mapear(m, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Motorista m = buscarEntidade(id);
        m.softDelete();
        motoristaRepository.save(m);
    }

    private Motorista buscarEntidade(UUID id) {
        return motoristaRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Motorista", id));
    }

    private Motorista mapear(Motorista m, MotoristaRequest r) {
        m.setNome(r.nome());
        m.setCpf(r.cpf());
        m.setRg(r.rg());
        m.setCnh(r.cnh());
        m.setCategoriaCnh(r.categoriaCnh());
        m.setValidadeCnh(r.validadeCnh());
        m.setTelefone(r.telefone());
        m.setDataNascimento(r.dataNascimento());
        m.setNacionalidade(r.nacionalidade() != null ? r.nacionalidade() : "Brasileiro");
        if (r.ativo() != null) m.setAtivo(r.ativo());
        return m;
    }
}
