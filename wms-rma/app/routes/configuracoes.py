from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Configuracao
from app.utils import role_required, salvar_arquivo, allowed_file
from app.models import Roles
import os

bp = Blueprint('configuracoes', __name__, url_prefix='/configuracoes')


@bp.route('/')
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def index():
    cfg = Configuracao.get_all_dict()
    return render_template('configuracoes/index.html', cfg=cfg)


@bp.route('/salvar', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def salvar():
    campos_texto = [
        'app_nome', 'app_descricao', 'app_versao',
        'empresa_nome', 'empresa_cnpj', 'empresa_email', 'empresa_telefone',
        'email_alertas', 'sla_alerta_pct',
    ]
    for campo in campos_texto:
        valor = request.form.get(campo, '')
        Configuracao.set(campo, valor)

    # Cores
    for campo in ('app_cor_primaria', 'app_cor_sidebar'):
        valor = request.form.get(campo, '')
        if valor:
            Configuracao.set(campo, valor, tipo='cor', grupo='aparencia')

    # Logo
    logo = request.files.get('app_logo')
    if logo and logo.filename and allowed_file(logo.filename, {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}):
        pasta = os.path.join(current_app.root_path, 'static', 'uploads', 'logos')
        nome  = salvar_arquivo(logo, pasta, prefixo='logo_')
        Configuracao.set('app_logo', f'uploads/logos/{nome}', tipo='imagem', grupo='app')

    # Favicon
    favicon = request.files.get('app_favicon')
    if favicon and favicon.filename and allowed_file(favicon.filename, {'png', 'ico', 'svg'}):
        pasta = os.path.join(current_app.root_path, 'static', 'uploads', 'logos')
        nome  = salvar_arquivo(favicon, pasta, prefixo='favicon_')
        Configuracao.set('app_favicon', f'uploads/logos/{nome}', tipo='imagem', grupo='app')

    flash('Configurações salvas com sucesso!', 'success')
    return redirect(url_for('configuracoes.index'))


@bp.route('/resetar-logo', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def resetar_logo():
    Configuracao.set('app_logo', '', tipo='imagem', grupo='app')
    flash('Logo removida.', 'info')
    return redirect(url_for('configuracoes.index'))
