from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required
from datetime import datetime, timedelta
from sqlalchemy import func
from app.extensions import db
from app.models import RMA, EstadoRMA, PrazoSLA, Usuario, Fornecedor, Produto

bp = Blueprint('dashboard', __name__)


@bp.route('/fluxo-rma')
@login_required
def fluxo_rma():
    return render_template('dashboard/fluxo_rma.html')


@bp.route('/dashboard')
@login_required
def index():
    hoje = datetime.utcnow()
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Date filter — default to current month
    data_ini_str = request.args.get('data_ini', '')
    data_fim_str = request.args.get('data_fim', '')
    if data_ini_str:
        data_ini = datetime.strptime(data_ini_str, '%Y-%m-%d')
    else:
        data_ini = inicio_mes
        data_ini_str = inicio_mes.strftime('%Y-%m-%d')
    if data_fim_str:
        data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d') + timedelta(days=1)
    else:
        data_fim = hoje + timedelta(days=1)
        data_fim_str = hoje.strftime('%Y-%m-%d')

    # KPIs principais
    total_rmas       = RMA.query.count()
    rmas_abertos     = RMA.query.filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO])
    ).count()
    rmas_mes         = RMA.query.filter(
        RMA.criado_em >= data_ini, RMA.criado_em < data_fim
    ).count()
    rmas_finalizados = RMA.query.filter_by(estado=EstadoRMA.FINALIZADO).count()
    rmas_cancelados  = RMA.query.filter_by(estado=EstadoRMA.CANCELADO).count()

    # Valor total no período
    valor_mes = float(db.session.query(
        func.sum(RMA.valor_produto * RMA.quantidade)
    ).filter(
        RMA.criado_em >= data_ini, RMA.criado_em < data_fim,
        RMA.valor_produto.isnot(None),
    ).scalar() or 0)

    # Valor em aberto
    valor_abertos = float(db.session.query(
        func.sum(RMA.valor_produto * RMA.quantidade)
    ).filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]),
        RMA.valor_produto.isnot(None),
    ).scalar() or 0)

    # SLA
    em_atraso = PrazoSLA.query.filter_by(em_atraso=True, violado=True).count()
    sla_ok    = rmas_abertos - em_atraso if rmas_abertos > em_atraso else 0

    # Tempo médio de resolução
    rmas_c_tempo = RMA.query.filter(
        RMA.finalizado_em.isnot(None),
        RMA.recebido_em.isnot(None)
    ).all()
    if rmas_c_tempo:
        media_dias = sum((r.finalizado_em - r.recebido_em).days for r in rmas_c_tempo) / len(rmas_c_tempo)
    else:
        media_dias = 0

    # Por estado
    por_estado = [
        [e, c]
        for e, c in db.session.query(RMA.estado, func.count(RMA.id)).group_by(RMA.estado).all()
    ]

    # Por fornecedor top 5 no período
    por_fornecedor = [
        [n, c]
        for n, c in db.session.query(
            Fornecedor.nome, func.count(RMA.id)
        ).join(RMA, RMA.fornecedor_id == Fornecedor.id)
         .filter(RMA.criado_em >= data_ini, RMA.criado_em < data_fim)
         .group_by(Fornecedor.id)
         .order_by(func.count(RMA.id).desc())
         .limit(5).all()
    ]

    # Por loja de origem no período
    por_loja = []
    for loja, cnt in db.session.query(
        RMA.loja_origem, func.count(RMA.id)
    ).filter(
        RMA.criado_em >= data_ini, RMA.criado_em < data_fim
    ).group_by(RMA.loja_origem).order_by(func.count(RMA.id).desc()).all():
        por_loja.append([loja or 'Não informado', cnt])

    # Por departamento/categoria no período
    por_dept = []
    for dept, cnt in db.session.query(
        Produto.categoria, func.count(RMA.id)
    ).join(RMA, RMA.produto_id == Produto.id)\
     .filter(RMA.criado_em >= data_ini, RMA.criado_em < data_fim)\
     .group_by(Produto.categoria)\
     .order_by(func.count(RMA.id).desc()).all():
        por_dept.append([dept or 'Sem categoria', cnt])

    # Evolução dos últimos 6 meses
    evolucao = []
    for i in range(5, -1, -1):
        mes_ini = (hoje.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if i == 0:
            mes_fim = hoje
        else:
            mes_fim = (mes_ini.replace(day=28) + timedelta(days=4)).replace(day=1)
        count = RMA.query.filter(
            RMA.criado_em >= mes_ini,
            RMA.criado_em < mes_fim
        ).count()
        evolucao.append({'mes': mes_ini.strftime('%b/%y'), 'count': count})

    # Últimos RMAs no período
    ultimos_rmas = RMA.query.filter(
        RMA.criado_em >= data_ini, RMA.criado_em < data_fim
    ).order_by(RMA.criado_em.desc()).limit(8).all()

    # Alertas
    alertas = RMA.query.join(PrazoSLA, RMA.prazo_sla_id == PrazoSLA.id)\
                       .filter(PrazoSLA.em_atraso == True)\
                       .filter(RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]))\
                       .limit(5).all()

    return render_template('dashboard/index.html',
        total_rmas=total_rmas,
        rmas_abertos=rmas_abertos,
        rmas_mes=rmas_mes,
        rmas_finalizados=rmas_finalizados,
        rmas_cancelados=rmas_cancelados,
        em_atraso=em_atraso,
        sla_ok=sla_ok,
        media_dias=round(media_dias, 1),
        valor_mes=valor_mes,
        valor_abertos=valor_abertos,
        por_estado=por_estado,
        por_fornecedor=por_fornecedor,
        por_loja=por_loja,
        por_dept=por_dept,
        evolucao=evolucao,
        ultimos_rmas=ultimos_rmas,
        alertas=alertas,
        filtro_data_ini=data_ini_str,
        filtro_data_fim=data_fim_str,
    )


@bp.route('/api/dashboard/kpis')
@login_required
def api_kpis():
    hoje = datetime.utcnow()
    por_estado = db.session.query(RMA.estado, func.count(RMA.id)).group_by(RMA.estado).all()
    return jsonify({
        'por_estado': [{'estado': e, 'count': c} for e, c in por_estado],
        'timestamp': hoje.isoformat(),
    })
