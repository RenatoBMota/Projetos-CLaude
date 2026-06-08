import 'cliente.dart';

class Pagamento {
  final String id;
  final String clienteId;
  final Cliente? cliente;
  final double valor;
  final String dataPagamento;
  final String formaPagamento;
  final String? observacao;
  final String estabelecimentoId;
  final String createdAt;

  const Pagamento({
    required this.id,
    required this.clienteId,
    this.cliente,
    required this.valor,
    required this.dataPagamento,
    required this.formaPagamento,
    this.observacao,
    required this.estabelecimentoId,
    required this.createdAt,
  });

  factory Pagamento.fromJson(Map<String, dynamic> j) => Pagamento(
    id:               j['id'] as String,
    clienteId:        j['clienteId'] as String,
    cliente:          j['cliente'] != null ? Cliente.fromJson(j['cliente']) : null,
    valor:            double.tryParse(j['valor'].toString()) ?? 0,
    dataPagamento:    j['dataPagamento'] as String,
    formaPagamento:   j['formaPagamento'] as String? ?? 'dinheiro',
    observacao:       j['observacao'] as String?,
    estabelecimentoId: j['estabelecimentoId'] as String,
    createdAt:        j['createdAt'] as String,
  );
}
