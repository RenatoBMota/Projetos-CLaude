import 'api_service.dart';
import '../constants/api_constants.dart';
import '../models/compra.dart';

class CompraService {
  final ApiService _api;
  CompraService(this._api);

  Future<List<Compra>> listar({int page = 1, String? clienteId}) async {
    final res = await _api.get(ApiConstants.compras, {
      'page': page, 'limit': 20,
      if (clienteId != null) 'clienteId': clienteId,
    });
    final list = res['data'] as List;
    return list.map((e) => Compra.fromJson(e)).toList();
  }

  Future<Compra> registrar({
    required String clienteId,
    required double valor,
    required String dataCompra,
    String? observacao,
  }) async {
    final res = await _api.post(ApiConstants.compras, {
      'clienteId': clienteId,
      'valor': valor,
      'dataCompra': dataCompra,
      if (observacao != null) 'observacao': observacao,
    });
    return Compra.fromJson(res);
  }

  Future<Compra> cancelar(String id) async {
    final res = await _api.delete('${ApiConstants.compras}/$id/cancelar');
    return Compra.fromJson(res);
  }
}
