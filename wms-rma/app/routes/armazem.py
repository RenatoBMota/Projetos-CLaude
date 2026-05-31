from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required
from app.extensions import db
from app.models import Armazem, Zona, Modulo, Rua, Numero, Apartamento, TipoZona
from app.utils import role_required
from app.models import Roles

bp = Blueprint('armazem', __name__, url_prefix='/armazem')


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


# ── Edição de zona ───────────────────────────────────────────────────────────

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
