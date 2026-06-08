import 'cliente.dart';

class Compra {
  final String id;
  final String clienteId;
  final Cliente? cliente;
  final double valor;
  final double valorPago;
  final String dataCompra;
  final String? dataVencimento;
  final String? observacao;
  final String origem;
  final String status;
  final String? numeroNota;
  final String estabelecimentoId;
  final String createdAt;

  const Compra({
    required this.id,
    required this.clienteId,
    this.cliente,
    required this.valor,
    required this.valorPago,
    required this.dataCompra,
    this.dataVencimento,
    this.observacao,
    required this.origem,
    required this.status,
    this.numeroNota,
    required this.estabelecimentoId,
    required this.createdAt,
  });

  double get saldoRestante => valor - valorPago;

  factory Compra.fromJson(Map<String, dynamic> j) => Compra(
    id:               j['id'] as String,
    clienteId:        j['clienteId'] as String,
    cliente:          j['cliente'] != null ? Cliente.fromJson(j['cliente']) : null,
    valor:            double.tryParse(j['valor'].toString()) ?? 0,
    valorPago:        double.tryParse(j['valorPago'].toString()) ?? 0,
    dataCompra:       j['dataCompra'] as String,
    dataVencimento:   j['dataVencimento'] as String?,
    observacao:       j['observacao'] as String?,
    origem:           j['origem'] as String? ?? 'manual',
    status:           j['status'] as String? ?? 'pendente',
    numeroNota:       j['numeroNota'] as String?,
    estabelecimentoId: j['estabelecimentoId'] as String,
    createdAt:        j['createdAt'] as String,
  );
}
