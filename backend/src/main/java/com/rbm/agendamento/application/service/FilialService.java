package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.filial.FilialRequest;
import com.rbm.agendamento.application.dto.filial.FilialResponse;
import com.rbm.agendamento.domain.entity.Filial;
import com.rbm.agendamento.infrastructure.repository.FilialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FilialService {

    private final FilialRepository filialRepository;

    @Transactional(readOnly = true)
    public Page<FilialResponse> listar(String busca, Pageable pageable) {
        return filialRepository.buscar(busca, pageable).map(FilialResponse::from);
    }

    @Transactional(readOnly = true)
    public List<FilialResponse> listarAtivas() {
        return filialRepository.findAllByAtivoTrue().stream().map(FilialResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FilialResponse buscarPorId(UUID id) {
        return FilialResponse.from(buscarEntidade(id));
    }

    @Transactional
    public FilialResponse criar(FilialRequest request) {
        if (filialRepository.existsByCodigo(request.codigo()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de filial já cadastrado: " + request.codigo());
        if (filialRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());

        Filial filial = mapear(new Filial(), request);
        return FilialResponse.from(filialRepository.save(filial));
    }

    @Transactional
    public FilialResponse atualizar(UUID id, FilialRequest request) {
        Filial filial = buscarEntidade(id);

        if (!filial.getCodigo().equals(request.codigo()) && filialRepository.existsByCodigo(request.codigo()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de filial já cadastrado: " + request.codigo());
        if (!filial.getCnpj().equals(request.cnpj()) && filialRepository.existsByCnpj(request.cnpj()))
            throw new BusinessException("CNPJ_DUPLICADO", "CNPJ já cadastrado: " + request.cnpj());

        return FilialResponse.from(filialRepository.save(mapear(filial, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Filial filial = buscarEntidade(id);
        filial.softDelete();
        filialRepository.save(filial);
    }

    private Filial buscarEntidade(UUID id) {
        return filialRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", id));
    }

    private Filial mapear(Filial filial, FilialRequest r) {
        filial.setCodigo(r.codigo());
        filial.setNome(r.nome());
        filial.setRazaoSocial(r.razaoSocial());
        filial.setCnpj(r.cnpj());
        filial.setInscricaoEstadual(r.inscricaoEstadual());
        filial.setEndereco(r.endereco());
        filial.setNumero(r.numero());
        filial.setComplemento(r.complemento());
        filial.setBairro(r.bairro());
        filial.setCidade(r.cidade());
        filial.setUf(r.uf());
        filial.setCep(r.cep());
        filial.setLatitude(r.latitude());
        filial.setLongitude(r.longitude());
        filial.setTelefone(r.telefone());
        filial.setEmail(r.email());
        filial.setHorarioInicio(r.horarioInicio());
        filial.setHorarioFim(r.horarioFim());
        filial.setLimiteDiario(r.limiteDiario());
        filial.setTempoMedioAtendimento(r.tempoMedioAtendimento());
        if (r.ativo() != null) filial.setAtivo(r.ativo());
        return filial;
    }
}
