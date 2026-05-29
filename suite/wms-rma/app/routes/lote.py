import os
from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_required, current_user
from app.extensions import db
from app.models import LoteDevolucao, RMA, EstadoRMA, Fornecedor, Documento, HistoricoRMA
from app.utils import gerar_numero_lote, salvar_arquivo, allowed_file

bp = Blueprint('lote', __name__, url_prefix='/lotes')


@bp.route('/')
@login_required
def index():
    lotes = LoteDevolucao.query.order_by(LoteDevolucao.criado_em.desc()).all()
    return render_template('lote/index.html', lotes=lotes)


@bp.route('/novo', methods=['GET', 'POST'])
@login_required
def novo():
    if request.method == 'POST':
        lote = LoteDevolucao(
            numero=gerar_numero_lote(),
            nf_devolucao=request.form.get('nf_devolucao', '').strip() or None,
            fornecedor_id=request.form.get('fornecedor_id', type=int) or None,
            observacoes=request.form.get('observacoes', '').strip() or None,
            criado_por_id=current_user.id,
        )
        db.session.add(lote)
        db.session.commit()
        flash(f'Lote {lote.numero} criado.', 'success')
        return redirect(url_for('lote.detalhe', lote_id=lote.id))

    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    return render_template('lote/novo.html', fornecedores=fornecedores)


@bp.route('/<int:lote_id>')
@login_required
def detalhe(lote_id):
    lote = LoteDevolucao.query.get_or_404(lote_id)
    rmas_disponiveis = RMA.query.filter(
        RMA.estado == EstadoRMA.AGUARDANDO_DEST,
        RMA.lote_id.is_(None),
    ).order_by(RMA.numero).all()
    return render_template('lote/detalhe.html', lote=lote, rmas_disponiveis=rmas_disponiveis)


@bp.route('/<int:lote_id>/adicionar', methods=['POST'])
@login_required
def adicionar_rma(lote_id):
    lote = LoteDevolucao.query.get_or_404(lote_id)
    if lote.estado != 'ABERTO':
        flash('Lote já finalizado.', 'warning')
        return redirect(url_for('lote.detalhe', lote_id=lote_id))
    rma_id = request.form.get('rma_id', type=int)
    rma = RMA.query.get_or_404(rma_id)
    rma.lote_id = lote_id
    db.session.commit()
    flash(f'RMA {rma.numero} adicionado ao lote.', 'success')
    return redirect(url_for('lote.detalhe', lote_id=lote_id))


@bp.route('/<int:lote_id>/remover/<int:rma_id>', methods=['POST'])
@login_required
def remover_rma(lote_id, rma_id):
    lote = LoteDevolucao.query.get_or_404(lote_id)
    if lote.estado != 'ABERTO':
        flash('Lote já finalizado.', 'warning')
        return redirect(url_for('lote.detalhe', lote_id=lote_id))
    rma = RMA.query.get_or_404(rma_id)
    rma.lote_id = None
    db.session.commit()
    flash(f'RMA {rma.numero} removido do lote.', 'info')
    return redirect(url_for('lote.detalhe', lote_id=lote_id))


@bp.route('/<int:lote_id>/finalizar', methods=['POST'])
@login_required
def finalizar_lote(lote_id):
    lote = LoteDevolucao.query.get_or_404(lote_id)
    if lote.estado != 'ABERTO':
        flash('Lote já finalizado.', 'warning')
        return redirect(url_for('lote.detalhe', lote_id=lote_id))

    arquivo = request.files.get('arquivo')
    if not arquivo or not arquivo.filename:
        flash('Anexe o documento de evidência da devolução para finalizar.', 'warning')
        return redirect(url_for('lote.detalhe', lote_id=lote_id))

    if not allowed_file(arquivo.filename):
        flash('Tipo de arquivo não permitido.', 'danger')
        return redirect(url_for('lote.detalhe', lote_id=lote_id))

    pasta = os.path.join(current_app.config['UPLOAD_FOLDER'], f'lote_{lote_id}')
    nome = salvar_arquivo(arquivo, pasta, prefixo=f'lote{lote_id}_')

    lote.nf_devolucao = request.form.get('nf_devolucao', lote.nf_devolucao) or lote.nf_devolucao
    lote.estado = 'FINALIZADO'

    for rma in lote.rmas.all():
        estado_ant = rma.estado
        rma.estado = EstadoRMA.FINALIZADO
        from datetime import datetime
        rma.finalizado_em = datetime.utcnow()
        db.session.add(Documento(
            rma_id=rma.id,
            nome=arquivo.filename,
            tipo='FINALIZACAO',
            caminho=f'uploads/lote_{lote_id}/{nome}',
            tamanho=os.path.getsize(os.path.join(pasta, nome)),
            usuario_id=current_user.id,
        ))
        db.session.add(HistoricoRMA(
            rma_id=rma.id,
            estado_anterior=estado_ant,
            estado_novo=EstadoRMA.FINALIZADO,
            observacao=f'Finalizado em lote {lote.numero}',
            usuario_id=current_user.id,
        ))

    db.session.commit()
    flash(f'Lote {lote.numero} finalizado com {lote.rmas.count()} RMAs.', 'success')
    return redirect(url_for('lote.detalhe', lote_id=lote_id))
