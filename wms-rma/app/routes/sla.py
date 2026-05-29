from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from datetime import datetime
from sqlalchemy import func
from app.extensions import db
from app.models import PoliticaSLA, PrazoSLA, RMA, EstadoRMA, Fornecedor, Produto

bp = Blueprint('sla', __name__, url_prefix='/sla')


@bp.route('/')
@login_required
def index():
    # Atualiza todos os prazos pendentes
    agora = datetime.utcnow()
    prazos = PrazoSLA.query.join(RMA, PrazoSLA.rma_id == RMA.id).filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO])
    ).all()
    for p in prazos:
        p.atualizar_status()
    db.session.commit()

    # Totais
    total_ativos   = RMA.query.filter(
        RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO])
    ).count()
    total_atraso   = PrazoSLA.query.filter_by(em_atraso=True).join(
        RMA, PrazoSLA.rma_id == RMA.id
    ).filter(RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO])).count()
    total_ok       = total_ativos - total_atraso
    total_violados = PrazoSLA.query.filter_by(violado=True).count()

    # RMAs em atraso (com filtro opcional de comprador)
    comprador = request.args.get('comprador', '').strip()
    q_atrasados = RMA.query.join(PrazoSLA, RMA.prazo_sla_id == PrazoSLA.id)\
                           .filter(PrazoSLA.em_atraso == True)\
                           .filter(RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]))
    if comprador:
        q_atrasados = q_atrasados.join(Produto, RMA.produto_id == Produto.id)\
                                 .filter(Produto.comprador.ilike(f'%{comprador}%'))
    rmas_atrasados = q_atrasados.order_by(PrazoSLA.prazo_resolucao).all()

    # Por fornecedor - ranking de atrasos
    por_fornecedor = db.session.query(
        Fornecedor.nome,
        func.count(RMA.id).label('total'),
        func.sum(db.case((PrazoSLA.em_atraso == True, 1), else_=0)).label('atrasados')
    ).join(RMA, RMA.fornecedor_id == Fornecedor.id)\
     .join(PrazoSLA, RMA.prazo_sla_id == PrazoSLA.id)\
     .group_by(Fornecedor.id)\
     .order_by(db.desc('atrasados'))\
     .limit(10).all()

    politicas = PoliticaSLA.query.filter_by(ativa=True).all()

    return render_template('sla/index.html',
        total_ativos=total_ativos,
        total_atraso=total_atraso,
        total_ok=total_ok,
        total_violados=total_violados,
        rmas_atrasados=rmas_atrasados,
        por_fornecedor=por_fornecedor,
        politicas=politicas,
        agora=agora,
        filtro_comprador=comprador,
    )


@bp.route('/politicas')
@login_required
def politicas():
    pols = PoliticaSLA.query.order_by(PoliticaSLA.nome).all()
    return render_template('sla/politicas.html', politicas=pols)


@bp.route('/politicas/nova', methods=['POST'])
@login_required
def nova_politica():
    p = PoliticaSLA(
        nome=request.form.get('nome'),
        canal=request.form.get('canal', 'TODOS'),
        categoria=request.form.get('categoria'),
        prazo_triagem_dias=request.form.get('prazo_triagem_dias', 5, type=int),
        prazo_resolucao_dias=request.form.get('prazo_resolucao_dias', 15, type=int),
        prazo_coleta_dias=request.form.get('prazo_coleta_dias', 7, type=int),
    )
    db.session.add(p)
    db.session.commit()
    flash(f'Política "{p.nome}" criada!', 'success')
    return redirect(url_for('sla.politicas'))


@bp.route('/politicas/<int:pol_id>/editar', methods=['POST'])
@login_required
def editar_politica(pol_id):
    p = PoliticaSLA.query.get_or_404(pol_id)
    p.nome                = request.form.get('nome')
    p.canal               = request.form.get('canal', 'TODOS')
    p.categoria           = request.form.get('categoria')
    p.prazo_triagem_dias  = request.form.get('prazo_triagem_dias', 5, type=int)
    p.prazo_resolucao_dias= request.form.get('prazo_resolucao_dias', 15, type=int)
    p.prazo_coleta_dias   = request.form.get('prazo_coleta_dias', 7, type=int)
    p.ativa               = request.form.get('ativa') == 'on'
    db.session.commit()
    flash('Política atualizada!', 'success')
    return redirect(url_for('sla.politicas'))


@bp.route('/politicas/<int:pol_id>/toggle', methods=['POST'])
@login_required
def toggle_politica(pol_id):
    p = PoliticaSLA.query.get_or_404(pol_id)
    p.ativa = not p.ativa
    db.session.commit()
    status = 'ativada' if p.ativa else 'desativada'
    flash(f'Política {status}.', 'info')
    return redirect(url_for('sla.politicas'))
