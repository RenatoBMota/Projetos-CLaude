from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from sqlalchemy import func
from app.extensions import db
from app.models import RMA, EstadoRMA, HistoricoRMA, ListaOpcao, TipoLista, Apartamento, Produto

bp = Blueprint('triagem', __name__, url_prefix='/triagem')


# Quantidade máxima de RMAs ativos por apartamento antes de abrir novo endereço
_CAPACIDADE_APT = 10


def _apt_ids_com_grupo(filtros, rma, join_produto=False):
    """IDs de apartamentos que já têm RMAs ativos correspondendo aos filtros."""
    q = db.session.query(Apartamento.id).join(
        RMA, RMA.apartamento_id == Apartamento.id
    )
    if join_produto:
        q = q.join(Produto, RMA.produto_id == Produto.id)
    return [row[0] for row in q.filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.id != rma.id,
        *filtros,
    ).distinct().order_by(Apartamento.id).all()]


def _apt_com_espaco_em(apt_ids):
    """Dentre os apartamentos informados, retorna o primeiro que ainda não atingiu a capacidade."""
    if not apt_ids:
        return None
    contagem = dict(db.session.query(
        RMA.apartamento_id,
        func.count(RMA.id),
    ).filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.apartamento_id.in_(apt_ids),
    ).group_by(RMA.apartamento_id).all())

    for apt_id in apt_ids:
        if contagem.get(apt_id, 0) < _CAPACIDADE_APT:
            return Apartamento.query.filter_by(id=apt_id).first()
    return None


def _apt_sem_rmas_ativos():
    """Primeiro apartamento sem nenhum RMA ativo — ponto de partida limpo para novo grupo."""
    em_uso = [row[0] for row in db.session.query(RMA.apartamento_id).filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.apartamento_id.isnot(None),
    ).distinct().all()]
    if em_uso:
        return Apartamento.query.filter(Apartamento.id.notin_(em_uso)).first()
    return Apartamento.query.first()


def _alocar_apartamento(rma):
    """Agrupa RMAs no mesmo endereço até _CAPACIDADE_APT itens ativos.
    Quando o endereço lota, abre o próximo endereço do mesmo grupo.
    Critério: 1° mesmo fornecedor, 2° mesmo departamento, 3° endereço novo."""
    apt = None

    # 1. Mesmo fornecedor com espaço disponível no endereço
    if rma.fornecedor_id:
        apt_ids = _apt_ids_com_grupo([RMA.fornecedor_id == rma.fornecedor_id], rma)
        apt = _apt_com_espaco_em(apt_ids)

    # 2. Mesmo departamento com espaço disponível
    if not apt and rma.produto_id:
        departamento = db.session.query(Produto.categoria).filter(
            Produto.id == rma.produto_id).scalar()
        if departamento and departamento.strip():
            dep_norm = departamento.strip().lower()
            apt_ids = _apt_ids_com_grupo(
                [func.lower(func.trim(Produto.categoria)) == dep_norm],
                rma, join_produto=True,
            )
            apt = _apt_com_espaco_em(apt_ids)

    # 3. Endereço vazio para novo grupo (começa limpo, sem mistura)
    if not apt:
        apt = _apt_sem_rmas_ativos()

    # 4. Qualquer endereço ainda não marcado como cheio (último recurso)
    if not apt:
        apt = Apartamento.query.filter(Apartamento.ocupado != True).first()

    if apt:
        rma.apartamento_id = apt.id
        # Atualiza flag de capacidade
        n_ativos = db.session.query(func.count(RMA.id)).filter(
            RMA.apartamento_id == apt.id,
            RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        ).scalar() or 0
        apt.ocupado = (n_ativos + 1 >= _CAPACIDADE_APT)


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
