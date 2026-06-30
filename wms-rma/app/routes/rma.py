from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from app.extensions import db
from app.models import (
    RMA, EstadoRMA, HistoricoRMA, Produto, Fornecedor,
    Apartamento, PoliticaSLA, PrazoSLA, Documento,
    ListaOpcao, TipoLista
)
from app.utils import gerar_numero_rma, salvar_arquivo, allowed_file
import os

bp = Blueprint('rma', __name__, url_prefix='/rma')


@bp.route('/')
@login_required
def index():
    # Filtros
    estado   = request.args.get('estado', '')
    canal    = request.args.get('canal', '')
    busca    = request.args.get('busca', '')
    forn_id  = request.args.get('fornecedor_id', type=int)
    atrasados= request.args.get('atrasados', '')
    page     = request.args.get('page', 1, type=int)

    q = RMA.query

    if estado:
        q = q.filter_by(estado=estado)
    if canal:
        q = q.filter_by(canal=canal)
    if busca:
        q = q.filter(
            db.or_(
                RMA.numero.ilike(f'%{busca}%'),
                RMA.cliente_nome.ilike(f'%{busca}%'),
                RMA.nf_original.ilike(f'%{busca}%'),
            )
        )
    if forn_id:
        q = q.filter_by(fornecedor_id=forn_id)
    if atrasados:
        from app.models import PrazoSLA
        q = q.join(PrazoSLA, RMA.prazo_sla_id == PrazoSLA.id)\
             .filter(PrazoSLA.em_atraso == True)\
             .filter(RMA.estado.notin_([EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO]))

    rmas = q.order_by(RMA.criado_em.desc()).paginate(page=page, per_page=20, error_out=False)
    fornecedores = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    estados = list(EstadoRMA.LABELS.items())

    return render_template('rma/index.html',
        rmas=rmas,
        fornecedores=fornecedores,
        estados=estados,
        filtro_estado=estado,
        filtro_canal=canal,
        filtro_busca=busca,
        filtro_forn=forn_id,
        filtro_atrasados=atrasados,
    )


@bp.route('/novo', methods=['GET', 'POST'])
@login_required
def novo():
    if request.method == 'POST':
        # Cria prazo SLA
        canal = request.form.get('canal', 'LOJA')
        pol = PoliticaSLA.query.filter_by(canal=canal, ativa=True).first() or \
              PoliticaSLA.query.filter_by(ativa=True).first()

        prazo = None
        if pol:
            agora = datetime.utcnow()
            prazo = PrazoSLA(
                politica_id=pol.id,
                prazo_triagem=agora + timedelta(days=pol.prazo_triagem_dias),
                prazo_resolucao=agora + timedelta(days=pol.prazo_resolucao_dias),
                prazo_coleta=agora + timedelta(days=pol.prazo_coleta_dias),
            )
            db.session.add(prazo)
            db.session.flush()

        rma = RMA(
            numero=gerar_numero_rma(),
            estado=EstadoRMA.ABERTO,
            canal=canal,
            cliente_nome=request.form.get('cliente_nome'),
            cliente_documento=request.form.get('cliente_documento'),
            loja_origem=request.form.get('loja_origem'),
            produto_id=request.form.get('produto_id', type=int) or None,
            fornecedor_id=request.form.get('fornecedor_id', type=int) or None,
            quantidade=request.form.get('quantidade', 1, type=int),
            numero_serie=request.form.get('numero_serie'),
            nf_original=request.form.get('nf_original'),
            motivo_devolucao=request.form.get('motivo_devolucao'),
            descricao_defeito=request.form.get('descricao_defeito'),
            valor_produto=request.form.get('valor_produto') or None,
            operador_id=current_user.id,
            prazo_sla_id=prazo.id if prazo else None,
        )
        db.session.add(rma)
        db.session.flush()

        if prazo:
            prazo.rma_id = rma.id

        db.session.add(HistoricoRMA(
            rma_id=rma.id,
            estado_anterior=None,
            estado_novo=EstadoRMA.ABERTO,
            observacao='RMA aberto',
            usuario_id=current_user.id,
        ))
        db.session.commit()
        flash(f'RMA {rma.numero} criado com sucesso!', 'success')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    produtos          = Produto.query.filter_by(ativo=True).order_by(Produto.descricao).all()
    fornecedores      = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    opcoes_canal      = ListaOpcao.por_tipo(TipoLista.CANAL)
    opcoes_motivo     = ListaOpcao.por_tipo(TipoLista.MOTIVO_DEVOLUCAO)
    opcoes_categoria  = ListaOpcao.por_tipo(TipoLista.CATEGORIA_DEFEITO)
    return render_template('rma/form.html',
        rma=None, produtos=produtos, fornecedores=fornecedores,
        opcoes_canal=opcoes_canal, opcoes_motivo=opcoes_motivo,
        opcoes_categoria=opcoes_categoria,
    )


@bp.route('/<int:rma_id>/editar', methods=['GET', 'POST'])
@login_required
def editar(rma_id):
    rma = RMA.query.get_or_404(rma_id)

    if rma.estado != EstadoRMA.ABERTO:
        flash('Este RMA só pode ser editado enquanto estiver no estado "Aberto" '
              '(ex: logo após uma reprovação).', 'warning')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    if request.method == 'POST':
        rma.canal              = request.form.get('canal', rma.canal)
        rma.cliente_nome       = request.form.get('cliente_nome')
        rma.cliente_documento  = request.form.get('cliente_documento')
        rma.loja_origem        = request.form.get('loja_origem')
        rma.produto_id         = request.form.get('produto_id', type=int) or None
        rma.fornecedor_id      = request.form.get('fornecedor_id', type=int) or None
        rma.quantidade         = request.form.get('quantidade', 1, type=int)
        rma.numero_serie       = request.form.get('numero_serie')
        rma.nf_original        = request.form.get('nf_original')
        rma.motivo_devolucao   = request.form.get('motivo_devolucao')
        rma.descricao_defeito  = request.form.get('descricao_defeito')
        rma.categoria_defeito  = request.form.get('categoria_defeito')
        rma.valor_produto      = request.form.get('valor_produto') or None

        db.session.add(HistoricoRMA(
            rma_id=rma.id,
            estado_anterior=rma.estado,
            estado_novo=rma.estado,
            observacao='RMA editado/corrigido pelo operador.',
            usuario_id=current_user.id,
        ))
        db.session.commit()
        flash(f'RMA {rma.numero} atualizado com sucesso!', 'success')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    produtos          = Produto.query.filter_by(ativo=True).order_by(Produto.descricao).all()
    fornecedores      = Fornecedor.query.filter_by(ativo=True).order_by(Fornecedor.nome).all()
    opcoes_canal      = ListaOpcao.por_tipo(TipoLista.CANAL)
    opcoes_motivo     = ListaOpcao.por_tipo(TipoLista.MOTIVO_DEVOLUCAO)
    opcoes_categoria  = ListaOpcao.por_tipo(TipoLista.CATEGORIA_DEFEITO)
    return render_template('rma/form.html',
        rma=rma, produtos=produtos, fornecedores=fornecedores,
        opcoes_canal=opcoes_canal, opcoes_motivo=opcoes_motivo,
        opcoes_categoria=opcoes_categoria,
    )


@bp.route('/<int:rma_id>')
@login_required
def detalhe(rma_id):
    rma               = RMA.query.get_or_404(rma_id)
    apartamentos      = Apartamento.query.filter(Apartamento.ocupado != True)\
                            .order_by(Apartamento.endereco).limit(200).all()
    opcoes_destinacao = ListaOpcao.por_tipo(TipoLista.DESTINACAO)
    opcoes_categoria  = ListaOpcao.por_tipo(TipoLista.CATEGORIA_DEFEITO)
    return render_template('rma/detail.html', rma=rma, apartamentos=apartamentos,
        opcoes_destinacao=opcoes_destinacao, opcoes_categoria=opcoes_categoria)


@bp.route('/<int:rma_id>/transitar', methods=['POST'])
@login_required
def transitar(rma_id):
    rma = RMA.query.get_or_404(rma_id)
    novo_estado = request.form.get('novo_estado')
    observacao  = request.form.get('observacao', '')
    laudo       = request.form.get('laudo_tecnico')
    disposicao  = request.form.get('disposicao')
    categoria   = request.form.get('categoria_defeito')

    if not rma.pode_transitar(novo_estado):
        flash('Transição de estado não permitida.', 'danger')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    if rma.estado == EstadoRMA.AGUARDANDO_APROVACAO and current_user.role not in EstadoRMA.APROVADORES:
        flash('Apenas um supervisor ou administrador pode aprovar/reprovar este RMA.', 'danger')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    estado_anterior = rma.estado

    # Atualiza campos opcionais
    if laudo:
        rma.laudo_tecnico = laudo
    if disposicao:
        rma.disposicao = disposicao
    if categoria:
        rma.categoria_defeito = categoria
    apt_id = request.form.get('apartamento_id', type=int)
    if apt_id:
        apt_antigo = rma.apartamento_id
        if apt_antigo:
            a_old = Apartamento.query.get(apt_antigo)
            if a_old:
                a_old.ocupado = False
        rma.apartamento_id = apt_id
        novo_apt = Apartamento.query.get(apt_id)
        if novo_apt:
            novo_apt.ocupado = True
    if novo_estado in (EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO):
        rma.finalizado_em = datetime.utcnow()

    # Evidência obrigatória na finalização
    if novo_estado == EstadoRMA.FINALIZADO:
        status_fin = request.form.get('status_finalizacao')
        if status_fin:
            rma.disposicao = status_fin
        arquivo_fin = request.files.get('arquivo_finalizacao')
        if arquivo_fin and arquivo_fin.filename and allowed_file(arquivo_fin.filename):
            from flask import current_app
            pasta = os.path.join(current_app.config['UPLOAD_FOLDER'], f'rma_{rma_id}')
            nome = salvar_arquivo(arquivo_fin, pasta, prefixo=f'rma{rma_id}_fin_')
            db.session.add(Documento(
                rma_id=rma.id,
                nome=arquivo_fin.filename,
                tipo='FINALIZACAO',
                caminho=f'uploads/rma_{rma_id}/{nome}',
                tamanho=os.path.getsize(os.path.join(pasta, nome)),
                usuario_id=current_user.id,
            ))
        elif not rma.documentos.count():
            flash('Anexe ao menos um documento de evidência para finalizar.', 'warning')
            return redirect(url_for('rma.detalhe', rma_id=rma.id))
    if novo_estado in (EstadoRMA.EM_ANALISE, EstadoRMA.AGUARDANDO_DEST):
        if not rma.tecnico_id:
            rma.tecnico_id = current_user.id

    rma.estado = novo_estado

    db.session.add(HistoricoRMA(
        rma_id=rma.id,
        estado_anterior=estado_anterior,
        estado_novo=novo_estado,
        observacao=observacao,
        usuario_id=current_user.id,
    ))

    # Atualiza SLA
    if rma.prazo_sla:
        rma.prazo_sla.atualizar_status()

    db.session.commit()
    flash(f'RMA atualizado para: {EstadoRMA.LABELS.get(novo_estado, (novo_estado,""))[0]}', 'success')
    return redirect(url_for('rma.detalhe', rma_id=rma.id))


@bp.route('/<int:rma_id>/upload', methods=['POST'])
@login_required
def upload_doc(rma_id):
    rma = RMA.query.get_or_404(rma_id)
    arquivo = request.files.get('arquivo')
    tipo    = request.form.get('tipo', 'OUTRO')

    if not arquivo or not arquivo.filename:
        flash('Nenhum arquivo selecionado.', 'warning')
        return redirect(url_for('rma.detalhe', rma_id=rma_id))

    if not allowed_file(arquivo.filename):
        flash('Tipo de arquivo não permitido.', 'danger')
        return redirect(url_for('rma.detalhe', rma_id=rma_id))

    from flask import current_app
    pasta = os.path.join(current_app.config['UPLOAD_FOLDER'], f'rma_{rma_id}')
    nome  = salvar_arquivo(arquivo, pasta, prefixo=f'rma{rma_id}_')

    doc = Documento(
        rma_id=rma_id,
        nome=arquivo.filename,
        tipo=tipo,
        caminho=f'uploads/rma_{rma_id}/{nome}',
        tamanho=os.path.getsize(os.path.join(pasta, nome)),
        usuario_id=current_user.id,
    )
    db.session.add(doc)
    db.session.commit()
    flash('Documento anexado com sucesso!', 'success')
    return redirect(url_for('rma.detalhe', rma_id=rma_id) + '#documentos')


@bp.route('/<int:rma_id>/alocar-endereco', methods=['POST'])
@login_required
def alocar_endereco(rma_id):
    rma = RMA.query.get_or_404(rma_id)
    if rma.apartamento_id:
        flash('Este RMA já possui um endereço atribuído.', 'info')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    from app.routes.triagem import _alocar_apartamento
    _alocar_apartamento(rma)

    if rma.apartamento_id:
        db.session.commit()
        flash(f'Endereço {rma.apt_ref.endereco} atribuído automaticamente.', 'success')
    else:
        flash('Nenhum endereço livre encontrado. Verifique a configuração do armazém.', 'warning')

    return redirect(url_for('rma.detalhe', rma_id=rma.id))


@bp.route('/<int:rma_id>/mudar-endereco', methods=['POST'])
@login_required
def mudar_endereco(rma_id):
    rma = RMA.query.get_or_404(rma_id)
    novo_apt_id = request.form.get('apartamento_id', type=int)
    if not novo_apt_id:
        flash('Selecione um endereço.', 'warning')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    novo_apt = Apartamento.query.get_or_404(novo_apt_id)
    if novo_apt.id == rma.apartamento_id:
        flash('O RMA já está nesse endereço.', 'info')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))
    if novo_apt.ocupado:
        flash('Este endereço já está ocupado por outro RMA.', 'danger')
        return redirect(url_for('rma.detalhe', rma_id=rma.id))

    apt_antigo = rma.apt_ref
    endereco_antigo = apt_antigo.endereco if apt_antigo else '—'
    if apt_antigo:
        apt_antigo.ocupado = False

    rma.apartamento_id = novo_apt.id
    novo_apt.ocupado = True

    db.session.add(HistoricoRMA(
        rma_id=rma.id,
        estado_anterior=rma.estado,
        estado_novo=rma.estado,
        observacao=f'Endereço alterado manualmente de {endereco_antigo} para {novo_apt.endereco}.',
        usuario_id=current_user.id,
    ))
    db.session.commit()
    flash(f'Endereço alterado para {novo_apt.endereco}.', 'success')
    return redirect(url_for('rma.detalhe', rma_id=rma.id))


@bp.route('/api/produto/<int:prod_id>')
@login_required
def api_produto(prod_id):
    p = Produto.query.get_or_404(prod_id)
    return jsonify({
        'id': p.id,
        'descricao': p.descricao,
        'codigo': p.codigo,
        'fornecedor_id': p.fornecedor_id,
        'fornecedor_nome': p.fornecedor.nome if p.fornecedor else '',
    })
