import 'package:flutter/foundation.dart';
import '../../core/models/usuario.dart';
import '../../core/services/auth_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  AuthStatus _status = AuthStatus.unknown;
  Usuario? _usuario;
  String? _error;

  AuthStatus get status  => _status;
  Usuario?   get usuario => _usuario;
  String?    get error   => _error;
  bool get isLoading     => _status == AuthStatus.unknown;

  AuthProvider(this._authService) {
    _checkSavedSession();
  }

  Future<void> _checkSavedSession() async {
    final u = await _authService.usuarioSalvo();
    _usuario = u;
    _status  = u != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> login(String email, String senha) async {
    _error = null;
    try {
      _usuario = await _authService.login(email, senha);
      _status  = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error  = e.toString();
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _usuario = null;
    _status  = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
