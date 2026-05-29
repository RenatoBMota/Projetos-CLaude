from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Inventario, ItemInventario, Apartamento, RMA, Fornecedor

bp = Blueprint('auditoria', __name__, url_prefix='/auditoria')


@bp.route('/')
@login_required
def index():
    inventarios = Inventario.query.order_by(Inventario.criado_em.desc()).all()
    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    return render_template('auditoria/index.html', inventarios=inventarios, fornecedores=fornecedores)


@bp.route('/novo', methods=['POST'])
@login_required
def novo():
    nome = request.form.get('nome', '').strip() or f'Inventário {datetime.utcnow().strftime("%d/%m/%Y")}'
    tipo_filtro   = request.form.get('tipo_filtro', 'todos')
    fornecedor_id = request.form.get('fornecedor_id', type=int)
    end_ini       = request.form.get('end_ini', '').strip().upper()
    end_fim       = request.form.get('end_fim', '').strip().upper()

    inv = Inventario(nome=nome, criado_por_id=current_user.id)
    db.session.add(inv)
    db.session.flush()

    q = Apartamento.query.filter_by(ocupado=True)

    if tipo_filtro == 'fornecedor' and fornecedor_id:
        q = q.join(RMA, RMA.apartamento_id == Apartamento.id)\
              .filter(RMA.fornecedor_id == fornecedor_id,
                      RMA.estado.notin_(['FINALIZADO', 'CANCELADO']))
    elif tipo_filtro == 'endereco' and end_ini:
        if end_fim:
            q = q.filter(Apartamento.endereco >= end_ini,
                         Apartamento.endereco <= end_fim)
        else:
            q = q.filter(Apartamento.endereco >= end_ini)

    apts = q.order_by(Apartamento.endereco).all()
    for apt in apts:
        rma = RMA.query.filter_by(apartamento_id=apt.id).filter(
            RMA.estado.notin_(['FINALIZADO', 'CANCELADO'])
        ).first()
        db.session.add(ItemInventario(
            inventario_id=inv.id,
            apartamento_id=apt.id,
            rma_id=rma.id if rma else None,
            ean_esperado=rma.produto.ean if rma and rma.produto else None,
            qtd_esperada=rma.quantidade if rma else 1,
        ))

    db.session.commit()
    flash(f'Inventário "{inv.nome}" criado com {len(apts)} posições.', 'success')
    return redirect(url_for('auditoria.detalhe', inv_id=inv.id))


@bp.route('/<int:inv_id>')
@login_required
def detalhe(inv_id):
    inv = Inventario.query.get_or_404(inv_id)
    return render_template('auditoria/detalhe.html', inv=inv)


@bp.route('/<int:inv_id>/verificar', methods=['POST'])
@login_required
def verificar(inv_id):
    inv = Inventario.query.get_or_404(inv_id)
    if inv.estado != 'ABERTO':
        return jsonify({'ok': False, 'msg': 'Inventário finalizado'}), 400

    item_id = request.json.get('item_id')
    ean_lido = request.json.get('ean_lido', '').strip()
    qtd_encontrada = request.json.get('qtd_encontrada', 1)

    item = ItemInventario.query.filter_by(id=item_id, inventario_id=inv_id).first_or_404()
    item.ean_lido = ean_lido
    item.qtd_encontrada = qtd_encontrada
    item.verificado_em = datetime.utcnow()

    if not ean_lido and not qtd_encontrada:
        item.status = 'AUSENTE'
    elif ean_lido and ean_lido == item.ean_esperado and qtd_encontrada == item.qtd_esperada:
        item.status = 'OK'
    else:
        item.status = 'DIVERGENTE'

    db.session.commit()
    return jsonify({'ok': True, 'status': item.status})


@bp.route('/<int:inv_id>/finalizar', methods=['POST'])
@login_required
def finalizar(inv_id):
    inv = Inventario.query.get_or_404(inv_id)
    if inv.estado != 'ABERTO':
        flash('Inventário já finalizado.', 'warning')
        return redirect(url_for('auditoria.detalhe', inv_id=inv_id))

    for item in inv.itens.filter_by(status='PENDENTE').all():
        item.status = 'AUSENTE'

    inv.estado = 'FINALIZADO'
    inv.finalizado_em = datetime.utcnow()
    db.session.commit()
    flash('Inventário finalizado.', 'success')
    return redirect(url_for('auditoria.detalhe', inv_id=inv_id))
