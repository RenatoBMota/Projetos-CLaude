import 'api_service.dart';
import 'storage_service.dart';
import '../constants/api_constants.dart';
import '../models/usuario.dart';

class AuthService {
  final ApiService _api;
  final StorageService _storage;
  AuthService(this._api, this._storage);

  Future<Usuario> login(String email, String senha) async {
    final res = await _api.post(ApiConstants.login, {'email': email, 'senha': senha});
    final token   = res['accessToken'] as String;
    final usuario = Usuario.fromJson(res['usuario']);
    await _storage.saveToken(token);
    await _storage.saveUsuario(res['usuario']);
    return usuario;
  }

  Future<Usuario?> usuarioSalvo() async {
    final j = await _storage.getUsuario();
    if (j == null) return null;
    return Usuario.fromJson(j);
  }

  Future<void> logout() => _storage.clear();
}
