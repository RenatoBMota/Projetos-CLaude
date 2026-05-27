package com.rbm.agendamento.application.dto.disponibilidade;

import java.time.LocalTime;

public record SlotResponse(
        LocalTime horarioInicio,
        LocalTime horarioFim,
        int capacidade,
        int ocupado,
        int disponivel,
        boolean bloqueado
) {
    public boolean isDisponivel() {
        return !bloqueado && disponivel > 0;
    }
}
