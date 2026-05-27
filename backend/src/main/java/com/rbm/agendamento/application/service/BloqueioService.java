package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.bloqueio.BloqueioRequest;
import com.rbm.agendamento.application.dto.bloqueio.BloqueioResponse;
import com.rbm.agendamento.domain.entity.Bloqueio;
import com.rbm.agendamento.domain.entity.Doca;
import com.rbm.agendamento.domain.entity.Filial;
import com.rbm.agendamento.domain.entity.Janela;
import com.rbm.agendamento.infrastructure.repository.BloqueioRepository;
import com.rbm.agendamento.infrastructure.repository.DocaRepository;
import com.rbm.agendamento.infrastructure.repository.FilialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BloqueioService {

    private final BloqueioRepository bloqueioRepository;
    private final FilialRepository filialRepository;
    private final DocaRepository docaRepository;
    private final JanelaService janelaService;

    @Transactional(readOnly = true)
    public Page<BloqueioResponse> listarPorFilial(UUID filialId, String busca, Pageable pageable) {
        return bloqueioRepository.buscarPorFilial(filialId, busca, pageable).map(BloqueioResponse::from);
    }

    @Transactional(readOnly = true)
    public BloqueioResponse buscarPorId(UUID id) {
        return BloqueioResponse.from(buscarEntidade(id));
    }

    @Transactional
    public BloqueioResponse criar(BloqueioRequest request, UUID criadoPor) {
        validarDatas(request);
        Bloqueio bloqueio = mapear(new Bloqueio(), request);
        bloqueio.setCriadoPor(criadoPor);
        return BloqueioResponse.from(bloqueioRepository.save(bloqueio));
    }

    @Transactional
    public BloqueioResponse atualizar(UUID id, BloqueioRequest request) {
        validarDatas(request);
        Bloqueio bloqueio = buscarEntidade(id);
        return BloqueioResponse.from(bloqueioRepository.save(mapear(bloqueio, request)));
    }

    @Transactional
    public void excluir(UUID id) {
        Bloqueio bloqueio = buscarEntidade(id);
        bloqueio.softDelete();
        bloqueioRepository.save(bloqueio);
    }

    private Bloqueio buscarEntidade(UUID id) {
        return bloqueioRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Bloqueio", id));
    }

    private void validarDatas(BloqueioRequest r) {
        if (r.dataFim().isBefore(r.dataInicio()))
            throw new BusinessException("DATA_INVALIDA", "Data fim deve ser igual ou posterior à data início");
        if (r.horarioInicio() != null && r.horarioFim() != null
                && !r.horarioFim().isAfter(r.horarioInicio()))
            throw new BusinessException("HORARIO_INVALIDO", "Horário fim deve ser posterior ao horário início");
    }

    private Bloqueio mapear(Bloqueio bloqueio, BloqueioRequest r) {
        Filial filial = filialRepository.findById(r.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", r.filialId()));

        bloqueio.setTipo(r.tipo());
        bloqueio.setFilial(filial);
        bloqueio.setDataInicio(r.dataInicio());
        bloqueio.setDataFim(r.dataFim());
        bloqueio.setHorarioInicio(r.horarioInicio());
        bloqueio.setHorarioFim(r.horarioFim());
        bloqueio.setMotivo(r.motivo());
        bloqueio.setObservacao(r.observacao());
        if (r.ativo() != null) bloqueio.setAtivo(r.ativo());

        if (r.docaId() != null) {
            Doca doca = docaRepository.findById(r.docaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Doca", r.docaId()));
            bloqueio.setDoca(doca);
        } else {
            bloqueio.setDoca(null);
        }

        if (r.janelaId() != null) {
            Janela janela = janelaService.buscarEntidade(r.janelaId());
            bloqueio.setJanela(janela);
        } else {
            bloqueio.setJanela(null);
        }

        return bloqueio;
    }
}
