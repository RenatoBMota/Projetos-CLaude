from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import RMA, EstadoRMA, HistoricoRMA, ListaOpcao, TipoLista, Apartamento

bp = Blueprint('triagem', __name__, url_prefix='/triagem')


def _alocar_apartamento(rma):
    """Aloca apartamento livre, tentando agrupar RMAs do mesmo fornecedor."""
    from app.models import Numero, Rua, Modulo
    apt = None

    if rma.fornecedor_id:
        # Módulos que já têm RMAs deste fornecedor
        modulo_ids = [row[0] for row in db.session.query(Modulo.id).join(
            Rua, Rua.modulo_id == Modulo.id
        ).join(
            Numero, Numero.rua_id == Rua.id
        ).join(
            Apartamento, Apartamento.numero_id == Numero.id
        ).join(
            RMA, RMA.apartamento_id == Apartamento.id
        ).filter(
            RMA.fornecedor_id == rma.fornecedor_id,
            RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
            RMA.id != rma.id,
        ).distinct().all()]

        if modulo_ids:
            apt = Apartamento.query.join(
                Numero, Apartamento.numero_id == Numero.id
            ).join(
                Rua, Numero.rua_id == Rua.id
            ).filter(
                Rua.modulo_id.in_(modulo_ids),
                Apartamento.ocupado == False,
            ).first()

    if not apt:
        apt = Apartamento.query.filter_by(ocupado=False).first()

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

        # Auto-atribuir endereço agrupando por fornecedor
        if not rma.apartamento_id:
            _alocar_apartamento(rma)

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
