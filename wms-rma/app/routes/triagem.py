from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from sqlalchemy import func
from app.extensions import db
from app.models import RMA, EstadoRMA, HistoricoRMA, ListaOpcao, TipoLista, Apartamento, Produto

bp = Blueprint('triagem', __name__, url_prefix='/triagem')


def _filtrar_rmas_ativos(query, rma, filtros, join_produto=False):
    if join_produto:
        query = query.join(Produto, RMA.produto_id == Produto.id)
    return query.filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.id != rma.id,
        *filtros,
    ).distinct()


def _ruas_ocupadas_por(filtros, rma, join_produto=False):
    """Ids das ruas que já têm RMAs ativos atendendo aos filtros."""
    from app.models import Numero, Rua
    q = db.session.query(Rua.id).join(
        Numero, Numero.rua_id == Rua.id
    ).join(
        Apartamento, Apartamento.numero_id == Numero.id
    ).join(
        RMA, RMA.apartamento_id == Apartamento.id
    )
    return [row[0] for row in _filtrar_rmas_ativos(q, rma, filtros, join_produto).all()]


def _modulos_ocupados_por(filtros, rma, join_produto=False):
    """Ids dos módulos que já têm RMAs ativos atendendo aos filtros."""
    from app.models import Numero, Rua, Modulo
    q = db.session.query(Modulo.id).join(
        Rua, Rua.modulo_id == Modulo.id
    ).join(
        Numero, Numero.rua_id == Rua.id
    ).join(
        Apartamento, Apartamento.numero_id == Numero.id
    ).join(
        RMA, RMA.apartamento_id == Apartamento.id
    )
    return [row[0] for row in _filtrar_rmas_ativos(q, rma, filtros, join_produto).all()]


def _apartamento_livre_em_ruas(rua_ids):
    from app.models import Numero
    if not rua_ids:
        return None
    return Apartamento.query.join(
        Numero, Apartamento.numero_id == Numero.id
    ).filter(
        Numero.rua_id.in_(rua_ids),
        Apartamento.ocupado != True,
    ).first()


def _apartamento_livre_em(modulo_ids):
    from app.models import Numero, Rua
    if not modulo_ids:
        return None
    return Apartamento.query.join(
        Numero, Apartamento.numero_id == Numero.id
    ).join(
        Rua, Numero.rua_id == Rua.id
    ).filter(
        Rua.modulo_id.in_(modulo_ids),
        Apartamento.ocupado != True,
    ).first()


def _primeira_rua_vazia():
    """Primeira rua sem nenhum RMA ativo — ponto de partida para novo fornecedor."""
    from app.models import Numero, Rua
    rua_ids_com_rma = [row[0] for row in db.session.query(Rua.id).join(
        Numero, Numero.rua_id == Rua.id
    ).join(
        Apartamento, Apartamento.numero_id == Numero.id
    ).join(
        RMA, RMA.apartamento_id == Apartamento.id
    ).filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
    ).distinct().all()]

    rua_vazia = (
        Rua.query.filter(Rua.id.notin_(rua_ids_com_rma)).first()
        if rua_ids_com_rma else Rua.query.first()
    )
    if not rua_vazia:
        return None
    return Apartamento.query.join(
        Numero, Apartamento.numero_id == Numero.id
    ).filter(
        Numero.rua_id == rua_vazia.id,
        Apartamento.ocupado != True,
    ).first()


def _alocar_apartamento(rma):
    """Aloca apartamento agrupando por fornecedor → departamento → rua vazia → qualquer.
    Dentro de cada critério tenta mesma rua primeiro (compacto); só amplia para
    o módulo inteiro se a rua estiver cheia. Novos fornecedores recebem uma rua
    totalmente vazia para evitar mistura desde o início."""
    apt = None

    def _tentar_por(filtros, join_produto=False):
        nonlocal apt
        if apt:
            return
        # Mesma rua → mais compacto
        rua_ids = _ruas_ocupadas_por(filtros, rma, join_produto=join_produto)
        apt = _apartamento_livre_em_ruas(rua_ids)
        # Mesmo módulo → rua cheia, mas módulo tem espaço
        if not apt:
            modulo_ids = _modulos_ocupados_por(filtros, rma, join_produto=join_produto)
            apt = _apartamento_livre_em(modulo_ids)

    # 1. Agrupar por fornecedor
    if rma.fornecedor_id:
        _tentar_por([RMA.fornecedor_id == rma.fornecedor_id])

    # 2. Agrupar por departamento (categoria do produto)
    if not apt and rma.produto_id:
        departamento = db.session.query(Produto.categoria).filter(
            Produto.id == rma.produto_id).scalar()
        if departamento and departamento.strip():
            dep_norm = departamento.strip().lower()
            _tentar_por(
                [func.lower(func.trim(Produto.categoria)) == dep_norm],
                join_produto=True,
            )

    # 3. Rua completamente vazia (novo fornecedor começa num espaço limpo)
    if not apt:
        apt = _primeira_rua_vazia()

    # 4. Qualquer endereço livre
    if not apt:
        apt = Apartamento.query.filter(Apartamento.ocupado != True).first()

    if apt:
        rma.apartamento_id = apt.id
        apt.ocupado = True


@bp.route('/')
@login_required
def index():
    rmas_aguardando = RMA.query.filter_by(estado=EstadoRMA.AGUARDANDO_TRIAGEM)\
                               .order_by(RMA.recebido_em).all()
    rmas_em_analise = RMA.query.filter_by(estado=EstadoRMA.EM_ANALISE)\
                               .order_by(RMA.recebido_em).all()
    return render_template('triagem/index.html',
        rmas_aguardando=rmas_aguardando,
        rmas_em_analise=rmas_em_analise,
    )


@bp.route('/<int:rma_id>', methods=['GET', 'POST'])
@login_required
def laudo(rma_id):
    rma = RMA.query.get_or_404(rma_id)

    if request.method == 'POST':
        laudo_texto  = request.form.get('laudo_tecnico', '')
        categoria    = request.form.get('categoria_defeito', '')
        observacao   = request.form.get('observacao', '')

        estado_anterior = rma.estado
        novo_estado = EstadoRMA.AGUARDANDO_DEST

        rma.laudo_tecnico     = laudo_texto
        rma.categoria_defeito = categoria
        rma.disposicao        = 'NEGOCIACAO_FORNECEDOR'  # sempre fixo após triagem
        rma.tecnico_id        = current_user.id
        rma.estado            = novo_estado

        db.session.add(HistoricoRMA(
            rma_id=rma.id,
            estado_anterior=estado_anterior,
            estado_novo=novo_estado,
            observacao=observacao or 'Laudo técnico concluído.',
            usuario_id=current_user.id,
        ))

        if rma.prazo_sla:
            rma.prazo_sla.atualizar_status()

        # Auto-atribuir endereço agrupando por fornecedor / departamento
        if not rma.apartamento_id:
            _alocar_apartamento(rma)
            if not rma.apartamento_id:
                flash(
                    'Laudo registrado, mas nenhum endereço de armazém disponível foi encontrado. '
                    'Verifique se o armazém está configurado e possui posições livres.',
                    'warning',
                )

        db.session.commit()
        flash(f'Laudo registrado para RMA {rma.numero}.', 'success')
        return redirect(url_for('triagem.etiqueta', rma_id=rma.id))

    opcoes_categoria = ListaOpcao.por_tipo(TipoLista.CATEGORIA_DEFEITO)
    return render_template('triagem/laudo.html', rma=rma, opcoes_categoria=opcoes_categoria)


@bp.route('/<int:rma_id>/etiqueta')
@login_required
def etiqueta(rma_id):
    rma = RMA.query.get_or_404(rma_id)
    return render_template('triagem/etiqueta.html', rma=rma)
