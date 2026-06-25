from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required
from app.extensions import db
from app.models import (Armazem, Zona, Modulo, Rua, Numero, Apartamento,
                         TipoZona, RMA, ItemInventario)
from app.utils import role_required
from app.models import Roles

bp = Blueprint('armazem', __name__, url_prefix='/armazem')


# ── Helpers de exclusão segura ────────────────────────────────────────────────

def _apartamentos_ids(*, zona=None, modulo=None, rua=None, numero=None):
    """Retorna os ids de Apartamento sob o escopo informado."""
    if numero is not None:
        return [a.id for a in numero.apartamentos]
    if rua is not None:
        ids = []
        for n in rua.numeros:
            ids += [a.id for a in n.apartamentos]
        return ids
    if modulo is not None:
        ids = []
        for r in modulo.ruas:
            for n in r.numeros:
                ids += [a.id for a in n.apartamentos]
        return ids
    if zona is not None:
        ids = []
        for m in zona.modulos:
            for r in m.ruas:
                for n in r.numeros:
                    ids += [a.id for a in n.apartamentos]
        return ids
    return []


def _bloqueio_exclusao(apt_ids):
    """Retorna uma mensagem de erro se algum apartamento não puder ser excluído, senão None."""
    if not apt_ids:
        return None
    ocupado = Apartamento.query.filter(Apartamento.id.in_(apt_ids), Apartamento.ocupado.is_(True)).count()
    if ocupado:
        return f'Não é possível excluir: {ocupado} endereço(s) estão ocupados.'
    em_uso_rma = RMA.query.filter(RMA.apartamento_id.in_(apt_ids)).count()
    if em_uso_rma:
        return f'Não é possível excluir: {em_uso_rma} RMA(s) referenciam esses endereços.'
    em_uso_inv = ItemInventario.query.filter(ItemInventario.apartamento_id.in_(apt_ids)).count()
    if em_uso_inv:
        return f'Não é possível excluir: {em_uso_inv} item(ns) de inventário referenciam esses endereços.'
    return None


@bp.route('/')
@login_required
def index():
    armazens = Armazem.query.filter_by(ativo=True).all()
    return render_template('armazem/index.html', armazens=armazens, TipoZona=TipoZona)


@bp.route('/novo-armazem', methods=['POST'])
@login_required
def novo_armazem():
    nome     = request.form.get('nome', '').strip() or 'Armazém Principal RMA'
    codigo   = request.form.get('codigo', '').strip() or 'ARM-01'
    endereco = request.form.get('endereco', '').strip()

    if Armazem.query.filter_by(codigo=codigo).first():
        flash(f'Já existe um armazém com o código "{codigo}".', 'warning')
        return redirect(url_for('armazem.index'))

    arm = Armazem(codigo=codigo, nome=nome, endereco=endereco)
    db.session.add(arm)
    db.session.flush()

    zonas_padrao = [
        ('Z-ANA', 'Zona de Análise',    TipoZona.ANALISE,     50),
        ('Z-DEF', 'Zona Defeituosos',   TipoZona.DEFEITUOSOS, 100),
        ('Z-SUC', 'Zona Sucata',        TipoZona.SUCATA,      80),
        ('Z-QUA', 'Quarentena',         TipoZona.QUARENTENA,  30),
        ('Z-EXP', 'Expedição',          TipoZona.EXPEDICAO,   60),
        ('Z-BLQ', 'Bloqueados',         TipoZona.BLOQUEADOS,  20),
    ]
    for cod, znome, tipo, cap in zonas_padrao:
        db.session.add(Zona(armazem_id=arm.id, codigo=cod, nome=znome,
                            tipo=tipo, capacidade_max=cap))

    db.session.commit()
    flash(f'Armazém "{nome}" criado com 6 zonas padrão. '
          f'Clique em cada zona para gerar os endereços.', 'success')
    return redirect(url_for('armazem.index'))


@bp.route('/zona/<int:zona_id>')
@login_required
def zona_detalhe(zona_id):
    zona    = Zona.query.get_or_404(zona_id)
    modulos = zona.modulos.filter_by(ativo=True).all()
    return render_template('armazem/zona.html', zona=zona, modulos=modulos)


@bp.route('/modulo/<int:modulo_id>')
@login_required
def modulo_detalhe(modulo_id):
    modulo = Modulo.query.get_or_404(modulo_id)
    ruas   = modulo.ruas.filter_by(ativa=True).all()
    return render_template('armazem/modulo.html', modulo=modulo, ruas=ruas)


# ── Edição / CRUD de zona ─────────────────────────────────────────────────────

@bp.route('/zona/<int:zona_id>/editar-nome', methods=['POST'])
@login_required
def editar_zona_nome(zona_id):
    zona = Zona.query.get_or_404(zona_id)
    novo_nome = request.form.get('nome', '').strip()
    if novo_nome:
        zona.nome = novo_nome
        db.session.commit()
        flash(f'Zona renomeada para "{novo_nome}".', 'success')
    return redirect(url_for('armazem.index'))


@bp.route('/zona/nova', methods=['POST'])
@login_required
def zona_nova():
    armazem_id = request.form.get('armazem_id', type=int)
    codigo     = request.form.get('codigo', '').strip()
    nome       = request.form.get('nome', '').strip()
    tipo       = request.form.get('tipo', '').strip()
    capacidade = request.form.get('capacidade_max', type=int)

    arm = Armazem.query.get_or_404(armazem_id)
    if not codigo or not nome:
        flash('Código e nome da zona são obrigatórios.', 'warning')
    elif arm.zonas.filter_by(codigo=codigo).first():
        flash(f'Já existe uma zona com o código "{codigo}" neste armazém.', 'warning')
    else:
        zona = Zona(armazem_id=arm.id, codigo=codigo, nome=nome,
                    tipo=tipo or None, capacidade_max=capacidade)
        db.session.add(zona)
        db.session.commit()
        flash(f'Zona "{nome}" criada.', 'success')
    return redirect(url_for('armazem.index'))


@bp.route('/zona/<int:zona_id>/deletar', methods=['POST'])
@login_required
def zona_deletar(zona_id):
    zona = Zona.query.get_or_404(zona_id)
    apt_ids = _apartamentos_ids(zona=zona)
    erro = _bloqueio_exclusao(apt_ids)
    if erro:
        flash(erro, 'danger')
        return redirect(url_for('armazem.index'))

    for modulo in list(zona.modulos):
        for rua in list(modulo.ruas):
            for numero in list(rua.numeros):
                Apartamento.query.filter_by(numero_id=numero.id).delete()
                db.session.delete(numero)
            db.session.delete(rua)
        db.session.delete(modulo)
    nome = zona.nome
    db.session.delete(zona)
    db.session.commit()
    flash(f'Zona "{nome}" excluída.', 'success')
    return redirect(url_for('armazem.index'))


# ── Gerador de endereços em lote ──────────────────────────────────────────────

@bp.route('/gerar', methods=['POST'])
@login_required
def gerar_enderecos():
    """
    Gera a hierarquia completa para uma zona:
    Módulos > Ruas (letras) > Números > Apartamentos
    """
    zona_id     = request.form.get('zona_id', type=int)
    qtd_modulos = request.form.get('qtd_modulos', 1, type=int)
    ruas_lista  = request.form.get('ruas', 'A,B').upper()          # 'A,B,C'
    qtd_numeros = request.form.get('qtd_numeros', 5, type=int)
    qtd_apts    = request.form.get('qtd_apartamentos', 3, type=int)
    peso_max    = request.form.get('peso_maximo_kg', 50.0, type=float)

    zona = Zona.query.get_or_404(zona_id)
    ruas_codigos = [r.strip() for r in ruas_lista.split(',') if r.strip()]

    criados = 0
    for m_idx in range(1, qtd_modulos + 1):
        mod_cod = f'{m_idx:02d}'
        # Verifica se módulo já existe
        mod = Modulo.query.filter_by(zona_id=zona.id, codigo=mod_cod).first()
        if not mod:
            mod = Modulo(zona_id=zona.id, codigo=mod_cod,
                         nome=f'Módulo {mod_cod}')
            db.session.add(mod)
            db.session.flush()

        for rua_cod in ruas_codigos:
            rua = Rua.query.filter_by(modulo_id=mod.id, codigo=rua_cod).first()
            if not rua:
                rua = Rua(modulo_id=mod.id, codigo=rua_cod)
                db.session.add(rua)
                db.session.flush()

            for n_idx in range(1, qtd_numeros + 1):
                num_cod = f'{n_idx:02d}'
                num = Numero.query.filter_by(rua_id=rua.id, codigo=num_cod).first()
                if not num:
                    num = Numero(rua_id=rua.id, codigo=num_cod)
                    db.session.add(num)
                    db.session.flush()

                for a_idx in range(1, qtd_apts + 1):
                    apt_cod = f'{a_idx:02d}'
                    endereco = f'{mod_cod}-{rua_cod}-{num_cod}-{apt_cod}'
                    if not Apartamento.query.filter_by(endereco=endereco).first():
                        apt = Apartamento(
                            numero_id=num.id,
                            codigo=apt_cod,
                            endereco=endereco,
                            peso_maximo_kg=peso_max,
                        )
                        db.session.add(apt)
                        criados += 1

    db.session.commit()
    flash(f'{criados} apartamentos gerados para a zona "{zona.nome}".', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


# ── CRUD de módulo ────────────────────────────────────────────────────────────

@bp.route('/modulo/novo', methods=['POST'])
@login_required
def modulo_novo():
    zona_id = request.form.get('zona_id', type=int)
    codigo  = request.form.get('codigo', '').strip()
    nome    = request.form.get('nome', '').strip()

    zona = Zona.query.get_or_404(zona_id)
    if not codigo:
        flash('Código do módulo é obrigatório.', 'warning')
    elif zona.modulos.filter_by(codigo=codigo).first():
        flash(f'Já existe um módulo "{codigo}" nesta zona.', 'warning')
    else:
        db.session.add(Modulo(zona_id=zona.id, codigo=codigo, nome=nome or None))
        db.session.commit()
        flash(f'Módulo "{codigo}" criado.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


@bp.route('/modulo/<int:modulo_id>/deletar', methods=['POST'])
@login_required
def modulo_deletar(modulo_id):
    modulo = Modulo.query.get_or_404(modulo_id)
    zona_id = modulo.zona_id
    apt_ids = _apartamentos_ids(modulo=modulo)
    erro = _bloqueio_exclusao(apt_ids)
    if erro:
        flash(erro, 'danger')
        return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))

    for rua in list(modulo.ruas):
        for numero in list(rua.numeros):
            Apartamento.query.filter_by(numero_id=numero.id).delete()
            db.session.delete(numero)
        db.session.delete(rua)
    codigo = modulo.codigo
    db.session.delete(modulo)
    db.session.commit()
    flash(f'Módulo "{codigo}" excluído.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


# ── CRUD de rua ───────────────────────────────────────────────────────────────

@bp.route('/rua/nova', methods=['POST'])
@login_required
def rua_nova():
    modulo_id = request.form.get('modulo_id', type=int)
    codigo    = request.form.get('codigo', '').strip().upper()

    modulo = Modulo.query.get_or_404(modulo_id)
    if not codigo:
        flash('Código da rua é obrigatório.', 'warning')
    elif modulo.ruas.filter_by(codigo=codigo).first():
        flash(f'Já existe a rua "{codigo}" neste módulo.', 'warning')
    else:
        db.session.add(Rua(modulo_id=modulo.id, codigo=codigo))
        db.session.commit()
        flash(f'Rua "{codigo}" criada.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=modulo.zona_id))


@bp.route('/rua/<int:rua_id>/deletar', methods=['POST'])
@login_required
def rua_deletar(rua_id):
    rua = Rua.query.get_or_404(rua_id)
    zona_id = rua.modulo.zona_id
    apt_ids = _apartamentos_ids(rua=rua)
    erro = _bloqueio_exclusao(apt_ids)
    if erro:
        flash(erro, 'danger')
        return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))

    for numero in list(rua.numeros):
        Apartamento.query.filter_by(numero_id=numero.id).delete()
        db.session.delete(numero)
    codigo = rua.codigo
    db.session.delete(rua)
    db.session.commit()
    flash(f'Rua "{codigo}" excluída.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


# ── CRUD de número ────────────────────────────────────────────────────────────

@bp.route('/numero/novo', methods=['POST'])
@login_required
def numero_novo():
    rua_id = request.form.get('rua_id', type=int)
    codigo = request.form.get('codigo', '').strip()

    rua = Rua.query.get_or_404(rua_id)
    if not codigo:
        flash('Código do número é obrigatório.', 'warning')
    elif rua.numeros.filter_by(codigo=codigo).first():
        flash(f'Já existe o número "{codigo}" nesta rua.', 'warning')
    else:
        db.session.add(Numero(rua_id=rua.id, codigo=codigo))
        db.session.commit()
        flash(f'Número "{codigo}" criado.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=rua.modulo.zona_id))


@bp.route('/numero/<int:numero_id>/deletar', methods=['POST'])
@login_required
def numero_deletar(numero_id):
    numero = Numero.query.get_or_404(numero_id)
    zona_id = numero.rua.modulo.zona_id
    apt_ids = _apartamentos_ids(numero=numero)
    erro = _bloqueio_exclusao(apt_ids)
    if erro:
        flash(erro, 'danger')
        return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))

    Apartamento.query.filter_by(numero_id=numero.id).delete()
    codigo = numero.codigo
    db.session.delete(numero)
    db.session.commit()
    flash(f'Número "{codigo}" excluído.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


# ── CRUD de apartamento ───────────────────────────────────────────────────────

@bp.route('/apartamento/novo', methods=['POST'])
@login_required
def apartamento_novo():
    numero_id      = request.form.get('numero_id', type=int)
    codigo         = request.form.get('codigo', '').strip()
    peso_maximo_kg = request.form.get('peso_maximo_kg', 50.0, type=float)

    numero   = Numero.query.get_or_404(numero_id)
    rua      = numero.rua
    modulo   = rua.modulo
    endereco = f'{modulo.codigo}-{rua.codigo}-{numero.codigo}-{codigo}'

    if not codigo:
        flash('Código do apartamento é obrigatório.', 'warning')
    elif Apartamento.query.filter_by(endereco=endereco).first():
        flash(f'Endereço "{endereco}" já existe.', 'warning')
    else:
        db.session.add(Apartamento(numero_id=numero.id, codigo=codigo,
                                    endereco=endereco, peso_maximo_kg=peso_maximo_kg))
        db.session.commit()
        flash(f'Endereço "{endereco}" criado.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=modulo.zona_id))


@bp.route('/apartamento/<int:apartamento_id>/deletar', methods=['POST'])
@login_required
def apartamento_deletar(apartamento_id):
    apt = Apartamento.query.get_or_404(apartamento_id)
    zona_id = apt.numero.rua.modulo.zona_id
    erro = _bloqueio_exclusao([apt.id])
    if erro:
        flash(erro, 'danger')
        return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))

    endereco = apt.endereco
    db.session.delete(apt)
    db.session.commit()
    flash(f'Endereço "{endereco}" excluído.', 'success')
    return redirect(url_for('armazem.zona_detalhe', zona_id=zona_id))


# ── API ───────────────────────────────────────────────────────────────────────

@bp.route('/api/apartamentos-livres')
@login_required
def api_apartamentos_livres():
    zona_id = request.args.get('zona_id', type=int)
    q = Apartamento.query.filter_by(ocupado=False)
    if zona_id:
        q = q.join(Numero).join(Rua).join(Modulo).filter(Modulo.zona_id == zona_id)
    apts = q.limit(50).all()
    return jsonify([{'id': a.id, 'endereco': a.endereco} for a in apts])
