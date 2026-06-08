class ApiConstants {
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1'; // emulador Android
  // Para dispositivo físico, troque pelo IP da máquina: 'http://192.168.x.x:3000/api/v1'

  static const String login          = '/auth/login';
  static const String perfil         = '/auth/perfil';
  static const String clientes       = '/clientes';
  static const String compras        = '/compras';
  static const String pagamentos     = '/pagamentos';
  static const String cobrancas      = '/cobrancas';
  static const String dashboard      = '/dashboard';
}
