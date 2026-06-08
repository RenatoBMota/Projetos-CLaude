import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/models/cliente.dart';
import '../../core/services/pagamento_service.dart';
import '../../core/services/cliente_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_widgets.dart';
import '../../shared/utils/formatters.dart';

class NovoPagamentoScreen extends StatefulWidget {
  final Cliente? clientePreSelecionado;
  const NovoPagamentoScreen({super.key, this.clientePreSelecionado});
  @override
  State<NovoPagamentoScreen> createState() => _NovoPagamentoScreenState();
}

class _NovoPagamentoScreenState extends State<NovoPagamentoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _valor   = TextEditingController();
  final _obs     = TextEditingController();
  List<Cliente>  _clientes       = [];
  Cliente?       _clienteSel;
  String         _formaPagamento = 'dinheiro';
  DateTime       _data           = DateTime.now();
  bool _loading  = false;
  bool _loadCli  = true;

  @override
  void initState() {
    super.initState();
    _clienteSel = widget.clientePreSelecionado;
    _loadClientes();
  }

  Future<void> _loadClientes() async {
    try {
      final list = await context.read<ClienteService>().listar(limit: 200);
      if (mounted) setState(() { _clientes = list.where((c) => c.saldoDevedor > 0).toList(); _loadCli = false; });
    } catch (_) {
      if (mounted) setState(() => _loadCli = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _data,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) setState(() => _data = picked);
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    if (_clienteSel == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selecione um cliente'), backgroundColor: AppTheme.danger));
      return;
    }
    final valor = double.tryParse(_valor.text.replaceAll(',', '.')) ?? 0;
    if (valor > _clienteSel!.saldoDevedor) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Valor maior que o saldo devedor (${formatCurrency(_clienteSel!.saldoDevedor)})'),
        backgroundColor: AppTheme.danger,
      ));
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<PagamentoService>().registrar(
        clienteId: _clienteSel!.id,
        valor: valor,
        dataPagamento: _data.toIso8601String().substring(0, 10),
        formaPagamento: _formaPagamento,
        observacao: _obs.text.isEmpty ? null : _obs.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pagamento registrado!'), backgroundColor: AppTheme.success),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Registrar Pagamento')),
    body: LoadingOverlay(
      isLoading: _loading,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
                    child: Text('${c.nome} — deve ${formatCurrency(c.saldoDevedor)}'),
                  )).toList(),
                  onChanged: (c) => setState(() => _clienteSel = c),
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline)),
                ),

              if (_clienteSel != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.danger.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.danger.withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Saldo devedor', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                      Text(formatCurrency(_clienteSel!.saldoDevedor),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.danger)),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),
              const SectionTitle('Pagamento'),
              const SizedBox(height: 12),

              TextFormField(
                controller: _valor,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Valor Pago (R\$) *',
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

              // Forma de pagamento com chips
              const Text('Forma de Pagamento', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final entry in formaPagamentoLabel.entries)
                    ChoiceChip(
                      label: Text(entry.value),
                      selected: _formaPagamento == entry.key,
                      selectedColor: AppTheme.primary.withOpacity(0.15),
                      onSelected: (_) => setState(() => _formaPagamento = entry.key),
                      labelStyle: TextStyle(
                        color: _formaPagamento == entry.key ? AppTheme.primary : AppTheme.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              GestureDetector(
                onTap: _pickDate,
                child: AbsorbPointer(
                  child: TextFormField(
                    decoration: InputDecoration(
                      labelText: 'Data do Pagamento *',
                      prefixIcon: const Icon(Icons.calendar_today_outlined),
                      suffixIcon: const Icon(Icons.arrow_drop_down),
                    ),
                    controller: TextEditingController(text: formatDate(_data.toIso8601String())),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _obs,
                decoration: const InputDecoration(
                  labelText: 'Observação',
                  prefixIcon: Icon(Icons.notes),
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton.icon(
                icon: const Icon(Icons.check),
                label: const Text('Registrar Pagamento'),
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
