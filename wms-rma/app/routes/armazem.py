from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Armazem, Zona, Posicao, TipoZona

bp = Blueprint('armazem', __name__, url_prefix='/armazem')


@bp.route('/')
@login_required
def index():
    armazens = Armazem.query.filter_by(ativo=True).all()
    return render_template('armazem/index.html', armazens=armazens, TipoZona=TipoZona)


@bp.route('/zona/<int:zona_id>')
@login_required
def zona_detalhe(zona_id):
    zona = Zona.query.get_or_404(zona_id)
    posicoes = zona.posicoes.all()
    return render_template('armazem/zona.html', zona=zona, posicoes=posicoes)


@bp.route('/nova-posicao', methods=['POST'])
@login_required
def nova_posicao():
    zona_id = request.form.get('zona_id', type=int)
    codigo  = request.form.get('codigo', '').strip().upper()
    peso_max= request.form.get('peso_maximo_kg', type=float)

    if not zona_id or not codigo:
        flash('Zona e código são obrigatórios.', 'danger')
        return redirect(url_for('armazem.index'))

    if Posicao.query.filter_by(codigo=codigo).first():
        flash(f'Código de posição "{codigo}" já existe.', 'warning')
        return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))

    pos = Posicao(zona_id=zona_id, codigo=codigo, peso_maximo_kg=peso_max)
    db.session.add(pos)
    db.session.commit()
    flash(f'Posição {codigo} criada.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


@bp.route('/gerar-posicoes', methods=['POST'])
@login_required
def gerar_posicoes():
    zona_id   = request.form.get('zona_id', type=int)
    prefixo   = request.form.get('prefixo', '').strip().upper()
    quantidade= request.form.get('quantidade', 10, type=int)
    peso_max  = request.form.get('peso_maximo_kg', 50.0, type=float)

    if not zona_id or not prefixo:
        flash('Zona e prefixo são obrigatórios.', 'danger')
        return redirect(url_for('armazem.index'))

    criadas = 0
    for i in range(1, quantidade + 1):
        codigo = f'{prefixo}-{i:03d}'
        if not Posicao.query.filter_by(codigo=codigo).first():
            db.session.add(Posicao(zona_id=zona_id, codigo=codigo, peso_maximo_kg=peso_max))
            criadas += 1

    db.session.commit()
    flash(f'{criadas} posições geradas com sucesso.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))
