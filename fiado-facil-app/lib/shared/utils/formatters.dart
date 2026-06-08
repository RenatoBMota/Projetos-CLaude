import 'package:intl/intl.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _date     = DateFormat('dd/MM/yyyy', 'pt_BR');
final _dateShort = DateFormat('dd/MM', 'pt_BR');

String formatCurrency(double value) => _currency.format(value);

String formatDate(String iso) {
  try {
    final d = DateTime.parse(iso);
    return _date.format(d);
  } catch (_) {
    return iso;
  }
}

String formatDateShort(String iso) {
  try {
    final d = DateTime.parse(iso);
    return _dateShort.format(d);
  } catch (_) {
    return iso;
  }
}

String todayIso() => DateFormat('yyyy-MM-dd').format(DateTime.now());

String formatCPF(String cpf) {
  final d = cpf.replaceAll(RegExp(r'\D'), '');
  if (d.length != 11) return cpf;
  return '${d.substring(0,3)}.${d.substring(3,6)}.${d.substring(6,9)}-${d.substring(9)}';
}

String formatPhone(String phone) {
  final d = phone.replaceAll(RegExp(r'\D'), '');
  if (d.length == 11) return '(${d.substring(0,2)}) ${d.substring(2,7)}-${d.substring(7)}';
  if (d.length == 10) return '(${d.substring(0,2)}) ${d.substring(2,6)}-${d.substring(6)}';
  return phone;
}

const formaPagamentoLabel = {
  'dinheiro':      'Dinheiro',
  'pix':           'PIX',
  'cartao_debito': 'Cartão Débito',
  'cartao_credito':'Cartão Crédito',
  'transferencia': 'Transferência',
  'cheque':        'Cheque',
};
