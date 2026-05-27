package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.veiculo.VeiculoRequest;
import com.rbm.agendamento.application.dto.veiculo.VeiculoResponse;
import com.rbm.agendamento.domain.entity.Veiculo;
import com.rbm.agendamento.infrastructure.repository.VeiculoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;

    @Transactional(readOnly = true)
    public Page<VeiculoResponse> listar(String busca, Pageable pageable) {
        return veiculoRepository.buscar(busca, pageable).map(VeiculoResponse::from);
    }

    @Transactional(readOnly = true)
    public VeiculoResponse buscarPorId(UUID id) {
        return VeiculoResponse.from(buscarEntidade(id));
    }

    @Transactional
    public VeiculoResponse criar(VeiculoRequest request) {
        if (veiculoRepository.existsByPlaca(request.placa()))
            throw new BusinessException("PLACA_DUPLICADA", "Placa já cadastrada: " + request.placa());
        return VeiculoResponse.from(veiculoRepository.save(mapear(new Veiculo(), request)));
    }

    @Transactional
    public VeiculoResponse atualizar(UUID id, VeiculoRequest request) {
        Veiculo v = buscarEntidade(id);
        if (!v.getPlaca().equals(request.placa()) && veiculoRepository.existsByPlaca(request.placa()))
            throw new BusinessException("PLACA_DUPLICADA", "Placa já cadastrada: " + request.placa());
        return VeiculoResponse.from(veiculoRepository.save(mapear(v, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Veiculo v = buscarEntidade(id);
        v.softDelete();
        veiculoRepository.save(v);
    }

    private Veiculo buscarEntidade(UUID id) {
        return veiculoRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Veículo", id));
    }

    private Veiculo mapear(Veiculo v, VeiculoRequest r) {
        v.setPlaca(r.placa().toUpperCase());
        v.setTipoVeiculo(r.tipoVeiculo());
        v.setTipoCarroceria(r.tipoCarroceria());
        v.setTara(r.tara());
        v.setCapacidadeMaxima(r.capacidadeMaxima());
        v.setRntrc(r.rntrc());
        v.setProprietario(r.proprietario());
        v.setAno(r.ano());
        v.setModelo(r.modelo());
        if (r.ativo() != null) v.setAtivo(r.ativo());
        return v;
    }
}
