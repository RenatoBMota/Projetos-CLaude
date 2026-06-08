import 'api_service.dart';
import '../constants/api_constants.dart';
import '../models/cliente.dart';

class ClienteService {
  final ApiService _api;
  ClienteService(this._api);

  Future<List<Cliente>> listar({int page = 1, int limit = 30, String? busca, String? status}) async {
    final res = await _api.get(ApiConstants.clientes, {
      'page': page, 'limit': limit,
      if (busca != null && busca.isNotEmpty) 'busca': busca,
      if (status != null && status.isNotEmpty) 'status': status,
    });
    final list = res['data'] as List;
    return list.map((e) => Cliente.fromJson(e)).toList();
  }

  Future<Cliente> buscarPorId(String id) async {
    final res = await _api.get('${ApiConstants.clientes}/$id');
    return Cliente.fromJson(res);
  }

  Future<Cliente> criar(Map<String, dynamic> data) async {
    final res = await _api.post(ApiConstants.clientes, data);
    return Cliente.fromJson(res);
  }

  Future<Cliente> atualizar(String id, Map<String, dynamic> data) async {
    final res = await _api.patch('${ApiConstants.clientes}/$id', data);
    return Cliente.fromJson(res);
  }

  Future<List<Cliente>> inadimplentes() async {
    final res = await _api.get('${ApiConstants.clientes}/inadimplentes');
    return (res as List).map((e) => Cliente.fromJson(e)).toList();
  }
}
