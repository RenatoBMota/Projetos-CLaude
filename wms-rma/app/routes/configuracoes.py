import os
import re
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from app.extensions import db
from app.models import Configuracao, ListaOpcao, TipoLista, Roles, EmailAlerta
from app.utils import role_required, salvar_arquivo, allowed_file

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
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
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

    Configuracao.set('smtp_tls', '1' if request.form.get('smtp_tls') else '0')
    flash('Configurações salvas com sucesso!', 'success')
    return redirect(url_for('configuracoes.index'))


@bp.route('/resetar-logo', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def resetar_logo():
    Configuracao.set('app_logo', '', tipo='imagem', grupo='app')
    flash('Logo removida.', 'info')
    return redirect(url_for('configuracoes.index'))


# ── Listas Configuráveis ──────────────────────────────────────────────────────

@bp.route('/listas')
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def listas():
    opcoes = {
        tipo: ListaOpcao.query.filter_by(tipo=tipo).order_by(ListaOpcao.ordem, ListaOpcao.label).all()
        for tipo in TipoLista.ALL
    }
    return render_template('configuracoes/listas.html', opcoes=opcoes, TipoLista=TipoLista)


@bp.route('/listas/nova', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def lista_nova():
    tipo  = request.form.get('tipo', '').strip()
    label = request.form.get('label', '').strip()
    if not tipo or not label:
        flash('Preencha o tipo e o rótulo.', 'warning')
        return redirect(url_for('configuracoes.listas'))

    valor = re.sub(r'[^A-Z0-9]+', '_', label.upper()).strip('_')
    if ListaOpcao.query.filter_by(tipo=tipo, valor=valor).first():
        flash('Já existe uma opção com esse rótulo.', 'warning')
    else:
        max_ordem = db.session.query(
            db.func.max(ListaOpcao.ordem)
        ).filter_by(tipo=tipo).scalar() or 0
        db.session.add(ListaOpcao(tipo=tipo, valor=valor, label=label, ordem=max_ordem + 1))
        db.session.commit()
        flash(f'Opção "{label}" adicionada.', 'success')
    return redirect(url_for('configuracoes.listas'))


@bp.route('/listas/<int:opcao_id>/toggle', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def lista_toggle(opcao_id):
    opcao = ListaOpcao.query.get_or_404(opcao_id)
    opcao.ativo = not opcao.ativo
    db.session.commit()
    flash(f'Opção "{opcao.label}" {"ativada" if opcao.ativo else "desativada"}.', 'info')
    return redirect(url_for('configuracoes.listas'))


@bp.route('/listas/<int:opcao_id>/excluir', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def lista_excluir(opcao_id):
    opcao = ListaOpcao.query.get_or_404(opcao_id)
    db.session.delete(opcao)
    db.session.commit()
    flash('Opção removida permanentemente.', 'danger')
    return redirect(url_for('configuracoes.listas'))

# ── E-mail Destinatários ──────────────────────────────────────────────────────

@bp.route('/emails')
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def emails():
    lista = EmailAlerta.query.order_by(EmailAlerta.nome).all()
    return render_template('configuracoes/emails.html', lista=lista)


@bp.route('/emails/novo', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def email_novo():
    nome  = request.form.get('nome', '').strip()
    email = request.form.get('email', '').strip()
    tipo  = request.form.get('tipo', 'COMPRADOR')
    if not nome or not email:
        flash('Preencha nome e e-mail.', 'warning')
        return redirect(url_for('configuracoes.emails'))
    db.session.add(EmailAlerta(nome=nome, email=email, tipo=tipo))
    db.session.commit()
    flash(f'Destinatário {nome} adicionado.', 'success')
    return redirect(url_for('configuracoes.emails'))


@bp.route('/emails/<int:id>/toggle', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def email_toggle(id):
    ea = EmailAlerta.query.get_or_404(id)
    ea.ativo = not ea.ativo
    db.session.commit()
    flash(f'Destinatário {"ativado" if ea.ativo else "desativado"}.', 'info')
    return redirect(url_for('configuracoes.emails'))


@bp.route('/emails/<int:id>/excluir', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def email_excluir(id):
    ea = EmailAlerta.query.get_or_404(id)
    db.session.delete(ea)
    db.session.commit()
    flash('Destinatário removido.', 'danger')
    return redirect(url_for('configuracoes.emails'))
