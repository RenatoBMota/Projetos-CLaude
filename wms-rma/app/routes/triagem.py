from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import RMA, EstadoRMA, HistoricoRMA, ListaOpcao, TipoLista, Apartamento, Produto

bp = Blueprint('triagem', __name__, url_prefix='/triagem')


def _modulos_ocupados_por(filtros, rma, join_produto=False):
    """Ids dos módulos que já têm RMAs ativos atendendo aos filtros informados."""
    from app.models import Numero, Rua, Modulo
    query = db.session.query(Modulo.id).join(
        Rua, Rua.modulo_id == Modulo.id
    ).join(
        Numero, Numero.rua_id == Rua.id
    ).join(
        Apartamento, Apartamento.numero_id == Numero.id
    ).join(
        RMA, RMA.apartamento_id == Apartamento.id
    )
    if join_produto:
        query = query.join(Produto, RMA.produto_id == Produto.id)
    return [row[0] for row in query.filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.id != rma.id,
        *filtros,
    ).distinct().all()]


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


def _alocar_apartamento(rma):
    """Aloca apartamento livre, priorizando agrupar por fornecedor e, na falta
    deste critério, por departamento (categoria do produto). Se nenhum dos
    dois encontrar vaga, usa o primeiro apartamento livre disponível."""
    apt = None

    if rma.fornecedor_id:
        modulo_ids = _modulos_ocupados_por([RMA.fornecedor_id == rma.fornecedor_id], rma)
        apt = _apartamento_livre_em(modulo_ids)

    if not apt and rma.produto_id:
        departamento = db.session.query(Produto.categoria).filter(
            Produto.id == rma.produto_id).scalar()
        if departamento:
            modulo_ids = _modulos_ocupados_por(
                [Produto.categoria == departamento], rma, join_produto=True)
            apt = _apartamento_livre_em(modulo_ids)

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
