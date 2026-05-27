package com.rbm.agendamento.application.dto.disponibilidade;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DisponibilidadeResponse(
        UUID janelaId,
        String janelaNome,
        LocalDate data,
        List<SlotResponse> slots,
        int totalSlots,
        int slotsDisponiveis,
        boolean diaBloqueado
) {}
