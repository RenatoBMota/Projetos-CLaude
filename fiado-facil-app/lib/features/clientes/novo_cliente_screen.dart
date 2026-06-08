import 'package:flutter/material.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';
import 'package:provider/provider.dart';
import '../../core/services/cliente_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_widgets.dart';

class NovoClienteScreen extends StatefulWidget {
  const NovoClienteScreen({super.key});
  @override
  State<NovoClienteScreen> createState() => _NovoClienteScreenState();
}

class _NovoClienteScreenState extends State<NovoClienteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nome    = TextEditingController();
  final _cpf     = TextEditingController();
  final _tel     = TextEditingController();
  final _whats   = TextEditingController();
  final _cidade  = TextEditingController();
  final _limite  = TextEditingController(text: '500');
  final _prazo   = TextEditingController(text: '30');
  final _obs     = TextEditingController();
  bool _loading  = false;

  final _cpfMask   = MaskTextInputFormatter(mask: '###.###.###-##',  filter: {'#': RegExp(r'[0-9]')});
  final _phoneMask = MaskTextInputFormatter(mask: '(##) #####-####', filter: {'#': RegExp(r'[0-9]')});
  final _phoneMask2= MaskTextInputFormatter(mask: '(##) #####-####', filter: {'#': RegExp(r'[0-9]')});

  @override
  void dispose() {
    _nome.dispose(); _cpf.dispose(); _tel.dispose();
    _whats.dispose(); _cidade.dispose(); _limite.dispose();
    _prazo.dispose(); _obs.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await context.read<ClienteService>().criar({
        'nome':               _nome.text.trim(),
        if (_cpf.text.isNotEmpty) 'cpf': _cpf.text.replaceAll(RegExp(r'\D'), ''),
        if (_tel.text.isNotEmpty) 'telefone': _tel.text.replaceAll(RegExp(r'\D'), ''),
        if (_whats.text.isNotEmpty) 'whatsapp': _whats.text.replaceAll(RegExp(r'\D'), ''),
        if (_cidade.text.isNotEmpty) 'cidade': _cidade.text.trim(),
        'limiteCredito':      double.tryParse(_limite.text) ?? 500,
        'prazoPagamentoDias': int.tryParse(_prazo.text)    ?? 30,
        if (_obs.text.isNotEmpty) 'observacoes': _obs.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cliente cadastrado!'), backgroundColor: AppTheme.success),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Novo Cliente')),
    body: LoadingOverlay(
      isLoading: _loading,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionTitle('Dados Pessoais'),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nome,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nome completo *', prefixIcon: Icon(Icons.person_outline)),
                validator: (v) => (v?.isEmpty ?? true) ? 'Nome obrigatório' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _cpf,
                inputFormatters: [_cpfMask],
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'CPF', prefixIcon: Icon(Icons.badge_outlined)),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(child: TextFormField(
                    controller: _tel,
                    inputFormatters: [_phoneMask],
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Telefone', prefixIcon: Icon(Icons.phone_outlined)),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: TextFormField(
                    controller: _whats,
                    inputFormatters: [_phoneMask2],
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'WhatsApp', prefixIcon: Icon(Icons.whatsapp)),
                  )),
                ],
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _cidade,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Cidade', prefixIcon: Icon(Icons.location_on_outlined)),
              ),
              const SizedBox(height: 24),

              const SectionTitle('Dados de Crédito'),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(child: TextFormField(
                    controller: _limite,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Limite de Crédito (R\$) *',
                      prefixIcon: Icon(Icons.attach_money),
                    ),
                    validator: (v) {
                      final n = double.tryParse(v ?? '');
                      return (n == null || n < 0) ? 'Limite inválido' : null;
                    },
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: TextFormField(
                    controller: _prazo,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Prazo (dias)',
                      prefixIcon: Icon(Icons.calendar_today_outlined),
                    ),
                  )),
                ],
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _obs,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Observações',
                  prefixIcon: Icon(Icons.notes),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: _loading ? null : _salvar,
                child: const Text('Cadastrar Cliente'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    ),
  );
}
