from datetime import datetime, timedelta
from decimal import Decimal
from app.extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


# ── Constantes de domínio ─────────────────────────────────────────────────────

class Roles:
    ADMIN      = 'admin'
    SUPERVISOR = 'supervisor'
    OPERADOR   = 'operador'
    TECNICO    = 'tecnico'
    COMPRAS    = 'compras'
    FINANCEIRO = 'financeiro'
    AUDITOR    = 'auditor'
    FORNECEDOR = 'fornecedor'

    LABELS = {
        'admin':      'Administrador',
        'supervisor': 'Supervisor',
        'operador':   'Operador',
        'tecnico':    'Técnico',
        'compras':    'Compras',
        'financeiro': 'Financeiro',
        'auditor':    'Auditor',
        'fornecedor': 'Fornecedor',
    }
    ALL = list(LABELS.keys())


class EstadoRMA:
    ABERTO               = 'ABERTO'
    AGUARDANDO_TRIAGEM   = 'AGUARDANDO_TRIAGEM'
    EM_ANALISE           = 'EM_ANALISE'
    AGUARDANDO_DEST      = 'AGUARDANDO_DESTINACAO'
    AGUARDANDO_COLETA    = 'AGUARDANDO_COLETA'
    COLETADO             = 'COLETADO'
    FINALIZADO           = 'FINALIZADO'
    CANCELADO            = 'CANCELADO'
    SUCATA               = 'SUCATA'

    LABELS = {
        'ABERTO':               ('Aberto',            'secondary'),
        'AGUARDANDO_TRIAGEM':   ('Ag. Triagem',        'warning'),
        'EM_ANALISE':           ('Em Análise',         'info'),
        'AGUARDANDO_DESTINACAO':('Ag. Destinação',     'primary'),
        'AGUARDANDO_COLETA':    ('Ag. Coleta',         'warning'),
        'COLETADO':             ('Coletado',           'success'),
        'FINALIZADO':           ('Finalizado',         'success'),
        'CANCELADO':            ('Cancelado',          'danger'),
        'SUCATA':               ('Sucata',             'dark'),
    }


class TipoZona:
    ANALISE    = 'ANALISE'
    DEFEITUOSOS= 'DEFEITUOSOS'
    SUCATA     = 'SUCATA'
    QUARENTENA = 'QUARENTENA'
    EXPEDICAO  = 'EXPEDICAO'
    BLOQUEADOS = 'BLOQUEADOS'

    LABELS = {
        'ANALISE':    'Análise',
        'DEFEITUOSOS':'Defeituosos',
        'SUCATA':     'Sucata',
        'QUARENTENA': 'Quarentena',
        'EXPEDICAO':  'Expedição',
        'BLOQUEADOS': 'Bloqueados',
    }


# ── Models ────────────────────────────────────────────────────────────────────

class Configuracao(db.Model):
    __tablename__ = 'configuracoes'
    id      = db.Column(db.Integer, primary_key=True)
    chave   = db.Column(db.String(100), unique=True, nullable=False)
    valor   = db.Column(db.Text)
    tipo    = db.Column(db.String(50), default='texto')
    grupo   = db.Column(db.String(50), default='geral')

    @classmethod
    def get(cls, chave, default=None):
        c = cls.query.filter_by(chave=chave).first()
        return c.valor if c else default

    @classmethod
    def set(cls, chave, valor, tipo='texto', grupo='geral'):
        c = cls.query.filter_by(chave=chave).first()
        if c:
            c.valor = valor
        else:
            c = cls(chave=chave, valor=valor, tipo=tipo, grupo=grupo)
            db.session.add(c)
        db.session.commit()

    @classmethod
    def get_all_dict(cls):
        return {c.chave: c.valor for c in cls.query.all()}


class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id           = db.Column(db.Integer, primary_key=True)
    nome         = db.Column(db.String(150), nullable=False)
    email        = db.Column(db.String(150), unique=True, nullable=False)
    senha_hash   = db.Column(db.String(256), nullable=False)
    role         = db.Column(db.String(50), default=Roles.OPERADOR)
    ativo        = db.Column(db.Boolean, default=True)
    matricula    = db.Column(db.String(50))
    departamento = db.Column(db.String(100))
    telefone     = db.Column(db.String(30))
    ultimo_login = db.Column(db.DateTime)
    criado_em    = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em= db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def check_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    @property
    def role_label(self):
        return Roles.LABELS.get(self.role, self.role)

    def has_role(self, *roles):
        return self.role in roles

    def is_admin(self):
        return self.role == Roles.ADMIN

    def pode_gerenciar_usuarios(self):
        return self.role in (Roles.ADMIN, Roles.SUPERVISOR)


class Fornecedor(db.Model):
    __tablename__ = 'fornecedores'
    id        = db.Column(db.Integer, primary_key=True)
    nome      = db.Column(db.String(200), nullable=False)
    cnpj      = db.Column(db.String(20))
    email     = db.Column(db.String(150))
    telefone  = db.Column(db.String(30))
    contato   = db.Column(db.String(100))
    ativo     = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    produtos  = db.relationship('Produto', backref='fornecedor', lazy='dynamic')
    rmas      = db.relationship('RMA', backref='fornecedor', lazy='dynamic')


class Produto(db.Model):
    __tablename__ = 'produtos'
    id           = db.Column(db.Integer, primary_key=True)
    codigo       = db.Column(db.String(50), unique=True, nullable=False)
    descricao    = db.Column(db.String(300), nullable=False)
    ean          = db.Column(db.String(20))
    marca        = db.Column(db.String(100))
    categoria    = db.Column(db.String(100))
    fornecedor_id= db.Column(db.Integer, db.ForeignKey('fornecedores.id'))
    peso_kg      = db.Column(db.Float)
    ativo        = db.Column(db.Boolean, default=True)
    criado_em    = db.Column(db.DateTime, default=datetime.utcnow)
    rmas         = db.relationship('RMA', backref='produto', lazy='dynamic')


class Armazem(db.Model):
    __tablename__ = 'armazens'
    id       = db.Column(db.Integer, primary_key=True)
    codigo   = db.Column(db.String(20), unique=True, nullable=False)
    nome     = db.Column(db.String(200), nullable=False)
    endereco = db.Column(db.String(300))
    ativo    = db.Column(db.Boolean, default=True)
    zonas    = db.relationship('Zona', backref='armazem', lazy='dynamic')


class Zona(db.Model):
    __tablename__ = 'zonas'
    id            = db.Column(db.Integer, primary_key=True)
    armazem_id    = db.Column(db.Integer, db.ForeignKey('armazens.id'), nullable=False)
    codigo        = db.Column(db.String(20), nullable=False)
    nome          = db.Column(db.String(100), nullable=False)
    tipo          = db.Column(db.String(50))
    capacidade_max= db.Column(db.Integer)
    ativa         = db.Column(db.Boolean, default=True)
    posicoes      = db.relationship('Posicao', backref='zona', lazy='dynamic')

    @property
    def tipo_label(self):
        return TipoZona.LABELS.get(self.tipo, self.tipo or '')

    @property
    def ocupacao_pct(self):
        total = self.posicoes.count()
        if not total:
            return 0
        ocupadas = self.posicoes.filter_by(ocupada=True).count()
        return round(ocupadas / total * 100)


class Posicao(db.Model):
    __tablename__ = 'posicoes'
    id             = db.Column(db.Integer, primary_key=True)
    zona_id        = db.Column(db.Integer, db.ForeignKey('zonas.id'), nullable=False)
    codigo         = db.Column(db.String(50), unique=True, nullable=False)
    ocupada        = db.Column(db.Boolean, default=False)
    peso_maximo_kg = db.Column(db.Float)
    rmas           = db.relationship('RMA', backref='posicao', lazy='dynamic')


class RMA(db.Model):
    __tablename__ = 'rmas'
    id                = db.Column(db.Integer, primary_key=True)
    numero            = db.Column(db.String(50), unique=True, nullable=False)
    estado            = db.Column(db.String(50), default=EstadoRMA.ABERTO)

    # Canal e cliente
    canal             = db.Column(db.String(50), default='LOJA')
    cliente_nome      = db.Column(db.String(200))
    cliente_documento = db.Column(db.String(30))
    loja_origem       = db.Column(db.String(100))

    # Produto e fornecedor
    produto_id        = db.Column(db.Integer, db.ForeignKey('produtos.id'))
    fornecedor_id     = db.Column(db.Integer, db.ForeignKey('fornecedores.id'))
    quantidade        = db.Column(db.Integer, default=1)
    numero_serie      = db.Column(db.String(100))
    nf_original       = db.Column(db.String(50))

    # Problema
    motivo_devolucao  = db.Column(db.String(200))
    descricao_defeito = db.Column(db.Text)
    categoria_defeito = db.Column(db.String(100))

    # Laudo / Destinação
    laudo_tecnico     = db.Column(db.Text)
    disposicao        = db.Column(db.String(50))
    posicao_id        = db.Column(db.Integer, db.ForeignKey('posicoes.id'))

    # Financeiro
    valor_produto     = db.Column(db.Numeric(10, 2))
    valor_credito     = db.Column(db.Numeric(10, 2))

    # Responsáveis
    operador_id       = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    tecnico_id        = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    operador          = db.relationship('Usuario', foreign_keys=[operador_id])
    tecnico           = db.relationship('Usuario', foreign_keys=[tecnico_id])

    # SLA
    prazo_sla_id      = db.Column(db.Integer, db.ForeignKey('prazos_sla.id'), nullable=True)
    prazo_sla         = db.relationship('PrazoSLA', foreign_keys=[prazo_sla_id])

    # Timestamps
    recebido_em       = db.Column(db.DateTime, default=datetime.utcnow)
    criado_em         = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    finalizado_em     = db.Column(db.DateTime)

    # Relacionamentos
    historico   = db.relationship('HistoricoRMA', backref='rma',
                                  order_by='HistoricoRMA.criado_em', lazy='select')
    documentos  = db.relationship('Documento', backref='rma', lazy='select')

    @property
    def estado_info(self):
        return EstadoRMA.LABELS.get(self.estado, (self.estado, 'secondary'))

    @property
    def estado_label(self):
        return self.estado_info[0]

    @property
    def estado_badge(self):
        return self.estado_info[1]

    @property
    def dias_em_aberto(self):
        fim = self.finalizado_em or datetime.utcnow()
        return (fim - self.recebido_em).days

    @property
    def em_atraso(self):
        if not self.prazo_sla:
            return False
        return (self.prazo_sla.em_atraso and
                self.estado not in (EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO))

    def pode_transitar(self, novo_estado):
        transicoes = {
            EstadoRMA.ABERTO:            [EstadoRMA.AGUARDANDO_TRIAGEM, EstadoRMA.CANCELADO],
            EstadoRMA.AGUARDANDO_TRIAGEM:[EstadoRMA.EM_ANALISE, EstadoRMA.CANCELADO],
            EstadoRMA.EM_ANALISE:        [EstadoRMA.AGUARDANDO_DEST, EstadoRMA.CANCELADO],
            EstadoRMA.AGUARDANDO_DEST:   [EstadoRMA.AGUARDANDO_COLETA, EstadoRMA.SUCATA, EstadoRMA.CANCELADO],
            EstadoRMA.AGUARDANDO_COLETA: [EstadoRMA.COLETADO, EstadoRMA.CANCELADO],
            EstadoRMA.COLETADO:          [EstadoRMA.FINALIZADO],
            EstadoRMA.SUCATA:            [EstadoRMA.FINALIZADO],
        }
        return novo_estado in transicoes.get(self.estado, [])

    def proximas_transicoes(self):
        mapa = {
            EstadoRMA.ABERTO:            [('receber', EstadoRMA.AGUARDANDO_TRIAGEM, 'Receber RMA', 'success')],
            EstadoRMA.AGUARDANDO_TRIAGEM:[('iniciar_triagem', EstadoRMA.EM_ANALISE, 'Iniciar Triagem', 'info')],
            EstadoRMA.EM_ANALISE:        [('concluir_triagem', EstadoRMA.AGUARDANDO_DEST, 'Concluir Triagem', 'primary')],
            EstadoRMA.AGUARDANDO_DEST:   [
                ('solicitar_coleta', EstadoRMA.AGUARDANDO_COLETA, 'Solicitar Coleta', 'warning'),
                ('sucatear', EstadoRMA.SUCATA, 'Enviar p/ Sucata', 'dark'),
            ],
            EstadoRMA.AGUARDANDO_COLETA: [('confirmar_coleta', EstadoRMA.COLETADO, 'Confirmar Coleta', 'success')],
            EstadoRMA.COLETADO:          [('finalizar', EstadoRMA.FINALIZADO, 'Finalizar', 'success')],
            EstadoRMA.SUCATA:            [('finalizar', EstadoRMA.FINALIZADO, 'Finalizar', 'success')],
        }
        transicoes = mapa.get(self.estado, [])
        if self.estado not in (EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO):
            transicoes.append(('cancelar', EstadoRMA.CANCELADO, 'Cancelar RMA', 'danger'))
        return transicoes


class HistoricoRMA(db.Model):
    __tablename__ = 'historico_rma'
    id             = db.Column(db.Integer, primary_key=True)
    rma_id         = db.Column(db.Integer, db.ForeignKey('rmas.id'), nullable=False)
    estado_anterior= db.Column(db.String(50))
    estado_novo    = db.Column(db.String(50))
    observacao     = db.Column(db.Text)
    usuario_id     = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    usuario        = db.relationship('Usuario')
    criado_em      = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def estado_anterior_label(self):
        return EstadoRMA.LABELS.get(self.estado_anterior, (self.estado_anterior or '', 'secondary'))[0]

    @property
    def estado_novo_label(self):
        return EstadoRMA.LABELS.get(self.estado_novo, (self.estado_novo or '', 'secondary'))[0]


class Documento(db.Model):
    __tablename__ = 'documentos'
    id         = db.Column(db.Integer, primary_key=True)
    rma_id     = db.Column(db.Integer, db.ForeignKey('rmas.id'), nullable=False)
    nome       = db.Column(db.String(255), nullable=False)
    tipo       = db.Column(db.String(50))
    caminho    = db.Column(db.String(500))
    tamanho    = db.Column(db.Integer)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    usuario    = db.relationship('Usuario')
    criado_em  = db.Column(db.DateTime, default=datetime.utcnow)


class PoliticaSLA(db.Model):
    __tablename__ = 'politicas_sla'
    id                   = db.Column(db.Integer, primary_key=True)
    nome                 = db.Column(db.String(200), nullable=False)
    canal                = db.Column(db.String(50), default='TODOS')
    categoria            = db.Column(db.String(100))
    prazo_triagem_dias   = db.Column(db.Integer, default=5)
    prazo_resolucao_dias = db.Column(db.Integer, default=15)
    prazo_coleta_dias    = db.Column(db.Integer, default=7)
    ativa                = db.Column(db.Boolean, default=True)
    criado_em            = db.Column(db.DateTime, default=datetime.utcnow)
    prazos               = db.relationship('PrazoSLA', backref='politica', lazy='dynamic')


class PrazoSLA(db.Model):
    __tablename__ = 'prazos_sla'
    id               = db.Column(db.Integer, primary_key=True)
    rma_id           = db.Column(db.Integer, db.ForeignKey('rmas.id'), nullable=True)
    politica_id      = db.Column(db.Integer, db.ForeignKey('politicas_sla.id'))
    prazo_triagem    = db.Column(db.DateTime)
    prazo_resolucao  = db.Column(db.DateTime)
    prazo_coleta     = db.Column(db.DateTime)
    em_atraso        = db.Column(db.Boolean, default=False)
    violado          = db.Column(db.Boolean, default=False)
    criado_em        = db.Column(db.DateTime, default=datetime.utcnow)
    rma_ref          = db.relationship('RMA', foreign_keys=[rma_id],
                                       primaryjoin='PrazoSLA.rma_id==RMA.id',
                                       backref=db.backref('prazo_ref', uselist=False))

    def atualizar_status(self):
        agora = datetime.utcnow()
        self.em_atraso = (self.prazo_resolucao and agora > self.prazo_resolucao)
        if self.em_atraso:
            self.violado = True
