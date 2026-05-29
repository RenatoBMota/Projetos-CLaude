from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Produto, Fornecedor

bp = Blueprint('produtos', __name__, url_prefix='/produtos')


@bp.route('/')
@login_required
def index():
    busca     = request.args.get('busca', '')
    forn_id   = request.args.get('fornecedor_id', type=int)
    categoria = request.args.get('categoria', '')
    page      = request.args.get('page', 1, type=int)

    q = Produto.query.filter_by(ativo=True)
    if busca:
        q = q.filter(db.or_(
            Produto.codigo.ilike(f'%{busca}%'),
            Produto.descricao.ilike(f'%{busca}%'),
            Produto.ean.ilike(f'%{busca}%'),
        ))
    if forn_id:
        q = q.filter_by(fornecedor_id=forn_id)
    if categoria:
        q = q.filter_by(categoria=categoria)

    produtos     = q.order_by(Produto.descricao).paginate(page=page, per_page=25, error_out=False)
    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    categorias   = db.session.query(Produto.categoria).filter(
        Produto.categoria.isnot(None)
    ).distinct().all()
    categorias   = [c[0] for c in categorias if c[0]]

    return render_template('produtos/index.html',
        produtos=produtos,
        fornecedores=fornecedores,
        categorias=categorias,
        filtro_busca=busca,
        filtro_forn=forn_id,
        filtro_categoria=categoria,
    )


@bp.route('/novo', methods=['GET', 'POST'])
@login_required
def novo():
    if request.method == 'POST':
        codigo = request.form.get('codigo', '').strip().upper()
        if Produto.query.filter_by(codigo=codigo).first():
            flash(f'Código "{codigo}" já cadastrado.', 'warning')
        else:
            p = Produto(
                codigo=codigo,
                descricao=request.form.get('descricao'),
                ean=request.form.get('ean'),
                marca=request.form.get('marca'),
                categoria=request.form.get('categoria'),
                fornecedor_id=request.form.get('fornecedor_id', type=int) or None,
                peso_kg=request.form.get('peso_kg', type=float),
                valor_unitario=request.form.get('valor_unitario', type=float),
                observacoes=request.form.get('observacoes'),
                comprador=request.form.get('comprador'),
            )
            db.session.add(p)
            db.session.commit()
            flash(f'Produto {codigo} cadastrado!', 'success')
            return redirect(url_for('produtos.index'))

    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    return render_template('produtos/form.html', produto=None, fornecedores=fornecedores)


@bp.route('/<int:prod_id>/editar', methods=['GET', 'POST'])
@login_required
def editar(prod_id):
    p = Produto.query.get_or_404(prod_id)
    if request.method == 'POST':
        p.descricao      = request.form.get('descricao')
        p.ean            = request.form.get('ean')
        p.marca          = request.form.get('marca')
        p.categoria      = request.form.get('categoria')
        p.fornecedor_id  = request.form.get('fornecedor_id', type=int) or None
        p.peso_kg        = request.form.get('peso_kg', type=float)
        p.valor_unitario = request.form.get('valor_unitario', type=float)
        p.observacoes    = request.form.get('observacoes')
        p.comprador      = request.form.get('comprador')
        db.session.commit()
        flash('Produto atualizado!', 'success')
        return redirect(url_for('produtos.index'))

    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    return render_template('produtos/form.html', produto=p, fornecedores=fornecedores)
