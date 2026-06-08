import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/services/cliente_service.dart';
import '../../core/models/cliente.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/utils/formatters.dart';
import 'cliente_detalhe_screen.dart';
import 'novo_cliente_screen.dart';

class ClientesScreen extends StatefulWidget {
  const ClientesScreen({super.key});
  @override
  State<ClientesScreen> createState() => _ClientesScreenState();
}

class _ClientesScreenState extends State<ClientesScreen> {
  List<Cliente> _clientes = [];
  bool _loading = true;
  final _busca = TextEditingController();
  String _status = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await context.read<ClienteService>().listar(
        busca: _busca.text.isEmpty ? null : _busca.text,
        status: _status.isEmpty ? null : _status,
      );
      if (mounted) setState(() { _clientes = list; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clientes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            onPressed: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const NovoClienteScreen()));
              _load();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Busca + filtro
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _busca,
                    onChanged: (_) => _load(),
                    decoration: const InputDecoration(
                      hintText: 'Buscar por nome...',
                      prefixIcon: Icon(Icons.search, size: 20),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _status,
                    items: const [
                      DropdownMenuItem(value: '', child: Text('Todos')),
                      DropdownMenuItem(value: 'ativo', child: Text('Ativos')),
                      DropdownMenuItem(value: 'inadimplente', child: Text('Inadimp.')),
                      DropdownMenuItem(value: 'bloqueado', child: Text('Bloq.')),
                    ],
                    onChanged: (v) { setState(() => _status = v ?? ''); _load(); },
                  ),
                ),
              ],
            ),
          ),

          // Lista
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _clientes.isEmpty
                    ? EmptyState(
                        icon: Icons.people_outline,
                        title: 'Nenhum cliente encontrado',
                        action: ElevatedButton.icon(
                          icon: const Icon(Icons.add),
                          label: const Text('Novo Cliente'),
                          onPressed: () async {
                            await Navigator.push(context, MaterialPageRoute(builder: (_) => const NovoClienteScreen()));
                            _load();
                          },
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                          itemCount: _clientes.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) => _ClienteCard(
                            cliente: _clientes[i],
                            onTap: () async {
                              await Navigator.push(context, MaterialPageRoute(
                                builder: (_) => ClienteDetalheScreen(clienteId: _clientes[i].id),
                              ));
                              _load();
                            },
                          ),
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const NovoClienteScreen()));
          _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Novo Cliente'),
        backgroundColor: AppTheme.primary,
      ),
    );
  }
}

class _ClienteCard extends StatelessWidget {
  final Cliente cliente;
  final VoidCallback onTap;
  const _ClienteCard({required this.cliente, required this.onTap});

  @override
  Widget build(BuildContext context) => AppCard(
    onTap: onTap,
    child: Column(
      children: [
        Row(
          children: [
            CircleAvatar(
              backgroundColor: AppTheme.primary.withOpacity(0.12),
              radius: 22,
              child: Text(cliente.nome[0].toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(cliente.nome, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      StatusBadge.fromStatus(cliente.status),
                      const SizedBox(width: 6),
                      StatusBadge.fromRisco(cliente.risco),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(formatCurrency(cliente.saldoDevedor),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: cliente.saldoDevedor > 0 ? AppTheme.danger : AppTheme.textSecondary,
                  )),
                Text('de ${formatCurrency(cliente.limiteCredito)}',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        LimitBar(percent: cliente.percentualUsado),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Disponível: ${formatCurrency(cliente.limiteDisponivel)}',
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
            Text('Score: ${cliente.score}',
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          ],
        ),
      ],
    ),
  );
}
