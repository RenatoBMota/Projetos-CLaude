from functools import wraps
from flask import abort, redirect, url_for, flash
from flask_login import current_user
from datetime import datetime
import os


# Mapa de acesso: blueprint -> roles com permissão (None = todos autenticados)
BLUEPRINT_ROLES = {
    'dashboard':    None,  # todos
    'rma':          None,  # todos
    'triagem':      ['admin', 'supervisor', 'tecnico', 'operador'],
    'armazem':      ['admin', 'supervisor', 'tecnico', 'operador'],
    'produtos':     ['admin', 'supervisor', 'compras', 'operador'],
    'fornecedores': ['admin', 'supervisor', 'compras', 'operador'],
    'lote':         ['admin', 'supervisor', 'operador'],
    'sla':          ['admin', 'supervisor', 'compras', 'financeiro', 'auditor'],
    'relatorios':   ['admin', 'supervisor', 'compras', 'financeiro', 'auditor'],
    'auditoria':    ['admin', 'supervisor', 'auditor'],
    'configuracoes':['admin'],
    'usuarios':     ['admin', 'supervisor'],
}


def role_required(*roles):
    """Decorator que exige um dos roles listados."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.role not in roles:
                flash('Acesso negado: seu perfil não tem permissão para esta ação.', 'danger')
                abort(403)
            return f(*args, **kwargs)
        return decorated
    return decorator


def blueprint_access_required(f):
    """Decorator automático baseado em BLUEPRINT_ROLES."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        from flask import request as _req
        bp = _req.blueprints.get(list(_req.blueprints.keys())[-1]) if _req.blueprints else None
        bp_name = bp.name if bp else ''
        allowed = BLUEPRINT_ROLES.get(bp_name)
        if allowed is not None and current_user.role not in allowed:
            flash('Acesso negado: seu perfil não tem permissão para esta tela.', 'danger')
            abort(403)
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            abort(403)
        return f(*args, **kwargs)
    return decorated


def gerar_numero_lote():
    from app.models import LoteDevolucao
    ano_mes = datetime.utcnow().strftime('%Y%m')
    ultimo = LoteDevolucao.query.filter(LoteDevolucao.numero.like(f'LOTE-{ano_mes}-%')).count()
    return f'LOTE-{ano_mes}-{ultimo + 1:04d}'


def gerar_numero_rma():
    from app.models import RMA
    ano_mes = datetime.utcnow().strftime('%Y%m')
    ultimo = RMA.query.filter(RMA.numero.like(f'RMA-{ano_mes}-%')).count()
    return f'RMA-{ano_mes}-{ultimo + 1:06d}'


def allowed_file(filename, extensoes=None):
    if extensoes is None:
        extensoes = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in extensoes


def salvar_arquivo(arquivo, pasta, prefixo=''):
    from werkzeug.utils import secure_filename
    nome = secure_filename(arquivo.filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    nome_final = f'{prefixo}{timestamp}_{nome}'
    caminho = os.path.join(pasta, nome_final)
    os.makedirs(pasta, exist_ok=True)
    arquivo.save(caminho)
    return nome_final


def formatar_moeda(valor):
    if valor is None:
        return 'R$ 0,00'
    return f'R$ {float(valor):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def formatar_data(dt):
    if not dt:
        return '-'
    return dt.strftime('%d/%m/%Y')


def formatar_datetime(dt):
    if not dt:
        return '-'
    return dt.strftime('%d/%m/%Y %H:%M')
