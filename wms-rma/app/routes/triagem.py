from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import RMA, EstadoRMA, HistoricoRMA, ListaOpcao, TipoLista

bp = Blueprint('triagem', __name__, url_prefix='/triagem')


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

        db.session.commit()
        flash(f'Laudo registrado para RMA {rma.numero}.', 'success')
        return redirect(url_for('triagem.index'))

    opcoes_categoria = ListaOpcao.por_tipo(TipoLista.CATEGORIA_DEFEITO)
    return render_template('triagem/laudo.html', rma=rma, opcoes_categoria=opcoes_categoria)
