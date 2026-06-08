import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private configService: ConfigService) {}

  async enviarMensagem(
    numero: string,
    mensagem: string,
    apiUrl?: string,
    apiKey?: string,
    instance?: string,
  ): Promise<boolean> {
    const url = apiUrl || this.configService.get('WHATSAPP_API_URL');
    const key = apiKey || this.configService.get('WHATSAPP_API_KEY');
    const inst = instance || this.configService.get('WHATSAPP_INSTANCE');

    if (!url || !key) {
      this.logger.warn(`WhatsApp não configurado. Mensagem para ${numero}: ${mensagem}`);
      return false;
    }

    try {
      const numeroFormatado = numero.replace(/\D/g, '');
      await axios.post(
        `${url}/message/sendText/${inst}`,
        { number: `55${numeroFormatado}`, text: mensagem },
        { headers: { apikey: key } },
      );
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar WhatsApp para ${numero}: ${error.message}`);
      return false;
    }
  }

  montarMensagemCompra(params: {
    nomeCliente: string;
    nomeEstabelecimento: string;
    valor: number;
    data: string;
    saldoAtual: number;
    vencimento: string;
  }): string {
    return (
      `Olá ${params.nomeCliente}! 👋\n\n` +
      `Sua compra foi registrada.\n\n` +
      `🏪 *${params.nomeEstabelecimento}*\n` +
      `💰 Valor: *R$ ${params.valor.toFixed(2)}*\n` +
      `📅 Data: ${params.data}\n` +
      `📊 Saldo atual: *R$ ${params.saldoAtual.toFixed(2)}*\n` +
      `⏰ Vencimento: ${params.vencimento}\n\n` +
      `Obrigado pela preferência! 😊`
    );
  }

  montarMensagemCobranca(params: {
    nomeCliente: string;
    nomeEstabelecimento: string;
    saldo: number;
    vencimento: string;
    tipo: string;
  }): string {
    const mensagens = {
      lembrete_7_dias: `Olá ${params.nomeCliente}! 📅\n\nSeu pagamento de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* vence em *7 dias* (${params.vencimento}).\n\nQualquer dúvida, entre em contato! 😊`,
      lembrete_3_dias: `Olá ${params.nomeCliente}! ⏰\n\nLembrete: seu pagamento de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* vence em *3 dias* (${params.vencimento}).\n\nEvite atrasos! 🙏`,
      vencimento_hoje: `Olá ${params.nomeCliente}! 📢\n\nSua fatura de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* vence *hoje*!\n\nRegularize o quanto antes. 😊`,
      atraso_5_dias: `Olá ${params.nomeCliente}! ⚠️\n\nSua dívida de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* está em atraso.\n\nPor favor, regularize sua situação. 🙏`,
      atraso_15_dias: `Olá ${params.nomeCliente}! 🔴\n\nSua dívida de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* está em atraso há mais de 15 dias.\n\nEntre em contato para regularizar.`,
      atraso_30_dias: `Olá ${params.nomeCliente}! 🚨\n\nSua dívida de *R$ ${params.saldo.toFixed(2)}* no *${params.nomeEstabelecimento}* está em atraso crítico (30+ dias).\n\nSua conta foi marcada como inadimplente. Entre em contato urgente.`,
    };

    return mensagens[params.tipo] || mensagens['lembrete_7_dias'];
  }
}
