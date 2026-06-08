import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'core/services/storage_service.dart';
import 'core/services/cliente_service.dart';
import 'core/services/compra_service.dart';
import 'core/services/pagamento_service.dart';
import 'core/services/dashboard_service.dart';
import 'features/auth/auth_provider.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final storage  = StorageService();
  final api      = ApiService(storage);
  final auth     = AuthService(api, storage);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(auth)),
        Provider<ClienteService>(create: (_) => ClienteService(api)),
        Provider<CompraService>(create: (_) => CompraService(api)),
        Provider<PagamentoService>(create: (_) => PagamentoService(api)),
        Provider<DashboardService>(create: (_) => DashboardService(api)),
      ],
      child: const FiadoFacilApp(),
    ),
  );
}
