class Cliente {
  final String id;
  final String nome;
  final String? cpf;
  final String? telefone;
  final String? whatsapp;
  final String? endereco;
  final String? cidade;
  final double limiteCredito;
  final double saldoDevedor;
  final int prazoPagamentoDias;
  final int? diaVencimento;
  final String status;
  final int score;
  final String risco;
  final String? observacoes;
  final String estabelecimentoId;
  final String createdAt;

  const Cliente({
    required this.id,
    required this.nome,
    this.cpf,
    this.telefone,
    this.whatsapp,
    this.endereco,
    this.cidade,
    required this.limiteCredito,
    required this.saldoDevedor,
    required this.prazoPagamentoDias,
    this.diaVencimento,
    required this.status,
    required this.score,
    required this.risco,
    this.observacoes,
    required this.estabelecimentoId,
    required this.createdAt,
  });

  double get limiteDisponivel => limiteCredito - saldoDevedor;
  double get percentualUsado => limiteCredito > 0 ? (saldoDevedor / limiteCredito).clamp(0, 1) : 0;

  factory Cliente.fromJson(Map<String, dynamic> j) => Cliente(
    id:                  j['id'] as String,
    nome:                j['nome'] as String,
    cpf:                 j['cpf'] as String?,
    telefone:            j['telefone'] as String?,
    whatsapp:            j['whatsapp'] as String?,
    endereco:            j['endereco'] as String?,
    cidade:              j['cidade'] as String?,
    limiteCredito:       double.tryParse(j['limiteCredito'].toString()) ?? 0,
    saldoDevedor:        double.tryParse(j['saldoDevedor'].toString()) ?? 0,
    prazoPagamentoDias:  (j['prazoPagamentoDias'] as num?)?.toInt() ?? 30,
    diaVencimento:       (j['diaVencimento'] as num?)?.toInt(),
    status:              j['status'] as String? ?? 'ativo',
    score:               (j['score'] as num?)?.toInt() ?? 500,
    risco:               j['risco'] as String? ?? 'medio',
    observacoes:         j['observacoes'] as String?,
    estabelecimentoId:   j['estabelecimentoId'] as String,
    createdAt:           j['createdAt'] as String,
  );

  Map<String, dynamic> toJson() => {
    'nome': nome,
    'cpf': cpf,
    'telefone': telefone,
    'whatsapp': whatsapp,
    'endereco': endereco,
    'cidade': cidade,
    'limiteCredito': limiteCredito,
    'prazoPagamentoDias': prazoPagamentoDias,
    'diaVencimento': diaVencimento,
    'status': status,
    'observacoes': observacoes,
  };
}
