class Estabelecimento {
  final String id;
  final String nome;
  final String? cnpj;
  final String? tipo;
  final String? pixKey;

  const Estabelecimento({
    required this.id,
    required this.nome,
    this.cnpj,
    this.tipo,
    this.pixKey,
  });

  factory Estabelecimento.fromJson(Map<String, dynamic> j) => Estabelecimento(
    id:     j['id'] as String,
    nome:   j['nome'] as String,
    cnpj:   j['cnpj'] as String?,
    tipo:   j['tipo'] as String?,
    pixKey: j['pixKey'] as String?,
  );
}

class Usuario {
  final String id;
  final String nome;
  final String email;
  final String role;
  final Estabelecimento? estabelecimento;
  final String? estabelecimentoId;

  const Usuario({
    required this.id,
    required this.nome,
    required this.email,
    required this.role,
    this.estabelecimento,
    this.estabelecimentoId,
  });

  factory Usuario.fromJson(Map<String, dynamic> j) => Usuario(
    id:     j['id'] as String,
    nome:   j['nome'] as String,
    email:  j['email'] as String,
    role:   j['role'] as String,
    estabelecimento: j['estabelecimento'] != null
        ? Estabelecimento.fromJson(j['estabelecimento'])
        : null,
    estabelecimentoId: j['estabelecimentoId'] as String?,
  );
}
