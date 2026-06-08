import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/services/dashboard_service.dart';
import '../../core/models/dashboard.dart';
import '../../core/theme/app_theme.dart';
import '../../features/auth/auth_provider.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/utils/formatters.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DashboardResumo? _resumo;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final svc  = context.read<DashboardService>();
      final data = await svc.resumo();
      if (mounted) setState(() { _resumo = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthProvider>().usuario;

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Olá, ${usuario?.nome.split(' ').first ?? ''}! 👋',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                    if (usuario?.estabelecimento != null)
                      Text(usuario!.estabelecimento!.nome,
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_resumo == null)
              EmptyState(icon: Icons.cloud_off, title: 'Sem conexão', subtitle: 'Puxe para atualizar',
                action: ElevatedButton(onPressed: _load, child: const Text('Tentar novamente')))
            else ...[
              // Stats grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  StatCard(
                    title: 'Total a Receber',
                    value: formatCurrency(_resumo!.totalAReceber),
                    icon: Icons.attach_money,
                    color: AppTheme.primary,
                  ),
                  StatCard(
                    title: 'Clientes Ativos',
                    value: _resumo!.totalClientes.toString(),
                    icon: Icons.people_outline,
                    color: AppTheme.success,
                    subtitle: '+${_resumo!.novoClientesMes} este mês',
                  ),
                  StatCard(
                    title: 'Inadimplentes',
                    value: _resumo!.clientesInadimplentes.toString(),
                    icon: Icons.warning_amber_outlined,
                    color: AppTheme.danger,
                    subtitle: formatCurrency(_resumo!.valorInadimplencia),
                  ),
                  StatCard(
                    title: 'Receb. do Mês',
                    value: formatCurrency(_resumo!.recebimentosMes),
                    icon: Icons.trending_up,
                    color: AppTheme.success,
                    subtitle: 'Ticket: ${formatCurrency(_resumo!.ticketMedio)}',
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Atalhos rápidos
              const SectionTitle('Ações Rápidas'),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _QuickAction(
                    icon: Icons.person_add_alt_1_outlined,
                    label: 'Novo\nCliente',
                    color: AppTheme.primary,
                    onTap: () => Navigator.pushNamed(context, '/novo-cliente'),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.shopping_bag_outlined,
                    label: 'Nova\nCompra',
                    color: const Color(0xFF7C3AED),
                    onTap: () => Navigator.pushNamed(context, '/nova-compra'),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.payments_outlined,
                    label: 'Registrar\nPagamento',
                    color: AppTheme.success,
                    onTap: () => Navigator.pushNamed(context, '/novo-pagamento'),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.people_outline,
                    label: 'Ver\nClientes',
                    color: AppTheme.warning,
                    onTap: () => Navigator.pushNamed(context, '/clientes'),
                  )),
                ],
              ),

              const SizedBox(height: 24),

              // Indicador de inadimplência
              if (_resumo!.clientesInadimplentes > 0) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: AppTheme.danger),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_resumo!.clientesInadimplentes} cliente(s) inadimplente(s)',
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF991B1B)),
                            ),
                            Text(
                              '${formatCurrency(_resumo!.valorInadimplencia)} em aberto',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
