import 'api_service.dart';
import '../constants/api_constants.dart';
import '../models/pagamento.dart';

class PagamentoService {
  final ApiService _api;
  PagamentoService(this._api);

  Future<List<Pagamento>> listar({int page = 1, String? clienteId}) async {
    final res = await _api.get(ApiConstants.pagamentos, {
      'page': page, 'limit': 20,
      if (clienteId != null) 'clienteId': clienteId,
    });
    final list = res['data'] as List;
    return list.map((e) => Pagamento.fromJson(e)).toList();
  }

  Future<Pagamento> registrar({
    required String clienteId,
    required double valor,
    required String dataPagamento,
    String formaPagamento = 'dinheiro',
    String? observacao,
  }) async {
    final res = await _api.post(ApiConstants.pagamentos, {
      'clienteId': clienteId,
      'valor': valor,
      'dataPagamento': dataPagamento,
      'formaPagamento': formaPagamento,
      if (observacao != null) 'observacao': observacao,
    });
    return Pagamento.fromJson(res);
  }
}
