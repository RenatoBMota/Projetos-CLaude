"""
SCV — Sistema de Controle de Validade  |  R&J Logistics
Backend Flask + SQLite v2.0
Execute: python app.py  |  Login: admin@scv.local / 1234
"""
import os, io, csv, socket, threading, warnings, webbrowser, base64
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_file
from werkzeug.security import generate_password_hash, check_password_hash

warnings.filterwarnings('ignore', category=DeprecationWarning)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, 'scv.db')
PORT     = int(os.environ.get('SCV_PORT', 5000))
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = 'scv-rj-2026'

# ── DB ────────────────────────────────────────────────────────────────────────
def get_db():
    import sqlite3
    c = sqlite3.connect(DB_PATH); c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL"); return c

def query(sql, params=(), one=False):
    c = get_db(); rows = c.execute(sql, params).fetchall(); c.close()
    return (dict(rows[0]) if rows else None) if one else [dict(r) for r in rows]

def execute(sql, params=()):
    c = get_db(); cur = c.execute(sql, params); c.commit(); lid = cur.lastrowid; c.close(); return lid

def _now(): return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# ── Init DB ───────────────────────────────────────────────────────────────────
def init_db():
    c = get_db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS filiais(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,codigo TEXT NOT NULL UNIQUE,ativa INTEGER DEFAULT 1,criado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS usuarios(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,email TEXT NOT NULL UNIQUE,senha_hash TEXT NOT NULL,perfil TEXT NOT NULL DEFAULT 'viewer',filial_id INTEGER,ativo INTEGER DEFAULT 1,must_change_password INTEGER DEFAULT 1,criado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS pending_users(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,email TEXT NOT NULL,status TEXT DEFAULT 'pending',criado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS estoque(id INTEGER PRIMARY KEY AUTOINCREMENT,filial_id INTEGER NOT NULL,codigo_produto TEXT NOT NULL,descricao TEXT NOT NULL,estoque_atual REAL DEFAULT 0,venda_media_diaria REAL DEFAULT 0,unidade_medida TEXT DEFAULT 'UN',categoria TEXT DEFAULT '',validade TEXT NOT NULL DEFAULT '',data_referencia TEXT,localizacao TEXT DEFAULT '',vendido INTEGER DEFAULT 0,created_at TEXT DEFAULT(datetime('now','localtime')),updated_at TEXT DEFAULT(datetime('now','localtime')),UNIQUE(filial_id,codigo_produto,validade));
    CREATE TABLE IF NOT EXISTS vendas(id INTEGER PRIMARY KEY AUTOINCREMENT,filial_id INTEGER NOT NULL,codigo_produto TEXT NOT NULL,quantidade REAL DEFAULT 0,numero_nf TEXT,data_venda TEXT NOT NULL,importado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS alertas(id INTEGER PRIMARY KEY AUTOINCREMENT,filial_id INTEGER NOT NULL,codigo_produto TEXT NOT NULL,produto_nome TEXT,nivel TEXT NOT NULL,tipo TEXT DEFAULT 'cobertura',cobertura_dias REAL,validade TEXT,mensagem TEXT,resolvido INTEGER DEFAULT 0,resolvido_em TEXT,resolvido_por TEXT,motivo_baixa TEXT DEFAULT '',criado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS configuracoes(chave TEXT PRIMARY KEY,valor TEXT,updated_at TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,user_name TEXT,action TEXT,detail TEXT,ip TEXT,criado_em TEXT DEFAULT(datetime('now','localtime')));
    CREATE TABLE IF NOT EXISTS imports_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,user_name TEXT,tipo TEXT,filial_id INTEGER,filial_nome TEXT,inseridos INTEGER DEFAULT 0,atualizados INTEGER DEFAULT 0,erros INTEGER DEFAULT 0,criado_em TEXT DEFAULT(datetime('now','localtime')));
    """)
    c.commit()
    for tbl, col, dflt in [('estoque','vendido','INTEGER DEFAULT 0'),('estoque','localizacao',"TEXT DEFAULT ''"),('estoque','motivo_baixa',"TEXT DEFAULT ''"),('alertas','motivo_baixa',"TEXT DEFAULT ''"),('vendas','numero_nf','TEXT')]:
        try: c.execute(f'ALTER TABLE {tbl} ADD COLUMN {col} {dflt}'); c.commit()
        except: pass
    # Migration: se banco antigo ainda tem UNIQUE(filial_id,codigo_produto) sem validade,
    # recria o indice incluindo validade para suportar multiplos lotes
    try:
        c.execute('DROP INDEX IF EXISTS sqlite_autoindex_estoque_1')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_estoque_lote ON estoque(filial_id,codigo_produto,validade)')
        c.commit()
    except: pass
    c.close()

def seed_db():
    if not query("SELECT id FROM filiais WHERE codigo='MTZ'",one=True):
        execute("INSERT INTO filiais(nome,codigo) VALUES(?,?)",('Matriz','MTZ'))
    if not query("SELECT id FROM usuarios WHERE email='admin@scv.local'",one=True):
        execute("INSERT INTO usuarios(nome,email,senha_hash,perfil,must_change_password) VALUES(?,?,?,?,?)",
                ('Administrador','admin@scv.local',generate_password_hash('1234'),'admin',0))
    defs={'minimo_dias_cobertura':'30','dias_critico':'15','dias_atencao':'30','modo_alerta':'both',
          'val_dias_critico':'30',
          'val_dias_atencao':'90',
          'nome_sistema':'SCV - Sistema de Controle de Validade',
          'nome_empresa':'R&J Logistics',
          'slogan_login':'Sistema de Controle de Validade',
          'logo_base64':''}
    for k,v in defs.items():
        if not query("SELECT chave FROM configuracoes WHERE chave=?",(k,),one=True):
            execute("INSERT INTO configuracoes(chave,valor) VALUES(?,?)",(k,v))

def log_action(action,detail=''):
    try:
        execute("INSERT INTO audit_log(user_id,user_name,action,detail,ip) VALUES(?,?,?,?,?)",
                (session.get('user_id'),session.get('user_nome',''),action,detail,request.remote_addr))
    except: pass

# ── Auth ──────────────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def d(*a,**kw):
        if 'user_id' not in session: return redirect(url_for('login'))
        if session.get('must_change_password'): return redirect(url_for('change_password'))
        return f(*a,**kw)
    return d

def role_required(*roles):
    def dec(f):
        @wraps(f)
        def d(*a,**kw):
            if session.get('user_perfil') not in roles: return jsonify({'error':'Sem permissão'}),403
            return f(*a,**kw)
        return d
    return dec

@app.route('/login',methods=['GET','POST'])
def login():
    if 'user_id' in session and not session.get('must_change_password'): return redirect(url_for('index'))
    error=None
    if request.method=='POST':
        email=request.form.get('email','').strip().lower()
        senha=request.form.get('senha','')
        user=query("SELECT * FROM usuarios WHERE email=? AND ativo=1",(email,),one=True)
        if user and check_password_hash(user['senha_hash'],senha):
            session.update({'user_id':user['id'],'user_nome':user['nome'],'user_perfil':user['perfil'],
                            'user_filial_id':user['filial_id'],'must_change_password':bool(user['must_change_password'])})
            log_action('login',email)
            return redirect(url_for('change_password') if user['must_change_password'] else url_for('index'))
        error='Email ou senha inválidos.'
    return render_template('login.html',error=error)

@app.route('/register',methods=['GET','POST'])
def register():
    error=None
    if request.method=='POST':
        nome=request.form.get('nome','').strip(); email=request.form.get('email','').strip().lower()
        if not nome or not email: error='Preencha todos os campos.'
        elif query("SELECT id FROM usuarios WHERE email=?",(email,),one=True): error='Email já cadastrado.'
        elif query("SELECT id FROM pending_users WHERE email=? AND status='pending'",(email,),one=True): error='Solicitação já enviada.'
        else:
            execute("INSERT INTO pending_users(nome,email) VALUES(?,?)",(nome,email))
            return redirect(url_for('register_pending'))
    return render_template('register.html',error=error)

@app.route('/register/pending')
def register_pending(): return render_template('register_pending.html')

@app.route('/change-password',methods=['GET','POST'])
def change_password():
    if 'user_id' not in session: return redirect(url_for('login'))
    error=None
    if request.method=='POST':
        nova=request.form.get('nova_senha',''); conf=request.form.get('confirmar_senha','')
        if len(nova)<6: error='Mínimo 6 caracteres.'
        elif nova!=conf: error='Senhas não coincidem.'
        else:
            execute("UPDATE usuarios SET senha_hash=?,must_change_password=0 WHERE id=?",
                    (generate_password_hash(nova),session['user_id']))
            session['must_change_password']=False; return redirect(url_for('index'))
    return render_template('change_password.html',error=error)

@app.route('/logout')
def logout(): log_action('logout'); session.clear(); return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
    return render_template('index.html',user_nome=session.get('user_nome'),user_perfil=session.get('user_perfil'),
                           empresa_nome=cfg.get('nome_empresa','R&J Logistics'),
                           empresa_slogan=cfg.get('slogan_login','Sistema de Controle de Validade'))

# ── Settings ──────────────────────────────────────────────────────────────────
@app.route('/api/settings',methods=['GET'])
@login_required
def api_settings_get():
    return jsonify({r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")})

@app.route('/api/settings',methods=['POST'])
@login_required
@role_required('admin')
def api_settings_save():
    data=request.get_json() or {}
    for k,v in data.items():
        if query("SELECT chave FROM configuracoes WHERE chave=?",(k,),one=True):
            execute("UPDATE configuracoes SET valor=?,updated_at=? WHERE chave=?",(str(v),_now(),k))
        else:
            execute("INSERT INTO configuracoes(chave,valor) VALUES(?,?)",(k,str(v)))
    log_action('settings_save',str(list(data.keys())))
    return jsonify({'ok':True})

@app.route('/api/settings/logo',methods=['POST'])
@login_required
@role_required('admin')
def api_settings_logo():
    if 'logo' not in request.files: return jsonify({'error':'Arquivo não enviado'}),400
    f=request.files['logo']; ext=f.filename.rsplit('.',1)[-1].lower()
    if ext not in ('png','jpg','jpeg','gif','svg','webp'): return jsonify({'error':'Formato inválido'}),400
    mime='image/svg+xml' if ext=='svg' else f'image/{ext}'
    uri=f'data:{mime};base64,{base64.b64encode(f.read()).decode()}'
    if query("SELECT chave FROM configuracoes WHERE chave='logo_base64'",one=True):
        execute("UPDATE configuracoes SET valor=?,updated_at=? WHERE chave='logo_base64'",(uri,_now()))
    else:
        execute("INSERT INTO configuracoes(chave,valor) VALUES('logo_base64',?)",(uri,))
    log_action('logo_upload',ext)
    return jsonify({'ok':True,'logo':uri})

@app.route('/api/settings/public',methods=['GET'])
def api_settings_public():
    try:
        cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
        return jsonify({'nome_sistema':  cfg.get('nome_sistema','SCV - Sistema de Controle de Validade'),
                        'nome_empresa':  cfg.get('nome_empresa','R&J Logistics'),
                        'slogan_login':  cfg.get('slogan_login','Sistema de Controle de Validade'),
                        'logo_base64':   cfg.get('logo_base64','')})
    except: return jsonify({'nome_sistema':'SCV','nome_empresa':'R&J Logistics','slogan_login':'SCV','logo_base64':''})

# ── Filiais ───────────────────────────────────────────────────────────────────
@app.route('/api/filiais',methods=['GET'])
@login_required
def api_filiais(): return jsonify(query("SELECT * FROM filiais ORDER BY nome"))

@app.route('/api/filiais',methods=['POST'])
@login_required
@role_required('admin')
def api_filiais_create():
    d=request.get_json() or {}
    if not d.get('nome') or not d.get('codigo'): return jsonify({'error':'Nome e código obrigatórios'}),400
    fid=execute("INSERT INTO filiais(nome,codigo) VALUES(?,?)",(d['nome'],d['codigo'].upper()))
    return jsonify({'id':fid,'ok':True})

@app.route('/api/filiais/<int:fid>',methods=['PUT'])
@login_required
@role_required('admin')
def api_filiais_update(fid):
    d=request.get_json() or {}
    execute("UPDATE filiais SET nome=?,codigo=?,ativa=? WHERE id=?",(d.get('nome'),d.get('codigo','').upper(),d.get('ativa',1),fid))
    return jsonify({'ok':True})

@app.route('/api/filiais/<int:fid>',methods=['DELETE'])
@login_required
@role_required('admin')
def api_filiais_delete(fid):
    execute("UPDATE filiais SET ativa=0 WHERE id=?",(fid,)); return jsonify({'ok':True})

def _resolve_filial(filial_id_param,filial_codigo_param):
    if filial_id_param:
        f=query("SELECT id,nome FROM filiais WHERE id=?",(filial_id_param,),one=True)
        return (f['id'],f['nome']) if f else (None,None)
    if filial_codigo_param:
        f=query("SELECT id,nome FROM filiais WHERE UPPER(codigo)=UPPER(?)",(filial_codigo_param,),one=True)
        return (f['id'],f['nome']) if f else (None,None)
    return (None,None)

# ── Usuários ──────────────────────────────────────────────────────────────────
@app.route('/api/usuarios',methods=['GET'])
@login_required
@role_required('admin')
def api_usuarios():
    users=query("SELECT u.id,u.nome,u.email,u.perfil,u.ativo,u.must_change_password,u.criado_em,f.nome AS filial_nome FROM usuarios u LEFT JOIN filiais f ON f.id=u.filial_id ORDER BY u.nome")
    pending=query("SELECT id,nome,email,criado_em FROM pending_users WHERE status='pending' ORDER BY criado_em DESC")
    return jsonify({'users':users,'pending':pending})

@app.route('/api/usuarios',methods=['POST'])
@login_required
@role_required('admin')
def api_usuarios_create():
    d=request.get_json() or {}
    if not d.get('nome') or not d.get('email'): return jsonify({'error':'Nome e email obrigatórios'}),400
    if query("SELECT id FROM usuarios WHERE email=?",(d['email'],),one=True): return jsonify({'error':'Email já cadastrado'}),400
    uid=execute("INSERT INTO usuarios(nome,email,senha_hash,perfil,filial_id,must_change_password) VALUES(?,?,?,?,?,1)",
                (d['nome'],d['email'].lower(),generate_password_hash('1234'),d.get('perfil','viewer'),d.get('filial_id')))
    return jsonify({'id':uid,'ok':True})

@app.route('/api/usuarios/<int:uid>',methods=['PUT'])
@login_required
@role_required('admin')
def api_usuarios_update(uid):
    d=request.get_json() or {}
    execute("UPDATE usuarios SET nome=?,email=?,perfil=?,filial_id=?,ativo=? WHERE id=?",
            (d.get('nome'),d.get('email','').lower(),d.get('perfil','viewer'),d.get('filial_id'),d.get('ativo',1),uid))
    return jsonify({'ok':True})

@app.route('/api/usuarios/<int:uid>/reset-senha',methods=['POST'])
@login_required
@role_required('admin')
def api_usuarios_reset(uid):
    execute("UPDATE usuarios SET senha_hash=?,must_change_password=1 WHERE id=?",(generate_password_hash('1234'),uid))
    return jsonify({'ok':True})

@app.route('/api/usuarios/<int:uid>',methods=['DELETE'])
@login_required
@role_required('admin')
def api_usuarios_delete(uid):
    if uid==session.get('user_id'): return jsonify({'error':'Não pode excluir seu próprio usuário'}),400
    execute("UPDATE usuarios SET ativo=0 WHERE id=?",(uid,)); return jsonify({'ok':True})

@app.route('/api/pending-users/<int:pid>/aprovar',methods=['POST'])
@login_required
@role_required('admin')
def api_aprovar(pid):
    d=request.get_json() or {}; row=query("SELECT * FROM pending_users WHERE id=?",(pid,),one=True)
    if not row: return jsonify({'error':'Não encontrado'}),404
    uid=execute("INSERT INTO usuarios(nome,email,senha_hash,perfil,filial_id,must_change_password) VALUES(?,?,?,?,?,1)",
                (row['nome'],row['email'],generate_password_hash('1234'),d.get('perfil','viewer'),d.get('filial_id')))
    execute("UPDATE pending_users SET status='approved' WHERE id=?",(pid,))
    return jsonify({'id':uid,'ok':True})

@app.route('/api/pending-users/<int:pid>/rejeitar',methods=['POST'])
@login_required
@role_required('admin')
def api_rejeitar(pid):
    execute("UPDATE pending_users SET status='rejected' WHERE id=?",(pid,)); return jsonify({'ok':True})

# ── Estoque ───────────────────────────────────────────────────────────────────
def _parse_validade(validade):
    """Converte validade para datetime aceitando AAAA-MM-DD e DD/MM/AAAA."""
    if not validade:
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(str(validade).strip(), fmt)
        except ValueError:
            continue
    return None

def _nivel(cob, dc, da, validade=None, modo='both', val_dc=30, val_da=90):
    """
    Calcula nivel de alerta.

    Modo 'validade':
        Compara dias restantes até o vencimento com os parâmetros.
        Ex: validade daqui 8 dias, dc=15 -> critico

    Modo 'cobertura':
        Compara a cobertura pelo giro (dias de estoque) com os parâmetros.
        Ex: cobertura 10 dias, dc=15 -> critico

    Modo 'both' (padrão — mais inteligente):
        Produto já vencido          -> critico imediato
        Cobertura > dias até vencer -> o produto vai sobrar -> nivel pela folga
            folga = dias_até_vencer - cobertura
            folga <= dc -> critico (vai sobrar muito tempo no estoque)
            folga <= da -> atencao
        Cobertura <= dias até vencer -> produto vai ser vendido antes de vencer
            Verifica pela cobertura isolada (dias de estoque)
        Sem VMD (cob=None) -> nivel só pela validade
    """
    nivel = 'ok'

    dt_val = _parse_validade(validade) if validade else None
    dias_ate_vencer = (dt_val - datetime.now()).days if dt_val else None

    # ── Produto já vencido: critico imediato ──────────────────────────────
    if dias_ate_vencer is not None and dias_ate_vencer < 0:
        return 'critico'

    if modo == 'both' and cob is not None and dias_ate_vencer is not None:
        # Cobertura maior que validade: produto vai sobrar no estoque
        # Calcula a folga: quanto vai sobrar de validade quando o último for vendido
        folga = dias_ate_vencer - cob
        if folga <= dc:
            return 'critico'
        elif folga <= da:
            nivel = 'atencao'
        # Se folga > da: produto será vendido bem antes de vencer -> ok
        return nivel

    # ── Modo 'validade': classifica só pelos dias restantes ───────────────
    if modo in ('validade', 'both') and dias_ate_vencer is not None:
        if dias_ate_vencer <= dc:
            return 'critico'
        elif dias_ate_vencer <= da:
            nivel = 'atencao'

    # ── Modo 'cobertura': classifica pela cobertura de giro ───────────────
    if modo in ('cobertura', 'both') and cob is not None:
        if cob <= dc:
            return 'critico'
        elif cob <= da:
            nivel = 'atencao'

    return nivel

@app.route('/api/estoque',methods=['GET'])
@login_required
def api_estoque():
    perfil=session.get('user_perfil'); uf=session.get('user_filial_id')
    fil=request.args.get('filial_id',''); cat=request.args.get('categoria','')
    alerta=request.args.get('alerta',''); srch=request.args.get('search','')
    ini=request.args.get('data_ini',''); fim=request.args.get('data_fim','')
    vendido=request.args.get('vendido','0')

    sql="SELECT e.*,f.nome AS filial_nome FROM estoque e JOIN filiais f ON f.id=e.filial_id WHERE 1=1"; p=[]
    if perfil=='viewer': sql+=" AND e.filial_id=?"; p.append(uf)
    elif fil: sql+=" AND e.filial_id=?"; p.append(fil)
    if cat:  sql+=" AND e.categoria=?"; p.append(cat)
    if srch: sql+=" AND (e.codigo_produto LIKE ? OR e.descricao LIKE ?)"; p+=[f'%{srch}%']*2
    if ini:  sql+=" AND e.data_referencia>=?"; p.append(ini)
    if fim:  sql+=" AND e.data_referencia<=?"; p.append(fim)
    if vendido!='': sql+=" AND e.vendido=?"; p.append(int(vendido))
    sql+=" ORDER BY e.descricao"

    cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
    dc=float(cfg.get('dias_critico',15)); da=float(cfg.get('dias_atencao',30))
    modo=cfg.get('modo_alerta','both')
    val_dc=float(cfg.get('val_dias_critico',30)); val_da=float(cfg.get('val_dias_atencao',90))
    result=[]
    for r in query(sql,p):
        vmd=r.get('venda_media_diaria') or 0; est=r.get('estoque_atual') or 0
        cob=round(est/vmd,1) if vmd>0 else None
        nv=_nivel(cob,dc,da,validade=r.get('validade'),modo=modo,val_dc=val_dc,val_da=val_da)
        item=dict(r); item['cobertura_dias']=cob; item['nivel_alerta']=nv
        if not alerta or alerta==nv: result.append(item)
    return jsonify(result)

@app.route('/api/estoque/categorias',methods=['GET'])
@login_required
def api_estoque_cats():
    return jsonify([r['categoria'] for r in query("SELECT DISTINCT categoria FROM estoque WHERE categoria!='' ORDER BY categoria")])

@app.route('/api/estoque/<int:eid>/marcar-vendido',methods=['POST'])
@login_required
def api_estoque_vendido(eid):
    d = request.get_json() or {}
    motivo = d.get('motivo', 'vendido')  # vendido | descarte | devolucao
    execute("UPDATE estoque SET vendido=1,motivo_baixa=?,updated_at=? WHERE id=?",(motivo,_now(),eid))
    item=query("SELECT filial_id,codigo_produto,validade FROM estoque WHERE id=?",(eid,),one=True)
    if item:
        execute("UPDATE alertas SET resolvido=1,resolvido_em=?,resolvido_por=? WHERE filial_id=? AND codigo_produto=? AND validade=? AND resolvido=0",
                (_now(),session.get('user_nome',''),item['filial_id'],item['codigo_produto'],item['validade']))
    log_action(f'estoque_{motivo}',f'item {eid}')
    return jsonify({'ok':True})

@app.route('/api/estoque/manual',methods=['POST'])
@login_required
@role_required('admin','auditor')
def api_estoque_manual():
    d=request.get_json() or {}
    fid,fname=_resolve_filial(d.get('filial_id'),d.get('filial_codigo'))
    if not fid: return jsonify({'error':'Filial não encontrada'}),400
    for f in ['codigo_produto','descricao','estoque_atual','validade']:
        if not d.get(f): return jsonify({'error':f'Campo obrigatório: {f}'}),400
    val=d['validade']
    ex=query("SELECT id FROM estoque WHERE codigo_produto=? AND filial_id=? AND validade=?",(d['codigo_produto'],fid,val),one=True)
    dr=d.get('data_referencia',datetime.now().strftime('%Y-%m-%d'))
    loc=d.get('localizacao','').strip()
    if ex:
        # Mesmo lote (mesma validade) -> atualiza quantidade e localizacao
        execute("UPDATE estoque SET descricao=?,estoque_atual=?,unidade_medida=?,categoria=?,localizacao=?,data_referencia=?,vendido=0,updated_at=? WHERE id=?",
                (d['descricao'],float(d['estoque_atual']),d.get('unidade_medida','UN'),d.get('categoria',''),loc,dr,_now(),ex['id']))
        log_action('estoque_manual_upd',f"{d['codigo_produto']} val:{val}")
        return jsonify({'ok':True,'action':'updated'})
    else:
        # Novo lote (validade diferente ou produto novo) -> insere nova linha
        execute("INSERT INTO estoque(filial_id,codigo_produto,descricao,estoque_atual,unidade_medida,categoria,localizacao,validade,data_referencia) VALUES(?,?,?,?,?,?,?,?,?)",
                (fid,d['codigo_produto'],d['descricao'],float(d['estoque_atual']),d.get('unidade_medida','UN'),d.get('categoria',''),loc,val,dr))
        log_action('estoque_manual_ins',f"{d['codigo_produto']} val:{val}")
        return jsonify({'ok':True,'action':'inserted'})

# ── Importação Estoque ────────────────────────────────────────────────────────
@app.route('/api/import/estoque',methods=['POST'])
@login_required
@role_required('admin','auditor')
def api_import_estoque():
    if 'file' not in request.files: return jsonify({'error':'Nenhum arquivo enviado'}),400
    file=request.files['file']
    filial_id_form=request.form.get('filial_id','')
    filial_cod_form=request.form.get('filial_codigo','').strip().upper()
    try:
        import pandas as pd
        fn=file.filename.lower()
        df=pd.read_csv(file,encoding='utf-8-sig',sep=None,engine='python') if fn.endswith('.csv') else pd.read_excel(file)
    except Exception as e: return jsonify({'error':f'Erro ao ler: {e}'}),400
    df.columns=df.columns.str.lower().str.strip()
    # Obrigatórias: sem venda_media_diaria (calculada nas vendas)
    required={'codigo_produto','descricao','estoque_atual','validade'}
    missing=required-set(df.columns)
    if missing: return jsonify({'error':f'Colunas faltando: {", ".join(missing)}'}),400
    has_fil='filial_codigo' in df.columns
    inserted=updated=0; errors=[]; filial_nome_log=''
    for idx,row in df.iterrows():
        try:
            fid,fn2=_resolve_filial(None,str(row['filial_codigo']).strip().upper()) if has_fil else _resolve_filial(filial_id_form,filial_cod_form)
            if not fid: errors.append(f'Linha {idx+2}: filial não encontrada'); continue
            filial_nome_log=fn2 or filial_nome_log
            codigo=str(row['codigo_produto']).strip(); descricao=str(row['descricao']).strip()
            estoque=float(row['estoque_atual']); validade=str(row['validade']).strip()
            if not validade: errors.append(f'Linha {idx+2}: validade obrigatória'); continue
            unidade=str(row.get('unidade_medida','UN')).strip()
            categoria=str(row.get('categoria','')).strip()
            localizacao=str(row.get('localizacao','')).strip()
            dr=str(row.get('data_referencia',datetime.now().strftime('%Y-%m-%d'))).strip()
            # Chave = filial + produto + validade -> suporta multiplos lotes
            ex=query("SELECT id FROM estoque WHERE codigo_produto=? AND filial_id=? AND validade=?",(codigo,fid,validade),one=True)
            if ex:
                # Mesmo lote: atualiza quantidade, localizacao e dados
                execute("UPDATE estoque SET descricao=?,estoque_atual=?,unidade_medida=?,categoria=?,localizacao=?,data_referencia=?,vendido=0,updated_at=? WHERE id=?",
                        (descricao,estoque,unidade,categoria,localizacao,dr,_now(),ex['id']))
                updated+=1
            else:
                execute("INSERT INTO estoque(filial_id,codigo_produto,descricao,estoque_atual,unidade_medida,categoria,localizacao,validade,data_referencia) VALUES(?,?,?,?,?,?,?,?,?)",
                        (fid,codigo,descricao,estoque,unidade,categoria,localizacao,validade,dr))
                inserted+=1
        except Exception as e: errors.append(f'Linha {idx+2}: {e}')
    execute("INSERT INTO imports_log(user_id,user_name,tipo,filial_id,filial_nome,inseridos,atualizados,erros) VALUES(?,?,?,?,?,?,?,?)",
            (session['user_id'],session['user_nome'],'estoque',filial_id_form or 0,filial_nome_log,inserted,updated,len(errors)))
    log_action('import_estoque',f'{filial_nome_log}: {inserted} ins {updated} upd')
    return jsonify({'ok':True,'inserted':inserted,'updated':updated,'errors':errors})

# ── Importação Vendas (calcula VMD automático) ────────────────────────────────
@app.route('/api/import/vendas',methods=['POST'])
@login_required
@role_required('admin','auditor')
def api_import_vendas():
    if 'file' not in request.files: return jsonify({'error':'Nenhum arquivo enviado'}),400
    file=request.files['file']
    filial_id_form=request.form.get('filial_id','')
    filial_cod_form=request.form.get('filial_codigo','').strip().upper()
    try:
        import pandas as pd; fn=file.filename.lower()
        df=pd.read_csv(file,encoding='utf-8-sig',sep=None,engine='python') if fn.endswith('.csv') else pd.read_excel(file)
    except Exception as e: return jsonify({'error':f'Erro ao ler: {e}'}),400
    df.columns=df.columns.str.lower().str.strip()
    required={'codigo_produto','quantidade','data_venda'}
    missing=required-set(df.columns)
    if missing: return jsonify({'error':f'Colunas faltando: {", ".join(missing)}'}),400
    has_fil='filial_codigo' in df.columns; has_nf='numero_nf' in df.columns

    # Se planilha não tem coluna filial_codigo, o formulário DEVE informar filial
    if not has_fil and not filial_id_form and not filial_cod_form:
        return jsonify({'error': 'Informe a filial no formulário ou inclua a coluna filial_codigo na planilha'}), 400

    inserted=errors=0
    erros_detalhe=[]
    # Rastreia apenas os produtos/filiais afetados nesta importação
    afetados=set()

    for idx,row in df.iterrows():
        try:
            if has_fil:
                cod_fil=str(row.get('filial_codigo','')).strip().upper()
                if not cod_fil:
                    erros_detalhe.append(f'Linha {idx+2}: coluna filial_codigo vazia')
                    errors+=1; continue
                fid,_=_resolve_filial(None, cod_fil)
            else:
                fid,_=_resolve_filial(filial_id_form, filial_cod_form)

            if not fid:
                cod_inf=str(row.get('filial_codigo','?')) if has_fil else (filial_cod_form or f'id={filial_id_form}')
                erros_detalhe.append(f'Linha {idx+2}: filial "{cod_inf}" não encontrada')
                errors+=1; continue

            codigo=str(row['codigo_produto']).strip()
            qtd=float(row['quantidade'])
            data=str(row['data_venda']).strip()
            nf=str(row['numero_nf']).strip() if has_nf and row.get('numero_nf') else None

            execute("INSERT INTO vendas(filial_id,codigo_produto,quantidade,data_venda,numero_nf) VALUES(?,?,?,?,?)",
                    (fid, codigo, qtd, data, nf))
            afetados.add((fid, codigo))
            inserted+=1
        except Exception as e:
            erros_detalhe.append(f'Linha {idx+2}: {e}')
            errors+=1

    # Recalcula VMD APENAS para os produtos/filiais afetados nesta importação
    # VMD = Σ quantidade vendida / nº de dias distintos com venda (por filial+produto)
    vmd_upd=0
    for (fid, codigo) in afetados:
        res=query("""SELECT SUM(quantidade) AS tq, COUNT(DISTINCT data_venda) AS td
                     FROM vendas WHERE filial_id=? AND codigo_produto=?""",
                  (fid, codigo), one=True)
        if res and res['td'] and res['td'] > 0:
            vmd=round(res['tq'] / res['td'], 4)
            execute("UPDATE estoque SET venda_media_diaria=?,updated_at=? WHERE filial_id=? AND codigo_produto=?",
                    (vmd, _now(), fid, codigo))
            vmd_upd+=1

    # Log com filial(ais) distintas desta importação
    filiais_afetadas=list({fid for fid,_ in afetados})
    nome_log=', '.join(
        (query("SELECT nome FROM filiais WHERE id=?",(f,),one=True) or {}).get('nome','?')
        for f in filiais_afetadas
    ) if filiais_afetadas else (filial_cod_form or filial_id_form or '?')

    execute("INSERT INTO imports_log(user_id,user_name,tipo,filial_id,filial_nome,inseridos,erros) VALUES(?,?,?,?,?,?,?)",
            (session['user_id'],session['user_nome'],'vendas',
             filiais_afetadas[0] if len(filiais_afetadas)==1 else 0,
             nome_log, inserted, errors))
    log_action('import_vendas', f'{nome_log}: {inserted} vendas, {vmd_upd} VMDs recalculados')
    return jsonify({'ok':True,'inserted':inserted,'errors':errors,
                    'errors_detail':erros_detalhe[:20],
                    'vmd_atualizados':vmd_upd,'filiais':nome_log})

@app.route('/api/vendas/manual',methods=['POST'])
@login_required
@role_required('admin','auditor')
def api_venda_manual():
    d=request.get_json() or {}
    fid,fname=_resolve_filial(d.get('filial_id'),d.get('filial_codigo'))
    if not fid: return jsonify({'error':'Filial não encontrada'}),400
    for f in ['codigo_produto','quantidade','data_venda']:
        if not d.get(f): return jsonify({'error':f'Campo obrigatório: {f}'}),400
    execute("INSERT INTO vendas(filial_id,codigo_produto,quantidade,data_venda,numero_nf) VALUES(?,?,?,?,?)",
            (fid,d['codigo_produto'],float(d['quantidade']),d['data_venda'],d.get('numero_nf')))
    res=query("SELECT SUM(quantidade) AS tq,COUNT(DISTINCT data_venda) AS td FROM vendas WHERE filial_id=? AND codigo_produto=?",
              (fid,d['codigo_produto']),one=True)
    if res and res['td']:
        # Propaga VMD para todos os lotes do produto
        execute("UPDATE estoque SET venda_media_diaria=?,updated_at=? WHERE filial_id=? AND codigo_produto=?",
                (round(res['tq']/res['td'],4),_now(),fid,d['codigo_produto']))
    log_action('venda_manual',d['codigo_produto']); return jsonify({'ok':True})

@app.route('/api/imports-log',methods=['GET'])
@login_required
def api_imports_log():
    tipo=request.args.get('tipo',''); sql="SELECT * FROM imports_log WHERE 1=1"; p=[]
    if tipo: sql+=" AND tipo=?"; p.append(tipo)
    return jsonify(query(sql+f" ORDER BY criado_em DESC LIMIT {int(request.args.get('limit',50))}",p))

@app.route('/api/import/modelo/<tipo>')
@login_required
def download_modelo(tipo):
    if tipo=='estoque':
        h=['filial_codigo','codigo_produto','descricao','estoque_atual','unidade_medida','categoria','localizacao','validade','data_referencia']
        e=['MTZ','PROD001','Produto Exemplo','100','UN','Alimentos','Estoque Loja','2025-12-31','2024-01-01']
    elif tipo=='vendas':
        h=['filial_codigo','codigo_produto','quantidade','data_venda','numero_nf']
        e=['MTZ','PROD001','10','2024-01-15','NF-12345']
    else: return jsonify({'error':'Tipo inválido'}),400
    out=io.StringIO(); csv.writer(out,delimiter=';').writerows([h,e]); out.seek(0)
    return send_file(io.BytesIO(('\ufeff'+out.getvalue()).encode('utf-8')),mimetype='text/csv',
                     as_attachment=True,download_name=f'modelo_{tipo}.csv')

# ── Engine de Alertas ─────────────────────────────────────────────────────────
def rodar_engine_alertas(filial_id=None):
    cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
    dc=float(cfg.get('dias_critico',15)); da=float(cfg.get('dias_atencao',30))
    modo=cfg.get('modo_alerta','both')
    val_dc=float(cfg.get('val_dias_critico',30)); val_da=float(cfg.get('val_dias_atencao',90))
    sql="SELECT * FROM estoque WHERE vendido=0"; p=[]
    if filial_id: sql+=" AND filial_id=?"; p.append(filial_id)
    gerados=0
    for item in query(sql,p):
        fid=item['filial_id']; cod=item['codigo_produto']; valid=item.get('validade')
        # Alerta por lote: chave e filial+produto+validade
        if query("SELECT id FROM alertas WHERE filial_id=? AND codigo_produto=? AND validade=? AND resolvido=0",(fid,cod,valid),one=True): continue
        # VMD: usa a VMD do produto (calculada sobre todas as vendas, independente do lote)
        vmd=item.get('venda_media_diaria') or 0
        # Cobertura: usa o estoque DESTE lote especifico
        estq=item.get('estoque_atual') or 0
        cob=round(estq/vmd,1) if vmd>0 else None
        nivel=None
        if modo in ('cobertura','both') and cob is not None:
            if cob<=dc: nivel='critico'
            elif cob<=da: nivel='atencao'
        if modo in ('validade','both') and valid:
            dt_val=_parse_validade(valid)
            if dt_val is not None:
                diff=(dt_val-datetime.now()).days
                if diff<0: nivel='critico'
                elif diff<=val_dc and nivel!='critico': nivel='critico'
                elif diff<=val_da and nivel!='critico': nivel='atencao'
        if nivel:
            mensagem=(f'Cobertura: {cob} dias | Validade: {valid}') if cob else f'Validade: {valid}'
            execute("INSERT INTO alertas(filial_id,codigo_produto,produto_nome,nivel,tipo,cobertura_dias,validade,mensagem) VALUES(?,?,?,?,?,?,?,?)",
                    (fid,cod,item['descricao'],nivel,modo,cob,valid,mensagem))
            gerados+=1
    return gerados

@app.route('/api/alertas',methods=['GET'])
@login_required
def api_alertas():
    perfil=session.get('user_perfil'); uf=session.get('user_filial_id')
    fil=request.args.get('filial_id',''); nivel=request.args.get('nivel','')
    ini=request.args.get('data_ini',''); fim=request.args.get('data_fim','')
    res=request.args.get('resolvido','0')
    sql="SELECT a.*,f.nome AS filial_nome FROM alertas a JOIN filiais f ON f.id=a.filial_id WHERE 1=1"; p=[]
    if perfil=='viewer': sql+=" AND a.filial_id=?"; p.append(uf)
    elif fil: sql+=" AND a.filial_id=?"; p.append(fil)
    if nivel: sql+=" AND a.nivel=?"; p.append(nivel)
    if ini:   sql+=" AND a.criado_em>=?"; p.append(ini)
    if fim:   sql+=" AND a.criado_em<=?"; p.append(fim+' 23:59:59')
    sql+=" AND a.resolvido=?"; p.append(int(res))
    sql+=" ORDER BY CASE a.nivel WHEN 'critico' THEN 1 WHEN 'atencao' THEN 2 ELSE 3 END,a.criado_em DESC"
    return jsonify(query(sql,p))

@app.route('/api/alertas/rodar',methods=['POST'])
@login_required
@role_required('admin','auditor')
def api_alertas_rodar():
    d=request.get_json() or {}; gerados=rodar_engine_alertas(d.get('filial_id'))
    log_action('alertas_engine',f'{gerados} gerados'); return jsonify({'ok':True,'gerados':gerados})

@app.route('/api/alertas/<int:aid>/resolver',methods=['POST'])
@login_required
def api_alertas_resolver(aid):
    d = request.get_json() or {}
    motivo = d.get('motivo','vendido')  # vendido | descarte | devolucao
    # Salva motivo no alerta
    execute("UPDATE alertas SET resolvido=1,resolvido_em=?,resolvido_por=?,motivo_baixa=? WHERE id=?",
            (_now(),session.get('user_nome',''),motivo,aid))
    # Marca o lote de estoque correspondente como baixado
    alerta = query("SELECT filial_id,codigo_produto,validade FROM alertas WHERE id=?",(aid,),one=True)
    if alerta:
        execute("UPDATE estoque SET vendido=1,motivo_baixa=?,updated_at=? WHERE filial_id=? AND codigo_produto=? AND validade=? AND vendido=0",
                (motivo,_now(),alerta['filial_id'],alerta['codigo_produto'],alerta['validade']))
    log_action(f'alerta_{motivo}',f'alerta {aid}')
    return jsonify({'ok':True})

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard',methods=['GET'])
@login_required
def api_dashboard():
    perfil=session.get('user_perfil'); uf=session.get('user_filial_id')
    fil=request.args.get('filial_id','')
    fc,fp="",[]
    if perfil=='viewer': fc=" AND filial_id=?"; fp=[uf]
    elif fil: fc=" AND filial_id=?"; fp=[fil]
    cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
    dc=float(cfg.get('dias_critico',15))
    total=query(f"SELECT COUNT(*) AS n FROM estoque WHERE vendido=0{fc}",fp,one=True)['n']
    # Criticos por cobertura OU por validade vencida/proxima
    crit_cob=query(f"SELECT COUNT(*) AS n FROM estoque WHERE vendido=0 AND venda_media_diaria>0 AND (estoque_atual/venda_media_diaria)<={dc}{fc}",fp,one=True)['n']
    crit_val=query(f"SELECT COUNT(*) AS n FROM estoque WHERE vendido=0 AND (validade LIKE '__/__/____' OR validade LIKE '____-__-__'){fc}",fp,one=True)['n']
    crit=crit_cob  # engine calculara o total correto ao rodar
    ativos=query(f"SELECT COUNT(*) AS n FROM alertas WHERE resolvido=0{fc}",fp,one=True)['n']
    pnivel=query(f"SELECT nivel,COUNT(*) AS total FROM alertas WHERE resolvido=0{fc} GROUP BY nivel",fp)
    tendencia=[]
    for i in range(6,-1,-1):
        dia=(datetime.now()-timedelta(days=i)).strftime('%Y-%m-%d')
        cnt=query(f"SELECT COUNT(*) AS n FROM alertas WHERE criado_em LIKE ?{fc}",[dia+'%']+fp,one=True)['n']
        tendencia.append({'data':dia,'alertas':cnt})
    return jsonify({'total_itens':total,'criticos':crit,'alertas_ativos':ativos,'por_nivel':pnivel,'tendencia_7d':tendencia})

# ── Relatórios ────────────────────────────────────────────────────────────────
@app.route('/api/relatorios/alertas',methods=['GET'])
@login_required
def api_rel_alertas():
    fil=request.args.get('filial_id',''); niv=request.args.get('nivel','')
    ini=request.args.get('data_ini',''); fim=request.args.get('data_fim','')
    res=request.args.get('resolvido',''); motivo=request.args.get('motivo','')
    sql="SELECT a.*,f.nome AS filial_nome FROM alertas a JOIN filiais f ON f.id=a.filial_id WHERE 1=1"; p=[]
    if fil: sql+=" AND a.filial_id=?"; p.append(fil)
    if niv: sql+=" AND a.nivel=?"; p.append(niv)
    if ini: sql+=" AND DATE(a.criado_em)>=?"; p.append(ini)
    if fim: sql+=" AND DATE(a.criado_em)<=?"; p.append(fim)
    if res!='': sql+=" AND a.resolvido=?"; p.append(int(res))
    if motivo: sql+=" AND a.motivo_baixa=?"; p.append(motivo)
    return jsonify(query(sql+" ORDER BY a.criado_em DESC",p))

@app.route('/api/relatorios/estoque',methods=['GET'])
@login_required
def api_rel_estoque():
    fil=request.args.get('filial_id',''); niv=request.args.get('nivel','')
    sql="SELECT e.*,f.nome AS filial_nome FROM estoque e JOIN filiais f ON f.id=e.filial_id WHERE e.vendido=0"; p=[]
    if fil: sql+=" AND e.filial_id=?"; p.append(fil)
    cfg={r['chave']:r['valor'] for r in query("SELECT chave,valor FROM configuracoes")}
    dc,da=float(cfg.get('dias_critico',15)),float(cfg.get('dias_atencao',30))
    modo=cfg.get('modo_alerta','both')
    val_dc=float(cfg.get('val_dias_critico',30)); val_da=float(cfg.get('val_dias_atencao',90))
    result=[]
    for r in query(sql+" ORDER BY e.descricao",p):
        vmd=r.get('venda_media_diaria') or 0; cob=round(r['estoque_atual']/vmd,1) if vmd>0 else None
        n=_nivel(cob,dc,da,validade=r.get('validade'),modo=modo,val_dc=val_dc,val_da=val_da)
        item=dict(r); item['cobertura_dias']=cob; item['nivel_alerta']=n
        if not niv or niv==n: result.append(item)
    return jsonify(result)

@app.route('/api/relatorios/export-csv/<tipo>',methods=['GET'])
@login_required
def api_export_csv(tipo):
    if tipo=='alertas':
        rows=query("SELECT a.criado_em,f.nome AS filial,a.codigo_produto,a.produto_nome,a.nivel,a.cobertura_dias,a.validade,a.mensagem,CASE a.resolvido WHEN 1 THEN 'Sim' ELSE 'Nao' END AS resolvido FROM alertas a JOIN filiais f ON f.id=a.filial_id ORDER BY a.criado_em DESC")
        cols=['criado_em','filial','codigo_produto','produto_nome','nivel','cobertura_dias','validade','mensagem','resolvido']
    elif tipo=='estoque':
        rows=query("SELECT e.codigo_produto,e.descricao,f.nome AS filial,e.categoria,e.localizacao,e.estoque_atual,e.unidade_medida,e.venda_media_diaria,e.validade,e.data_referencia FROM estoque e JOIN filiais f ON f.id=e.filial_id WHERE e.vendido=0 ORDER BY e.descricao")
        cols=['codigo_produto','descricao','filial','categoria','localizacao','estoque_atual','unidade_medida','venda_media_diaria','validade','data_referencia']
    else: return jsonify({'error':'Tipo inválido'}),400
    out=io.StringIO(); w=csv.writer(out,delimiter=';'); w.writerow(cols)
    for r in rows: w.writerow([r.get(c,'') for c in cols])
    out.seek(0)
    return send_file(io.BytesIO(('\ufeff'+out.getvalue()).encode('utf-8')),mimetype='text/csv',
                     as_attachment=True,download_name=f'relatorio_{tipo}_{datetime.now().strftime("%Y%m%d")}.csv')

@app.route('/api/audit-log',methods=['GET'])
@login_required
@role_required('admin')
def api_audit_log():
    act=request.args.get('action',''); ini=request.args.get('data_ini',''); fim=request.args.get('data_fim','')
    sql="SELECT * FROM audit_log WHERE 1=1"; p=[]
    if act: sql+=" AND action=?"; p.append(act)
    if ini: sql+=" AND DATE(criado_em)>=?"; p.append(ini)
    if fim: sql+=" AND DATE(criado_em)<=?"; p.append(fim)
    return jsonify(query(sql+f" ORDER BY criado_em DESC LIMIT {int(request.args.get('limit',100))}",p))

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__=='__main__':
    init_db(); seed_db()
    # Roda engine de alertas automaticamente ao iniciar
    with app.app_context():
        try:
            gerados = rodar_engine_alertas()
            if gerados: print(f'  Engine: {gerados} alerta(s) gerado(s) na inicializacao')
        except Exception as e:
            print(f'  Engine: {e}')
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); ip=s.getsockname()[0]; s.close()
    except: ip='127.0.0.1'
    print(f"\n╔══════════════════════════════════════════╗\n║  SCV — R&J Logistics                     ║\n║  Local: http://127.0.0.1:{PORT}              ║\n║  Rede:  http://{ip}:{PORT}           ║\n║  Login: admin@scv.local / 1234           ║\n╚══════════════════════════════════════════╝\n")
    threading.Thread(target=lambda:(__import__('time').sleep(1.2),webbrowser.open(f'http://127.0.0.1:{PORT}')),daemon=True).start()
    app.run(host='0.0.0.0',port=PORT,debug=False,use_reloader=False)
