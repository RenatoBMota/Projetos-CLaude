from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from datetime import datetime
from app.extensions import db
from app.models import Usuario, Roles
from app.utils import role_required, BLUEPRINT_ROLES

bp = Blueprint('usuarios', __name__, url_prefix='/usuarios')


@bp.route('/')
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def index():
    busca = request.args.get('busca', '')
    role  = request.args.get('role', '')
    ativo = request.args.get('ativo', '')

    q = Usuario.query
    if busca:
        q = q.filter(db.or_(
            Usuario.nome.ilike(f'%{busca}%'),
            Usuario.email.ilike(f'%{busca}%'),
            Usuario.matricula.ilike(f'%{busca}%'),
        ))
    if role:
        q = q.filter_by(role=role)
    if ativo == '1':
        q = q.filter_by(ativo=True)
    elif ativo == '0':
        q = q.filter_by(ativo=False)

    usuarios = q.order_by(Usuario.nome).all()
    return render_template('usuarios/index.html',
        usuarios=usuarios,
        roles=Roles.LABELS,
        filtro_busca=busca,
        filtro_role=role,
        filtro_ativo=ativo,
    )


@bp.route('/novo', methods=['GET', 'POST'])
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def novo():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        if Usuario.query.filter_by(email=email).first():
            flash(f'E-mail "{email}" já cadastrado.', 'warning')
        else:
            u = Usuario(
                nome        =request.form.get('nome'),
                email       =email,
                role        =request.form.get('role', Roles.OPERADOR),
                matricula   =request.form.get('matricula'),
                departamento=request.form.get('departamento'),
                telefone    =request.form.get('telefone'),
                ativo       =True,
            )
            senha = request.form.get('senha', 'wms@123')
            u.set_senha(senha)
            db.session.add(u)
            db.session.commit()
            flash(f'Usuário {u.nome} criado com sucesso!', 'success')
            return redirect(url_for('usuarios.index'))

    return render_template('usuarios/form.html', usuario=None, roles=Roles.LABELS)


@bp.route('/<int:user_id>/editar', methods=['GET', 'POST'])
@login_required
@role_required(Roles.ADMIN, Roles.SUPERVISOR)
def editar(user_id):
    u = Usuario.query.get_or_404(user_id)

    if request.method == 'POST':
        u.nome         = request.form.get('nome')
        u.role         = request.form.get('role', u.role)
        u.matricula    = request.form.get('matricula')
        u.departamento = request.form.get('departamento')
        u.telefone     = request.form.get('telefone')
        u.ativo        = request.form.get('ativo') == 'on'
        u.atualizado_em= datetime.utcnow()

        nova_senha = request.form.get('nova_senha', '').strip()
        if nova_senha and len(nova_senha) >= 6:
            u.set_senha(nova_senha)
            flash('Senha atualizada.', 'info')

        # Admin não pode se revogar
        if u.id == current_user.id and not u.is_admin():
            u.role = Roles.ADMIN
            flash('Você não pode remover seus próprios privilégios de admin.', 'warning')

        db.session.commit()
        flash(f'Usuário {u.nome} atualizado!', 'success')
        return redirect(url_for('usuarios.index'))

    return render_template('usuarios/form.html', usuario=u, roles=Roles.LABELS)


@bp.route('/<int:user_id>/toggle', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def toggle_ativo(user_id):
    u = Usuario.query.get_or_404(user_id)
    if u.id == current_user.id:
        flash('Você não pode desativar sua própria conta.', 'danger')
    else:
        u.ativo = not u.ativo
        db.session.commit()
        status = 'ativado' if u.ativo else 'desativado'
        flash(f'Usuário {u.nome} {status}.', 'info')
    return redirect(url_for('usuarios.index'))


@bp.route('/permissoes')
@login_required
@role_required(Roles.ADMIN)
def permissoes():
    """Tela de visualização da matriz de permissões por perfil."""
    telas = {
        'dashboard':    'Dashboard',
        'rma':          'RMA',
        'triagem':      'Triagem',
        'armazem':      'Armazém',
        'produtos':     'Produtos',
        'lote':         'Lotes',
        'sla':          'Monitor SLA',
        'relatorios':   'Relatórios',
        'auditoria':    'Inventário',
        'configuracoes':'Configurações',
        'usuarios':     'Usuários',
    }
    return render_template('usuarios/permissoes.html',
        telas=telas, roles=Roles.LABELS, BLUEPRINT_ROLES=BLUEPRINT_ROLES)


@bp.route('/<int:user_id>/deletar', methods=['POST'])
@login_required
@role_required(Roles.ADMIN)
def deletar(user_id):
    u = Usuario.query.get_or_404(user_id)
    if u.id == current_user.id:
        flash('Você não pode deletar sua própria conta.', 'danger')
        return redirect(url_for('usuarios.index'))
    u.ativo = False
    db.session.commit()
    flash(f'Usuário {u.nome} desativado.', 'warning')
    return redirect(url_for('usuarios.index'))
