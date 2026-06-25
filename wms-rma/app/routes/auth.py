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


@bp.route('/trocar-senha', methods=['GET', 'POST'])
@login_required
def trocar_senha():
    if request.method == 'POST':
        nova_senha = request.form.get('nova_senha', '')
        confirmar_senha = request.form.get('confirmar_senha', '')

        if len(nova_senha) < 6:
            flash('A nova senha deve ter no mínimo 6 dígitos.', 'danger')
        elif nova_senha != confirmar_senha:
            flash('As senhas não coincidem.', 'danger')
        else:
            current_user.set_senha(nova_senha, provisoria=False)
            db.session.commit()
            flash('Senha alterada com sucesso!', 'success')
            return redirect(url_for('dashboard.index'))

    return render_template('auth/trocar_senha.html')


@bp.route('/esqueci-senha', methods=['GET', 'POST'])
def esqueci_senha():
    if request.method == 'POST':
        from app.utils import gerar_senha_provisoria, enviar_email

        email = request.form.get('email', '').strip().lower()
        usuario = Usuario.query.filter_by(email=email).first()

        if usuario and usuario.ativo:
            senha_temp = gerar_senha_provisoria()
            usuario.set_senha(senha_temp, provisoria=True)
            db.session.commit()
            try:
                enviar_email(
                    usuario.email,
                    'Senha Provisória - WMS RMA',
                    f'<p>Olá, {usuario.nome}.</p>'
                    f'<p>Sua senha provisória é: <strong>{senha_temp}</strong></p>'
                    f'<p>Use-a para entrar no sistema. Você será solicitado a criar uma nova senha no próximo login.</p>'
                )
            except Exception:
                pass

        flash('Se o e-mail informado estiver cadastrado, uma senha provisória foi enviada.', 'info')
        return redirect(url_for('auth.login'))

    return render_template('auth/esqueci_senha.html')


@bp.route('/')
def root():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    return redirect(url_for('auth.login'))
