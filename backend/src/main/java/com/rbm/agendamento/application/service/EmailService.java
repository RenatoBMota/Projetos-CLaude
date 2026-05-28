package com.rbm.agendamento.application.service;

import com.rbm.agendamento.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    public void enviar(String para, String assunto, String corpoHtml) {
        AppProperties.Notification.Email cfg = appProperties.notification().email();
        if (!cfg.enabled()) {
            log.debug("E-mail desativado — ignorando envio para {}", para);
            return;
        }
        try {
            var msg = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(cfg.from(), cfg.fromName());
            helper.setTo(para);
            helper.setSubject(assunto);
            helper.setText(corpoHtml, true);
            mailSender.send(msg);
            log.info("E-mail enviado para {} — assunto: {}", para, assunto);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail para {}: {}", para, e.getMessage());
            throw new RuntimeException("Falha ao enviar e-mail: " + e.getMessage(), e);
        }
    }

    // ─── Templates ───────────────────────────────────────────────────────────

    public String templateAgendamentoCriado(String codigo, String dataHora, String filial, String janela,
                                             String tipoOperacao, String observacoes) {
        return base(
            "Novo Agendamento: " + codigo,
            "#3b82f6",
            "Novo agendamento criado",
            String.format("""
                <p>Um novo agendamento foi registrado no sistema <strong>RBM Logistics</strong>.</p>
                <table>
                  <tr><td><strong>Código</strong></td><td>%s</td></tr>
                  <tr><td><strong>Data / Horário</strong></td><td>%s</td></tr>
                  <tr><td><strong>Filial</strong></td><td>%s</td></tr>
                  <tr><td><strong>Janela</strong></td><td>%s</td></tr>
                  <tr><td><strong>Operação</strong></td><td>%s</td></tr>
                  %s
                </table>
                """,
                codigo, dataHora, filial, janela, tipoOperacao,
                observacoes != null ? "<tr><td><strong>Obs.</strong></td><td>" + observacoes + "</td></tr>" : "")
        );
    }

    public String templateAceitePendente(String codigo, String dataHora, String filial, String janela,
                                          String tipoOperacao) {
        return base(
            "Confirmação Necessária: " + codigo,
            "#f59e0b",
            "Agendamento aguarda sua confirmação",
            String.format("""
                <p>Um agendamento foi atribuído à sua transportadora e <strong>aguarda sua confirmação</strong>.</p>
                <p>Por favor, acesse o portal e <strong>confirme ou recuse</strong> o agendamento até o prazo estabelecido.</p>
                <table>
                  <tr><td><strong>Código</strong></td><td>%s</td></tr>
                  <tr><td><strong>Data / Horário</strong></td><td>%s</td></tr>
                  <tr><td><strong>Filial</strong></td><td>%s</td></tr>
                  <tr><td><strong>Janela</strong></td><td>%s</td></tr>
                  <tr><td><strong>Operação</strong></td><td>%s</td></tr>
                </table>
                """,
                codigo, dataHora, filial, janela, tipoOperacao)
        );
    }

    public String templateAgendamentoConfirmado(String codigo, String dataHora, String filial,
                                                  String motorista, String placa) {
        return base(
            "Agendamento Confirmado: " + codigo,
            "#22c55e",
            "Agendamento confirmado com sucesso",
            String.format("""
                <p>O agendamento <strong>%s</strong> foi <span style="color:#22c55e">confirmado</span>.</p>
                <table>
                  <tr><td><strong>Código</strong></td><td>%s</td></tr>
                  <tr><td><strong>Data / Horário</strong></td><td>%s</td></tr>
                  <tr><td><strong>Filial</strong></td><td>%s</td></tr>
                  %s
                  %s
                </table>
                """,
                codigo, codigo, dataHora, filial,
                motorista != null ? "<tr><td><strong>Motorista</strong></td><td>" + motorista + "</td></tr>" : "",
                placa != null ? "<tr><td><strong>Veículo</strong></td><td>" + placa + "</td></tr>" : "")
        );
    }

    public String templateAgendamentoCancelado(String codigo, String dataHora, String motivo) {
        return base(
            "Agendamento Cancelado: " + codigo,
            "#ef4444",
            "Agendamento cancelado",
            String.format("""
                <p>O agendamento <strong>%s</strong> foi <span style="color:#ef4444">cancelado</span>.</p>
                <table>
                  <tr><td><strong>Código</strong></td><td>%s</td></tr>
                  <tr><td><strong>Data / Horário</strong></td><td>%s</td></tr>
                  <tr><td><strong>Motivo</strong></td><td>%s</td></tr>
                </table>
                <p>Entre em contato com a equipe RBM Logistics para reagendamento.</p>
                """,
                codigo, codigo, dataHora, motivo != null ? motivo : "Não informado")
        );
    }

    private String base(String titulo, String cor, String subtitulo, String conteudo) {
        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              body{margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151}
              .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
              .header{background:HEADER_COLOR;padding:28px 32px}
              .header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
              .header p{margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px}
              .body{padding:28px 32px}
              table{width:100%;border-collapse:collapse;margin:16px 0}
              td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
              td:first-child{color:#6b7280;width:130px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;padding-top:10px}
              .footer{background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6}
            </style>
            </head>
            <body>
            <div class="wrap">
              <div class="header" style="background:HEADER_COLOR">
                <h1>RBM LOGISTICS</h1>
                <p>SUBTITLE</p>
              </div>
              <div class="body">CONTENT</div>
              <div class="footer">
                RBM Logistics · Módulo de Agendamento Logístico<br>
                Este é um e-mail automático, não responda a esta mensagem.
              </div>
            </div>
            </body></html>
            """
            .replace("HEADER_COLOR", cor)
            .replace("SUBTITLE", subtitulo)
            .replace("CONTENT", conteudo);
    }
}
