import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/services/cliente_service.dart';
import '../../core/models/cliente.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/utils/formatters.dart';
import '../compras/nova_compra_screen.dart';
import '../pagamentos/novo_pagamento_screen.dart';

class ClienteDetalheScreen extends StatefulWidget {
  final String clienteId;
  const ClienteDetalheScreen({super.key, required this.clienteId});
  @override
  State<ClienteDetalheScreen> createState() => _ClienteDetalheScreenState();
}

class _ClienteDetalheScreenState extends State<ClienteDetalheScreen> {
  Cliente? _cliente;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final c = await context.read<ClienteService>().buscarPorId(widget.clienteId);
      if (mounted) setState(() { _cliente = c; _loading = false; });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_cliente?.nome ?? 'Cliente')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _cliente == null
              ? const EmptyState(icon: Icons.person_off_outlined, title: 'Cliente não encontrado')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Avatar + badges
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 32,
                              backgroundColor: AppTheme.primary.withOpacity(0.12),
                              child: Text(_cliente!.nome[0].toUpperCase(),
                                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                            ),
                            const SizedBox(width: 14),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_cliente!.nome, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 6,
                                  children: [
                                    StatusBadge.fromStatus(_cliente!.status),
                                    StatusBadge.fromRisco(_cliente!.risco),
                                    StatusBadge(label: 'Score: ${_cliente!.score}', bg: const Color(0xFFEFF6FF), fg: AppTheme.primary),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Financeiro
                        Row(
                          children: [
                            _FinCard('Limite Total', formatCurrency(_cliente!.limiteCredito), AppTheme.textPrimary),
                            const SizedBox(width: 8),
                            _FinCard('Saldo Devedor', formatCurrency(_cliente!.saldoDevedor), AppTheme.danger),
                            const SizedBox(width: 8),
                            _FinCard('Disponível', formatCurrency(_cliente!.limiteDisponivel), AppTheme.success),
                          ],
                        ),
                        const SizedBox(height: 12),
                        LimitBar(percent: _cliente!.percentualUsado),
                        const SizedBox(height: 6),
                        Text(
                          '${(_cliente!.percentualUsado * 100).toStringAsFixed(0)}% do limite utilizado',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 20),

                        // Ações
                        Row(
                          children: [
                            Expanded(child: ElevatedButton.icon(
                              icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                              label: const Text('Nova Compra'),
                              onPressed: () async {
                                await Navigator.push(context, MaterialPageRoute(
                                  builder: (_) => NovaCompraScreen(clientePreSelecionado: _cliente),
                                ));
                                _load();
                              },
                            )),
                            const SizedBox(width: 10),
                            Expanded(child: OutlinedButton.icon(
                              icon: const Icon(Icons.payments_outlined, size: 18),
                              label: const Text('Pagamento'),
                              onPressed: _cliente!.saldoDevedor <= 0 ? null : () async {
                                await Navigator.push(context, MaterialPageRoute(
                                  builder: (_) => NovoPagamentoScreen(clientePreSelecionado: _cliente),
                                ));
                                _load();
                              },
                            )),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Dados do cliente
                        const SectionTitle('Informações'),
                        const SizedBox(height: 12),
                        AppCard(
                          child: Column(
                            children: [
                              if (_cliente!.cpf != null)
                                _InfoRow(Icons.badge_outlined, 'CPF', formatCPF(_cliente!.cpf!)),
                              if (_cliente!.whatsapp != null)
                                _InfoRow(Icons.whatsapp, 'WhatsApp', formatPhone(_cliente!.whatsapp!)),
                              if (_cliente!.telefone != null)
                                _InfoRow(Icons.phone_outlined, 'Telefone', formatPhone(_cliente!.telefone!)),
                              if (_cliente!.cidade != null)
                                _InfoRow(Icons.location_on_outlined, 'Cidade', _cliente!.cidade!),
                              _InfoRow(Icons.calendar_today_outlined, 'Prazo', '${_cliente!.prazoPagamentoDias} dias'),
                              if (_cliente!.diaVencimento != null)
                                _InfoRow(Icons.event_outlined, 'Vence dia', '${_cliente!.diaVencimento}'),
                            ],
                          ),
                        ),

                        if (_cliente!.observacoes != null && _cliente!.observacoes!.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const SectionTitle('Observações'),
                          const SizedBox(height: 8),
                          AppCard(
                            child: Text(_cliente!.observacoes!,
                              style: const TextStyle(color: AppTheme.textSecondary)),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }
}

class _FinCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _FinCard(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(value, style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 14), textAlign: TextAlign.center),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 10),
        Text('$label: ', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
      ],
    ),
  );
}
