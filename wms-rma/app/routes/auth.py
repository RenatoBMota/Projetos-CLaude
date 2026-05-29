from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime
from app.extensions import db
from app.models import Usuario

bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        senha = request.form.get('senha', '')
        lembrar = request.form.get('lembrar') == 'on'

        usuario = Usuario.query.filter_by(email=email).first()
        if usuario and usuario.ativo and usuario.check_senha(senha):
            usuario.ultimo_login = datetime.utcnow()
            db.session.commit()
            login_user(usuario, remember=lembrar)
            prox = request.args.get('next')
            return redirect(prox or url_for('dashboard.index'))

        flash('E-mail ou senha incorretos.', 'danger')

    return render_template('auth/login.html')


@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Sessão encerrada com sucesso.', 'info')
    return redirect(url_for('auth.login'))


@bp.route('/')
def root():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    return redirect(url_for('auth.login'))
