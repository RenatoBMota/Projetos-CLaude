import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../dashboard/dashboard_screen.dart';
import '../clientes/clientes_screen.dart';
import '../compras/nova_compra_screen.dart';
import '../pagamentos/novo_pagamento_screen.dart';
import '../../features/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _idx = 0;

  final _tabs = const [
    DashboardScreen(),
    ClientesScreen(),
  ];

  final _titles = ['Início', 'Clientes'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_idx]),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Sair',
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Sair'),
                  content: const Text('Deseja encerrar a sessão?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Sair', style: TextStyle(color: AppTheme.danger)),
                    ),
                  ],
                ),
              );
              if (ok == true && mounted) {
                await context.read<AuthProvider>().logout();
              }
            },
          ),
        ],
      ),
      body: _tabs[_idx],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _idx,
        onTap: (i) => setState(() => _idx = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Início'),
          BottomNavigationBarItem(icon: Icon(Icons.people_outline), activeIcon: Icon(Icons.people), label: 'Clientes'),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () => _showAcoesRapidas(context),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  void _showAcoesRapidas(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('O que você quer fazer?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              _AcaoTile(
                icon: Icons.shopping_bag_outlined,
                color: const Color(0xFF7C3AED),
                title: 'Registrar Compra Fiada',
                subtitle: 'Lançar uma nova compra para um cliente',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const NovaCompraScreen()));
                },
              ),
              const SizedBox(height: 10),
              _AcaoTile(
                icon: Icons.payments_outlined,
                color: AppTheme.success,
                title: 'Registrar Pagamento',
                subtitle: 'Receber pagamento de um cliente',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const NovoPagamentoScreen()));
                },
              ),
              const SizedBox(height: 10),
              _AcaoTile(
                icon: Icons.person_add_outlined,
                color: AppTheme.primary,
                title: 'Cadastrar Novo Cliente',
                subtitle: 'Adicionar um cliente ao sistema',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/novo-cliente');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AcaoTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _AcaoTile({required this.icon, required this.color, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: BorderSide(color: color.withOpacity(0.2)),
    ),
    tileColor: color.withOpacity(0.05),
    leading: Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, color: color),
    ),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
  );
}
