import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/models/cliente.dart';
import '../../core/services/compra_service.dart';
import '../../core/services/cliente_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/utils/formatters.dart';

class NovaCompraScreen extends StatefulWidget {
  final Cliente? clientePreSelecionado;
  const NovaCompraScreen({super.key, this.clientePreSelecionado});
  @override
  State<NovaCompraScreen> createState() => _NovaCompraScreenState();
}

class _NovaCompraScreenState extends State<NovaCompraScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _valor    = TextEditingController();
  final _obs      = TextEditingController();
  List<Cliente>   _clientes     = [];
  Cliente?        _clienteSel;
  DateTime        _dataCompra   = DateTime.now();
  bool _loading   = false;
  bool _loadCli   = true;

  @override
  void initState() {
    super.initState();
    _clienteSel = widget.clientePreSelecionado;
    _loadClientes();
  }

  Future<void> _loadClientes() async {
    try {
      final list = await context.read<ClienteService>().listar(limit: 200);
      if (mounted) setState(() { _clientes = list; _loadCli = false; });
    } catch (_) {
      if (mounted) setState(() => _loadCli = false);
    }
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    if (_clienteSel == null) { _showSnack('Selecione um cliente', error: true); return; }

    final valor = double.tryParse(_valor.text.replaceAll(',', '.')) ?? 0;

    // Verificar limite
    if (valor > _clienteSel!.limiteDisponivel) {
      _showSnack('Valor excede o limite disponível de ${formatCurrency(_clienteSel!.limiteDisponivel)}', error: true);
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<CompraService>().registrar(
        clienteId: _clienteSel!.id,
        valor: valor,
        dataCompra: _dataCompra.toIso8601String().substring(0, 10),
        observacao: _obs.text.isEmpty ? null : _obs.text.trim(),
      );
      if (mounted) {
        _showSnack('Compra registrada!');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) { setState(() => _loading = false); _showSnack(e.toString(), error: true); }
    }
  }

  void _showSnack(String msg, {bool error = false}) =>
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: error ? AppTheme.danger : AppTheme.success),
    );

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dataCompra,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) setState(() => _dataCompra = picked);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Registrar Compra Fiada')),
    body: LoadingOverlay(
      isLoading: _loading,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Seleção de cliente
              const SectionTitle('Cliente'),
              const SizedBox(height: 12),

              if (_loadCli)
                const Center(child: CircularProgressIndicator())
              else
                DropdownButtonFormField<Cliente>(
                  value: _clienteSel,
                  hint: const Text('Selecione o cliente'),
                  items: _clientes.map((c) => DropdownMenuItem(
                    value: c,
                    child: Text('${c.nome} — ${formatCurrency(c.limiteDisponivel)} disp.'),
                  )).toList(),
                  onChanged: (c) => setState(() => _clienteSel = c),
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline)),
                  validator: (v) => v == null ? 'Selecione um cliente' : null,
                ),

              // Info do cliente selecionado
              if (_clienteSel != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Limite disponível', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                          Text(formatCurrency(_clienteSel!.limiteDisponivel),
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.success)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Saldo devedor', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                          Text(formatCurrency(_clienteSel!.saldoDevedor),
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.danger)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LimitBar(percent: _clienteSel!.percentualUsado),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),
              const SectionTitle('Dados da Compra'),
              const SizedBox(height: 12),

              TextFormField(
                controller: _valor,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                autofocus: widget.clientePreSelecionado != null,
                decoration: const InputDecoration(
                  labelText: 'Valor (R\$) *',
                  prefixIcon: Icon(Icons.attach_money),
                  hintText: '0,00',
                ),
                validator: (v) {
                  final n = double.tryParse(v?.replaceAll(',', '.') ?? '');
                  if (n == null || n <= 0) return 'Informe um valor válido';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Data
              GestureDetector(
                onTap: _pickDate,
                child: AbsorbPointer(
                  child: TextFormField(
                    decoration: InputDecoration(
                      labelText: 'Data da Compra *',
                      prefixIcon: const Icon(Icons.calendar_today_outlined),
                      suffixIcon: const Icon(Icons.arrow_drop_down),
                      hintText: formatDate(_dataCompra.toIso8601String()),
                    ),
                    controller: TextEditingController(text: formatDate(_dataCompra.toIso8601String())),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _obs,
                decoration: const InputDecoration(
                  labelText: 'Observação',
                  prefixIcon: Icon(Icons.notes),
                  hintText: 'Ex: Compras do dia, mercearia...',
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton.icon(
                icon: const Icon(Icons.check),
                label: const Text('Registrar Compra'),
                onPressed: _loading ? null : _salvar,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    ),
  );
}
