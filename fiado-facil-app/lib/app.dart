import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';
import 'features/clientes/novo_cliente_screen.dart';
import 'features/compras/nova_compra_screen.dart';
import 'features/pagamentos/novo_pagamento_screen.dart';
import 'shared/widgets/app_widgets.dart';

class FiadoFacilApp extends StatelessWidget {
  const FiadoFacilApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fiado Fácil',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('pt', 'BR')],
      routes: {
        '/novo-cliente':   (_) => const NovoClienteScreen(),
        '/nova-compra':    (_) => const NovaCompraScreen(),
        '/novo-pagamento': (_) => const NovoPagamentoScreen(),
        '/clientes':       (_) => const HomeScreen(),
      },
      home: const _RootNavigator(),
    );
  }
}

class _RootNavigator extends StatelessWidget {
  const _RootNavigator();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return auth.status == AuthStatus.authenticated
        ? const HomeScreen()
        : const LoginScreen();
  }
}
