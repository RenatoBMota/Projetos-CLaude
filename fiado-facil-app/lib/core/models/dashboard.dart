class DashboardResumo {
  final int totalClientes;
  final int clientesInadimplentes;
  final int clientesBloqueados;
  final double totalAReceber;
  final int novoClientesMes;
  final double recebimentosMes;
  final double ticketMedio;
  final int totalInadimplentes;
  final double valorInadimplencia;

  const DashboardResumo({
    required this.totalClientes,
    required this.clientesInadimplentes,
    required this.clientesBloqueados,
    required this.totalAReceber,
    required this.novoClientesMes,
    required this.recebimentosMes,
    required this.ticketMedio,
    required this.totalInadimplentes,
    required this.valorInadimplencia,
  });

  factory DashboardResumo.fromJson(Map<String, dynamic> j) => DashboardResumo(
    totalClientes:        (j['totalClientes'] as num?)?.toInt() ?? 0,
    clientesInadimplentes: (j['clientesInadimplentes'] as num?)?.toInt() ?? 0,
    clientesBloqueados:   (j['clientesBloqueados'] as num?)?.toInt() ?? 0,
    totalAReceber:        double.tryParse(j['totalAReceber'].toString()) ?? 0,
    novoClientesMes:      (j['novoClientesMes'] as num?)?.toInt() ?? 0,
    recebimentosMes:      double.tryParse(j['recebimentosMes'].toString()) ?? 0,
    ticketMedio:          double.tryParse(j['ticketMedio'].toString()) ?? 0,
    totalInadimplentes:   (j['totalInadimplentes'] as num?)?.toInt() ?? 0,
    valorInadimplencia:   double.tryParse(j['valorInadimplencia'].toString()) ?? 0,
  );
}
