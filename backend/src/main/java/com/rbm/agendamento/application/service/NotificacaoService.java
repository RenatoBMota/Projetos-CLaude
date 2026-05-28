package com.rbm.agendamento.application.service;

import com.rbm.agendamento.domain.entity.Agendamento;
import com.rbm.agendamento.domain.entity.NotificacaoLog;
import com.rbm.agendamento.infrastructure.repository.NotificacaoLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final NotificacaoLogRepository logRepository;

    public void notificarCriado(Agendamento ag) {
        String evento = ag.getStatus() != null && ag.getStatus().name().equals("PENDENTE_ACEITE")
                ? "agendamento.aceite_pendente" : "agendamento.criado";
        notificar(ag, evento);
    }

    public void notificarConfirmado(Agendamento ag) {
        notificar(ag, "agendamento.confirmado");
    }

    public void notificarCancelado(Agendamento ag) {
        notificar(ag, "agendamento.cancelado");
    }

    private void notificar(Agendamento ag, String evento) {
        String dataHora = ag.getDataOperacao().toString().split("T")[0]
                .replace("-", "/")
                + " " + ag.getHorarioInicio();
        String filial = ag.getFilial() != null ? ag.getFilial().getNome() : "–";
        String janela = ag.getJanela() != null ? ag.getJanela().getNome() : "–";

        List<String> emailsDestinatarios = coletarEmails(ag);
        List<String> telefonesDestinatarios = coletarTelefones(ag);

        for (String email : emailsDestinatarios) {
            enviarEmail(ag, evento, email, dataHora, filial, janela);
        }
        for (String tel : telefonesDestinatarios) {
            enviarWhatsApp(ag, evento, tel, dataHora, filial);
        }
    }

    private void enviarEmail(Agendamento ag, String evento, String para,
                              String dataHora, String filial, String janela) {
        String assunto;
        String corpo;

        switch (evento) {
            case "agendamento.criado" -> {
                assunto = "Novo Agendamento – " + ag.getCodigo();
                corpo = emailService.templateAgendamentoCriado(ag.getCodigo(), dataHora, filial, janela,
                        ag.getTipoOperacao() != null ? ag.getTipoOperacao().name() : "–", ag.getObservacoes());
            }
            case "agendamento.aceite_pendente" -> {
                assunto = "Confirmação Necessária – " + ag.getCodigo();
                corpo = emailService.templateAceitePendente(ag.getCodigo(), dataHora, filial, janela,
                        ag.getTipoOperacao() != null ? ag.getTipoOperacao().name() : "–");
            }
            case "agendamento.confirmado" -> {
                assunto = "Agendamento Confirmado – " + ag.getCodigo();
                String motorista = ag.getMotorista() != null ? ag.getMotorista().getNome() : null;
                String placa = ag.getVeiculo() != null ? ag.getVeiculo().getPlaca() : null;
                corpo = emailService.templateAgendamentoConfirmado(ag.getCodigo(), dataHora, filial, motorista, placa);
            }
            case "agendamento.cancelado" -> {
                assunto = "Agendamento Cancelado – " + ag.getCodigo();
                corpo = emailService.templateAgendamentoCancelado(ag.getCodigo(), dataHora, ag.getAceiteMotivo());
            }
            default -> {
                assunto = "Atualização – " + ag.getCodigo();
                corpo = "<p>Evento: " + evento + "</p>";
            }
        }

        NotificacaoLog.NotificacaoLogBuilder logBuilder = NotificacaoLog.builder()
                .agendamentoId(ag.getId())
                .canal("EMAIL")
                .evento(evento)
                .destinatario(para)
                .assunto(assunto)
                .corpo(corpo);

        try {
            emailService.enviar(para, assunto, corpo);
            logRepository.save(logBuilder.status("ENVIADO").build());
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail para {}: {}", para, e.getMessage());
            logRepository.save(logBuilder.status("FALHOU").erro(e.getMessage()).build());
        }
    }

    private void enviarWhatsApp(Agendamento ag, String evento, String telefone,
                                 String dataHora, String filial) {
        String mensagem = whatsAppService.formatarMensagem(evento, ag.getCodigo(), dataHora, filial);

        NotificacaoLog.NotificacaoLogBuilder logBuilder = NotificacaoLog.builder()
                .agendamentoId(ag.getId())
                .canal("WHATSAPP")
                .evento(evento)
                .destinatario(telefone)
                .corpo(mensagem);

        try {
            whatsAppService.enviar(telefone, mensagem);
            logRepository.save(logBuilder.status("ENVIADO").build());
        } catch (Exception e) {
            log.error("Falha ao enviar WhatsApp para {}: {}", telefone, e.getMessage());
            logRepository.save(logBuilder.status("FALHOU").erro(e.getMessage()).build());
        }
    }

    private List<String> coletarEmails(Agendamento ag) {
        List<String> emails = new ArrayList<>();
        if (ag.getTransportadora() != null) {
            String email = ag.getTransportadora().getEmail();
            if (email != null && !email.isBlank()) emails.add(email);
        }
        return emails;
    }

    private List<String> coletarTelefones(Agendamento ag) {
        List<String> telefones = new ArrayList<>();
        if (ag.getMotorista() != null) {
            String tel = ag.getMotorista().getTelefone();
            if (tel != null && !tel.isBlank()) telefones.add(tel);
        }
        if (ag.getTransportadora() != null) {
            String tel = ag.getTransportadora().getTelefone();
            if (tel != null && !tel.isBlank()) telefones.add(tel);
        }
        return telefones;
    }
}
