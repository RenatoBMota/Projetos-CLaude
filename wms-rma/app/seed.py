from datetime import datetime, timedelta
from decimal import Decimal
from app.extensions import db
from app.models import (
    Configuracao, Usuario, Roles, Fornecedor, Produto,
    Armazem, Zona, Modulo, Rua, Numero, Apartamento,
    PoliticaSLA, RMA, EstadoRMA, HistoricoRMA, PrazoSLA, TipoZona,
    ListaOpcao, TipoLista, PermissaoPerfil
)
from app.utils import BLUEPRINT_ROLES
import random


def seed_armazem():
    """Cria a estrutura básica de armazém/apartamentos se ainda não existir.
    Roda independentemente de haver ou não usuários cadastrados."""
    if Armazem.query.first():
        return

    arm = Armazem(codigo='ARM-01', nome='Armazém Principal RMA', endereco='Rua Logística, 100')
    db.session.add(arm)
    db.session.flush()

    zonas_data = [
        ('Z-ANA', 'Zona de Análise',    TipoZona.ANALISE,     50),
        ('Z-DEF', 'Zona Defeituosos',   TipoZona.DEFEITUOSOS, 100),
        ('Z-SUC', 'Zona Sucata',        TipoZona.SUCATA,      80),
        ('Z-QUA', 'Quarentena',         TipoZona.QUARENTENA,  30),
        ('Z-EXP', 'Expedição',          TipoZona.EXPEDICAO,   60),
        ('Z-BLQ', 'Bloqueados',         TipoZona.BLOQUEADOS,  20),
    ]
    zonas = []
    for cod, nome, tipo, cap in zonas_data:
        z = Zona(armazem_id=arm.id, codigo=cod, nome=nome, tipo=tipo, capacidade_max=cap)
        db.session.add(z)
        zonas.append(z)
    db.session.flush()

    for z_idx, z in enumerate(zonas):
        for mod_num in range(1, 3):
            mod_cod = f'{z_idx + 1:02d}{mod_num:02d}'
            mod = Modulo(zona_id=z.id, codigo=mod_cod, nome=f'Módulo {mod_num} — {z.nome}')
            db.session.add(mod)
            db.session.flush()
            for rua_cod in ('A', 'B'):
                rua = Rua(modulo_id=mod.id, codigo=rua_cod)
                db.session.add(rua)
                db.session.flush()
                for num_idx in range(1, 4):
                    num_cod = f'{num_idx:02d}'
                    num = Numero(rua_id=rua.id, codigo=num_cod)
                    db.session.add(num)
                    db.session.flush()
                    for apt_idx in range(1, 4):
                        apt_cod = f'{apt_idx:02d}'
                        endereco = f'{mod_cod}-{rua_cod}-{num_cod}-{apt_cod}'
                        db.session.add(Apartamento(
                            numero_id=num.id, codigo=apt_cod,
                            endereco=endereco, peso_maximo_kg=50.0,
                        ))
    db.session.commit()
    print('[seed] Armazém e apartamentos criados automaticamente.')


def seed_banco():
    """Popula o banco com dados iniciais se estiver vazio."""
    # Seed permissões (sempre, independente de outros dados)
    PermissaoPerfil.seed_defaults(BLUEPRINT_ROLES)

    if Usuario.query.first():
        return

    # ── Configurações do app ──────────────────────────────────────────────────
    configs = [
        ('app_nome',        'WMS RMA Enterprise',          'texto',   'app'),
        ('app_descricao',   'Sistema de Gestão de Logística Reversa', 'texto', 'app'),
        ('app_versao',      '1.0.0',                       'texto',   'app'),
        ('app_logo',        '',                            'imagem',  'app'),
        ('app_cor_primaria','#2563eb',                     'cor',     'aparencia'),
        ('app_cor_sidebar', '#1e293b',                     'cor',     'aparencia'),
        ('app_favicon',     '',                            'imagem',  'app'),
        ('empresa_nome',    'Home Center RMA',             'texto',   'empresa'),
        ('empresa_cnpj',    '00.000.000/0001-00',          'texto',   'empresa'),
        ('empresa_email',   'rma@empresa.com.br',          'texto',   'empresa'),
        ('empresa_telefone','(11) 3000-0000',              'texto',   'empresa'),
        ('email_alertas',   'alertas@empresa.com.br',      'texto',   'notificacoes'),
        ('sla_alerta_pct',  '80',                          'numero',  'sla'),
    ]
    for chave, valor, tipo, grupo in configs:
        if not Configuracao.query.filter_by(chave=chave).first():
            db.session.add(Configuracao(chave=chave, valor=valor, tipo=tipo, grupo=grupo))

    # ── Usuários ──────────────────────────────────────────────────────────────
    usuarios = [
        ('Administrador', 'admin@wms.com',       'admin123', Roles.ADMIN,      'TI',        'ADM-001'),
        ('Carlos Silva',  'supervisor@wms.com',  'admin123', Roles.SUPERVISOR, 'Logística', 'SUP-001'),
        ('Ana Oliveira',  'operador@wms.com',    'admin123', Roles.OPERADOR,   'Operação',  'OPE-001'),
        ('Bruno Costa',   'tecnico@wms.com',     'admin123', Roles.TECNICO,    'Técnico',   'TEC-001'),
        ('Mariana Lima',  'compras@wms.com',     'admin123', Roles.COMPRAS,    'Compras',   'COM-001'),
        ('Paulo Mendes',  'financeiro@wms.com',  'admin123', Roles.FINANCEIRO, 'Financeiro','FIN-001'),
        ('Julia Santos',  'auditor@wms.com',     'admin123', Roles.AUDITOR,    'Auditoria', 'AUD-001'),
    ]
    us = []
    for nome, email, senha, role, depto, mat in usuarios:
        u = Usuario(nome=nome, email=email, role=role, departamento=depto, matricula=mat)
        u.set_senha(senha)
        db.session.add(u)
        us.append(u)

    # ── Fornecedores ─────────────────────────────────────────────────────────
    fornecedores_data = [
        ('Bosch Brasil', '07.144.457/0001-65', 'rma@bosch.com.br', '(11) 4444-0001', 'Maria Bosch'),
        ('Samsung Brasil', '24.030.072/0001-98', 'rma@samsung.com.br', '(11) 4444-0002', 'João Samsung'),
        ('Electrolux', '59.037.467/0001-45', 'rma@electrolux.com.br', '(11) 4444-0003', 'Ana Electrolux'),
        ('Tramontina', '92.244.773/0001-97', 'rma@tramontina.com.br', '(11) 4444-0004', 'Pedro Tramontina'),
        ('Black+Decker', '00.352.457/0001-87', 'rma@blackdecker.com.br', '(11) 4444-0005', 'Luiza BD'),
    ]
    fornecedores = []
    for nome, cnpj, email, tel, contato in fornecedores_data:
        f = Fornecedor(nome=nome, cnpj=cnpj, email=email, telefone=tel, contato=contato)
        db.session.add(f)
        fornecedores.append(f)

    db.session.flush()

    # ── Produtos ─────────────────────────────────────────────────────────────
    produtos_data = [
        ('BOS-001', 'Furadeira GSB 550 RE', '7891234567890', 'Bosch', 'Ferramentas Elétricas', 0, 2.5),
        ('BOS-002', 'Serra Circular GKS 150', '7891234567891', 'Bosch', 'Ferramentas Elétricas', 0, 3.2),
        ('SAM-001', 'Micro-ondas 30L ME30', '7892345678901', 'Samsung', 'Eletrodomésticos', 1, 12.0),
        ('SAM-002', 'Refrigerador RT38K', '7892345678902', 'Samsung', 'Eletrodomésticos', 1, 45.0),
        ('ELX-001', 'Lavadora LTC12', '7893456789012', 'Electrolux', 'Eletrodomésticos', 2, 55.0),
        ('ELX-002', 'Liquidificador BLQ10', '7893456789013', 'Electrolux', 'Eletroportáteis', 2, 1.8),
        ('TRA-001', 'Panela de Pressão 4,5L', '7894567890123', 'Tramontina', 'Utilidades', 3, 1.2),
        ('TRA-002', 'Frigideira Antiaderente 28cm', '7894567890124', 'Tramontina', 'Utilidades', 3, 0.9),
        ('BD-001', 'Parafusadeira Bateria 12V', '7895678901234', 'Black+Decker', 'Ferramentas', 4, 1.5),
        ('BD-002', 'Esmerilhadeira Angular 4,5"', '7895678901235', 'Black+Decker', 'Ferramentas', 4, 2.0),
    ]
    produtos = []
    for cod, desc, ean, marca, cat, forn_idx, peso in produtos_data:
        p = Produto(codigo=cod, descricao=desc, ean=ean, marca=marca,
                    categoria=cat, fornecedor_id=fornecedores[forn_idx].id, peso_kg=peso)
        db.session.add(p)
        produtos.append(p)

    # ── Políticas SLA ─────────────────────────────────────────────────────────
    pol_loja = PoliticaSLA(
        nome='SLA Padrão - Loja', canal='LOJA',
        prazo_triagem_dias=5, prazo_resolucao_dias=15, prazo_coleta_dias=7
    )
    pol_ecom = PoliticaSLA(
        nome='SLA E-commerce', canal='ECOMMERCE',
        prazo_triagem_dias=3, prazo_resolucao_dias=10, prazo_coleta_dias=5
    )
    pol_b2b = PoliticaSLA(
        nome='SLA B2B / Corporativo', canal='B2B',
        prazo_triagem_dias=2, prazo_resolucao_dias=7, prazo_coleta_dias=3
    )
    db.session.add_all([pol_loja, pol_ecom, pol_b2b])
    db.session.flush()

    # ── RMAs de exemplo ───────────────────────────────────────────────────────
    estados_sequencia = [
        EstadoRMA.FINALIZADO,
        EstadoRMA.FINALIZADO,
        EstadoRMA.AGUARDANDO_COLETA,
        EstadoRMA.EM_ANALISE,
        EstadoRMA.AGUARDANDO_TRIAGEM,
        EstadoRMA.ABERTO,
        EstadoRMA.CANCELADO,
        EstadoRMA.SUCATA,
        EstadoRMA.AGUARDANDO_DEST,
        EstadoRMA.COLETADO,
    ]

    motivos = ['Defeito de fabricação', 'Produto chegou danificado', 'Não funciona',
               'Peça quebrada', 'Diferente do pedido', 'Produto com avaria']
    canais = ['LOJA', 'ECOMMERCE', 'B2B']
    politicas = [pol_loja, pol_ecom, pol_b2b]

    for i, estado in enumerate(estados_sequencia, 1):
        num = f'RMA-{datetime.utcnow().strftime("%Y%m")}-{i:06d}'
        prod = produtos[i % len(produtos)]
        forn = fornecedores[i % len(fornecedores)]
        canal = canais[i % 3]
        pol = politicas[i % 3]
        dias_atras = random.randint(1, 60)
        criado = datetime.utcnow() - timedelta(days=dias_atras)

        # Cria prazo SLA
        prazo = PrazoSLA(
            politica_id=pol.id,
            prazo_triagem=criado + timedelta(days=pol.prazo_triagem_dias),
            prazo_resolucao=criado + timedelta(days=pol.prazo_resolucao_dias),
            prazo_coleta=criado + timedelta(days=pol.prazo_coleta_dias),
        )
        prazo.atualizar_status()
        db.session.add(prazo)
        db.session.flush()

        rma = RMA(
            numero=num,
            estado=estado,
            canal=canal,
            cliente_nome=f'Cliente Exemplo {i}',
            cliente_documento=f'000.000.000-{i:02d}',
            loja_origem=f'Loja {i:02d}',
            produto_id=prod.id,
            fornecedor_id=forn.id,
            quantidade=random.randint(1, 3),
            numero_serie=f'SN{i:08d}',
            nf_original=f'NF-{random.randint(10000, 99999)}',
            motivo_devolucao=motivos[i % len(motivos)],
            descricao_defeito=f'Descrição detalhada do defeito para o item {i}.',
            valor_produto=Decimal(str(round(random.uniform(50, 2000), 2))),
            operador_id=us[2].id,
            prazo_sla_id=prazo.id,
            recebido_em=criado,
            criado_em=criado,
        )
        if estado in (EstadoRMA.FINALIZADO, EstadoRMA.CANCELADO):
            rma.finalizado_em = criado + timedelta(days=random.randint(3, dias_atras))
        if estado not in (EstadoRMA.ABERTO,):
            rma.tecnico_id = us[3].id
            rma.laudo_tecnico = 'Produto analisado. Defeito confirmado na placa de controle.'
            rma.categoria_defeito = 'DEFEITO_FABRICACAO'
            rma.disposicao = 'DEVOLUCAO_FORNECEDOR'

        db.session.add(rma)
        db.session.flush()

        prazo.rma_id = rma.id

        # Histórico de transições
        db.session.add(HistoricoRMA(
            rma_id=rma.id,
            estado_anterior=None,
            estado_novo=EstadoRMA.ABERTO,
            observacao='RMA aberto',
            usuario_id=us[2].id,
            criado_em=criado,
        ))

    # ── Listas configuráveis ──────────────────────────────────────────────────
    listas_padrao = [
        (TipoLista.CANAL, 'LOJA',        'Loja Física',              1),
        (TipoLista.CANAL, 'ECOMMERCE',   'E-commerce',               2),
        (TipoLista.CANAL, 'B2B',         'B2B / Corporativo',        3),
        (TipoLista.CANAL, 'MARKETPLACE', 'Marketplace',              4),
        (TipoLista.MOTIVO_DEVOLUCAO, 'DEFEITO_FABRICACAO', 'Defeito de Fabricação',       1),
        (TipoLista.MOTIVO_DEVOLUCAO, 'CHEGOU_DANIFICADO',  'Produto chegou danificado',   2),
        (TipoLista.MOTIVO_DEVOLUCAO, 'NAO_FUNCIONA',       'Não funciona',                3),
        (TipoLista.MOTIVO_DEVOLUCAO, 'PECA_QUEBRADA',      'Peça quebrada',               4),
        (TipoLista.MOTIVO_DEVOLUCAO, 'PRODUTO_ERRADO',     'Produto diferente do pedido', 5),
        (TipoLista.MOTIVO_DEVOLUCAO, 'AVARIA_TRANSPORTE',  'Avaria no transporte',        6),
        (TipoLista.MOTIVO_DEVOLUCAO, 'INCOMPLETO',         'Produto incompleto',          7),
        (TipoLista.MOTIVO_DEVOLUCAO, 'OUTRO',              'Outro',                       8),
        (TipoLista.CATEGORIA_DEFEITO, 'DEFEITO_FABRICACAO',  'Defeito de Fabricação',    1),
        (TipoLista.CATEGORIA_DEFEITO, 'AVARIA_TRANSPORTE',   'Avaria no Transporte',     2),
        (TipoLista.CATEGORIA_DEFEITO, 'USO_INCORRETO',       'Uso Incorreto',            3),
        (TipoLista.CATEGORIA_DEFEITO, 'DESGASTE_PREMATURO',  'Desgaste Prematuro',       4),
        (TipoLista.CATEGORIA_DEFEITO, 'COMPONENTE_FALTANDO', 'Componente Faltando',      5),
        (TipoLista.CATEGORIA_DEFEITO, 'SEM_DEFEITO',         'Sem Defeito Identificado', 6),
        (TipoLista.CATEGORIA_DEFEITO, 'OUTRO',               'Outro',                    7),
        (TipoLista.DESTINACAO, 'NEGOCIACAO_FORNECEDOR', 'Negociação com Fornecedor', 1),
        (TipoLista.DESTINACAO, 'DEVOLUCAO_FORNECEDOR',  'Devolução ao Fornecedor',   2),
        (TipoLista.DESTINACAO, 'REPARO',                'Reparo',                    3),
        (TipoLista.DESTINACAO, 'SUBSTITUICAO',          'Substituição',              4),
        (TipoLista.DESTINACAO, 'CREDITO',               'Crédito ao Cliente',        5),
        (TipoLista.DESTINACAO, 'SUCATA',                'Sucata / Descarte',         6),
    ]
    for tipo, valor, label, ordem in listas_padrao:
        if not ListaOpcao.query.filter_by(tipo=tipo, valor=valor).first():
            db.session.add(ListaOpcao(tipo=tipo, valor=valor, label=label, ordem=ordem))

    db.session.commit()
    print("  [seed] Banco populado com dados de exemplo.")
