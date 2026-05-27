package com.rbm.agendamento.application.service;

import com.rbm.agendamento.application.dto.disponibilidade.DisponibilidadeResponse;
import com.rbm.agendamento.application.dto.disponibilidade.SlotResponse;
import com.rbm.agendamento.domain.entity.Bloqueio;
import com.rbm.agendamento.domain.entity.Janela;
import com.rbm.agendamento.domain.enums.StatusAgendamento;
import com.rbm.agendamento.infrastructure.repository.AgendamentoRepository;
import com.rbm.agendamento.infrastructure.repository.BloqueioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DisponibilidadeService {

    private static final List<StatusAgendamento> STATUS_EXCLUIDOS = List.of(
            StatusAgendamento.CANCELADO, StatusAgendamento.NO_SHOW
    );

    private final JanelaService janelaService;
    private final AgendamentoRepository agendamentoRepository;
    private final BloqueioRepository bloqueioRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Transactional(readOnly = true)
    public DisponibilidadeResponse consultarDisponibilidade(UUID janelaId, LocalDate data) {
        Janela janela = janelaService.buscarEntidade(janelaId);

        List<Bloqueio> bloqueios = bloqueioRepository.findAtivosParaData(
                janela.getFilial().getId(), data,
                janelaId,
                janela.getDoca() != null ? janela.getDoca().getId() : null
        );

        boolean diaBloqueado = bloqueios.stream()
                .anyMatch(b -> b.getHorarioInicio() == null && b.getHorarioFim() == null);

        List<SlotResponse> slots = gerarSlots(janela, data, bloqueios, diaBloqueado);

        long slotsDisponiveis = slots.stream().filter(SlotResponse::isDisponivel).count();

        return new DisponibilidadeResponse(
                janelaId,
                janela.getNome(),
                data,
                slots,
                slots.size(),
                (int) slotsDisponiveis,
                diaBloqueado
        );
    }

    private List<SlotResponse> gerarSlots(Janela janela, LocalDate data,
                                           List<Bloqueio> bloqueios, boolean diaBloqueado) {
        List<SlotResponse> slots = new ArrayList<>();
        LocalTime cursor = janela.getHorarioInicio();
        int duracao = janela.getDuracaoAtendimento();
        int buffer = janela.getBufferEntreOperacoes();

        while (cursor.plusMinutes(duracao).compareTo(janela.getHorarioFim()) <= 0) {
            LocalTime fimSlot = cursor.plusMinutes(duracao);
            boolean bloqueado = diaBloqueado || isSlotBloqueado(cursor, fimSlot, bloqueios);

            int ocupado = 0;
            if (!bloqueado) {
                LocalTime horarioFinal = cursor;
                ocupado = (int) agendamentoRepository.countOcupacao(
                        janela.getId(), data, horarioFinal, STATUS_EXCLUIDOS);
            }

            int disponivel = Math.max(0, janela.getCapacidadeSimultanea() - ocupado);
            slots.add(new SlotResponse(cursor, fimSlot, janela.getCapacidadeSimultanea(),
                    ocupado, disponivel, bloqueado));

            cursor = fimSlot.plusMinutes(buffer);
        }

        return slots;
    }

    private boolean isSlotBloqueado(LocalTime inicio, LocalTime fim, List<Bloqueio> bloqueios) {
        return bloqueios.stream()
                .filter(b -> b.getHorarioInicio() != null && b.getHorarioFim() != null)
                .anyMatch(b -> inicio.isBefore(b.getHorarioFim()) && fim.isAfter(b.getHorarioInicio()));
    }

    public boolean tentarAcquireLock(UUID janelaId, LocalDate data, LocalTime horario) {
        String key = buildLockKey(janelaId, data, horario);
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(key, "locked", Duration.ofSeconds(30));
        return Boolean.TRUE.equals(acquired);
    }

    public void releaseLock(UUID janelaId, LocalDate data, LocalTime horario) {
        String key = buildLockKey(janelaId, data, horario);
        redisTemplate.delete(key);
    }

    private String buildLockKey(UUID janelaId, LocalDate data, LocalTime horario) {
        return String.format("slot:lock:%s:%s:%s", janelaId, data, horario);
    }
}
