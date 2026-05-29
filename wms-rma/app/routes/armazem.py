from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required
from app.extensions import db
from app.models import Armazem, Zona, Modulo, Rua, Numero, Apartamento, TipoZona

bp = Blueprint('armazem', __name__, url_prefix='/armazem')


@bp.route('/')
@login_required
def index():
    armazens = Armazem.query.filter_by(ativo=True).all()
    return render_template('armazem/index.html', armazens=armazens, TipoZona=TipoZona)


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
