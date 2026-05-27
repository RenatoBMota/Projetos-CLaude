package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.api.exception.ResourceNotFoundException;
import com.rbm.agendamento.application.dto.doca.DocaRequest;
import com.rbm.agendamento.application.dto.doca.DocaResponse;
import com.rbm.agendamento.domain.entity.Doca;
import com.rbm.agendamento.domain.entity.Filial;
import com.rbm.agendamento.infrastructure.repository.DocaRepository;
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
public class DocaService {

    private final DocaRepository docaRepository;
    private final FilialRepository filialRepository;

    @Transactional(readOnly = true)
    public Page<DocaResponse> listarPorFilial(UUID filialId, String busca, Pageable pageable) {
        return docaRepository.buscarPorFilial(filialId, busca, pageable).map(DocaResponse::from);
    }

    @Transactional(readOnly = true)
    public List<DocaResponse> listarAtivasPorFilial(UUID filialId) {
        return docaRepository.findByFilialIdAndAtivoTrue(filialId).stream().map(DocaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public DocaResponse buscarPorId(UUID id) {
        return DocaResponse.from(buscarEntidade(id));
    }

    @Transactional
    public DocaResponse criar(DocaRequest request) {
        if (docaRepository.existsByCodigoAndFilialId(request.codigo(), request.filialId()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de doca já cadastrado nesta filial");

        Filial filial = filialRepository.findById(request.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", request.filialId()));

        Doca doca = mapear(new Doca(), request, filial);
        return DocaResponse.from(docaRepository.save(doca));
    }

    @Transactional
    public DocaResponse atualizar(UUID id, DocaRequest request) {
        Doca doca = buscarEntidade(id);
        Filial filial = filialRepository.findById(request.filialId())
                .orElseThrow(() -> ResourceNotFoundException.of("Filial", request.filialId()));

        if (!doca.getCodigo().equals(request.codigo()) &&
                docaRepository.existsByCodigoAndFilialId(request.codigo(), request.filialId()))
            throw new BusinessException("CODIGO_DUPLICADO", "Código de doca já cadastrado nesta filial");

        return DocaResponse.from(docaRepository.save(mapear(doca, request, filial)));
    }

    @Transactional
    public void excluir(UUID id) {
        Doca doca = buscarEntidade(id);
        doca.softDelete();
        docaRepository.save(doca);
    }

    private Doca buscarEntidade(UUID id) {
        return docaRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Doca", id));
    }

    private Doca mapear(Doca doca, DocaRequest r, Filial filial) {
        doca.setCodigo(r.codigo());
        doca.setDescricao(r.descricao());
        doca.setTipo(r.tipo());
        doca.setFilial(filial);
        doca.setCapacidadeSimultanea(r.capacidadeSimultanea() != null ? r.capacidadeSimultanea() : 1);
        doca.setPesoMaximo(r.pesoMaximo());
        doca.setAlturaMaxima(r.alturaMaxima());
        doca.setComprimentoMaximo(r.comprimentoMaximo());
        doca.setTiposCargaPermitida(r.tiposCargaPermitida());
        if (r.ativo() != null) doca.setAtivo(r.ativo());
        return doca;
    }
}
