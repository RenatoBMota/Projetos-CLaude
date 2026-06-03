import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'transferencia.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            filial_origem TEXT,
            filial_destino TEXT,
            periodo_dias INTEGER,
            data_inicio TEXT,
            data_fim TEXT,
            dias_min_origem INTEGER,
            dias_meta_destino INTEGER,
            nivel_servico INTEGER DEFAULT 95,
            total_produtos INTEGER,
            total_unidades REAL
        );

        CREATE TABLE IF NOT EXISTS sugestoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER REFERENCES sessions(id),
            codigo_produto TEXT,
            descricao_produto TEXT,
            comprador TEXT,
            codigo_fornecedor TEXT,
            nome_fornecedor TEXT,
            mdv_destino REAL,
            sigma_destino REAL DEFAULT 0,
            cv_destino REAL DEFAULT 0,
            estoque_seguranca REAL DEFAULT 0,
            estoque_destino REAL,
            em_transito REAL,
            reservas REAL,
            cobertura_destino_atual REAL,
            estoque_desejado REAL,
            necessidade REAL,
            mdv_origem REAL,
            estoque_origem REAL,
            estoque_vital REAL,
            disponivel REAL,
            sugestao REAL,
            status TEXT,
            incluido INTEGER DEFAULT 1,
            motivo_exclusao TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS aprovacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sugestao_id INTEGER REFERENCES sugestoes(id),
            session_id INTEGER,
            comprador TEXT,
            decisao TEXT,
            quantidade_aprovada REAL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sugestao_id)
        );
    """)
    # Migrate existing DB: add new columns if they don't exist yet
    existing = {row[1] for row in c.execute("PRAGMA table_info(sessions)")}
    if 'nivel_servico' not in existing:
        c.execute("ALTER TABLE sessions ADD COLUMN nivel_servico INTEGER DEFAULT 95")
    if 'data_inicio' not in existing:
        c.execute("ALTER TABLE sessions ADD COLUMN data_inicio TEXT")
    if 'data_fim' not in existing:
        c.execute("ALTER TABLE sessions ADD COLUMN data_fim TEXT")
    if 'finalizada' not in existing:
        c.execute("ALTER TABLE sessions ADD COLUMN finalizada INTEGER DEFAULT 0")
    if 'finalizada_em' not in existing:
        c.execute("ALTER TABLE sessions ADD COLUMN finalizada_em TIMESTAMP")
    existing_s = {row[1] for row in c.execute("PRAGMA table_info(sugestoes)")}
    for col, typ in [('sigma_destino', 'REAL'), ('cv_destino', 'REAL'), ('estoque_seguranca', 'REAL')]:
        if col not in existing_s:
            c.execute(f"ALTER TABLE sugestoes ADD COLUMN {col} {typ} DEFAULT 0")
    if 'incluido' not in existing_s:
        c.execute("ALTER TABLE sugestoes ADD COLUMN incluido INTEGER DEFAULT 1")
    if 'motivo_exclusao' not in existing_s:
        c.execute("ALTER TABLE sugestoes ADD COLUMN motivo_exclusao TEXT DEFAULT ''")
    conn.commit()
    conn.close()


def get_sessions():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM sessions ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return rows


def get_session(session_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()
    return row


def create_session(filial_origem, filial_destino, periodo_dias, data_inicio, data_fim,
                   dias_min_origem, dias_meta_destino, nivel_servico, total_produtos, total_unidades):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO sessions (filial_origem, filial_destino, periodo_dias, data_inicio, data_fim,
            dias_min_origem, dias_meta_destino, nivel_servico, total_produtos, total_unidades)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (filial_origem, filial_destino, periodo_dias, data_inicio, data_fim,
          dias_min_origem, dias_meta_destino, nivel_servico, total_produtos, total_unidades))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id


def finalize_session(session_id):
    conn = get_connection()
    conn.execute("UPDATE sessions SET finalizada=1, finalizada_em=CURRENT_TIMESTAMP WHERE id=?", (session_id,))
    conn.commit()
    conn.close()


def insert_sugestoes(session_id, rows):
    conn = get_connection()
    c = conn.cursor()
    c.executemany("""
        INSERT INTO sugestoes (session_id, codigo_produto, descricao_produto,
            comprador, codigo_fornecedor, nome_fornecedor,
            mdv_destino, sigma_destino, cv_destino, estoque_seguranca,
            estoque_destino, em_transito, reservas,
            cobertura_destino_atual, estoque_desejado, necessidade,
            mdv_origem, estoque_origem, estoque_vital, disponivel, sugestao, status,
            incluido, motivo_exclusao)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, [(session_id, r['codigo_produto'], r['descricao_produto'],
           r['comprador'], r['codigo_fornecedor'], r['nome_fornecedor'],
           r['mdv_destino'], r['sigma_destino'], r['cv_destino'], r['estoque_seguranca'],
           r['estoque_destino'], r['em_transito'], r['reservas'],
           r['cobertura_destino_atual'], r['estoque_desejado'], r['necessidade'],
           r['mdv_origem'], r['estoque_origem'], r['estoque_vital'],
           r['disponivel'], r['sugestao'], r['status'],
           1 if r.get('incluido', True) else 0, r.get('motivo_exclusao', '')) for r in rows])
    conn.commit()
    conn.close()


def get_sugestoes(session_id):
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, a.decisao, a.quantidade_aprovada, a.updated_at as aprovado_em
        FROM sugestoes s
        LEFT JOIN aprovacoes a ON a.sugestao_id = s.id
        WHERE s.session_id = ? AND (s.incluido = 1 OR s.incluido IS NULL)
        ORDER BY s.comprador, s.descricao_produto
    """, (session_id,)).fetchall()
    conn.close()
    return rows


def get_sugestoes_by_comprador(session_id, comprador):
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, a.decisao, a.quantidade_aprovada, a.updated_at as aprovado_em
        FROM sugestoes s
        LEFT JOIN aprovacoes a ON a.sugestao_id = s.id
        WHERE s.session_id = ? AND s.comprador = ? AND s.sugestao > 0
        ORDER BY s.descricao_produto
    """, (session_id, comprador)).fetchall()
    conn.close()
    return rows


def get_compradores(session_id):
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.comprador,
               COUNT(*) as total,
               SUM(CASE WHEN a.decisao IS NULL THEN 1 ELSE 0 END) as pendente,
               SUM(CASE WHEN a.decisao = 'aprovado' THEN 1 ELSE 0 END) as aprovado,
               SUM(CASE WHEN a.decisao = 'recusado' THEN 1 ELSE 0 END) as recusado,
               SUM(CASE WHEN a.decisao = 'alterado' THEN 1 ELSE 0 END) as alterado
        FROM sugestoes s
        LEFT JOIN aprovacoes a ON a.sugestao_id = s.id
        WHERE s.session_id = ? AND s.sugestao > 0
        GROUP BY s.comprador
        ORDER BY s.comprador
    """, (session_id,)).fetchall()
    conn.close()
    return rows


def upsert_aprovacao(sugestao_id, session_id, comprador, decisao, quantidade_aprovada):
    conn = get_connection()
    conn.execute("""
        INSERT INTO aprovacoes (sugestao_id, session_id, comprador, decisao, quantidade_aprovada, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(sugestao_id) DO UPDATE SET
            decisao = excluded.decisao,
            quantidade_aprovada = excluded.quantidade_aprovada,
            updated_at = CURRENT_TIMESTAMP
    """, (sugestao_id, session_id, comprador, decisao, quantidade_aprovada))
    conn.commit()
    conn.close()


def get_sugestao_by_codigo(session_id, codigo_produto):
    """Return full calc details for a specific product code in a session."""
    conn = get_connection()
    row = conn.execute("""
        SELECT s.*, a.decisao, a.quantidade_aprovada, a.updated_at as aprovado_em
        FROM sugestoes s
        LEFT JOIN aprovacoes a ON a.sugestao_id = s.id
        WHERE s.session_id = ? AND s.codigo_produto LIKE ?
        LIMIT 1
    """, (session_id, f'%{codigo_produto.strip()}%')).fetchone()
    conn.close()
    return row


def get_all_compradores_in_session(session_id):
    """Return distinct comprador values from sugestoes for a session."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT DISTINCT comprador FROM sugestoes
        WHERE session_id = ?
        ORDER BY comprador
    """, (session_id,)).fetchall()
    conn.close()
    return [r['comprador'] for r in rows]


def get_latest_session_id():
    conn = get_connection()
    row = conn.execute("SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1").fetchone()
    conn.close()
    return row['id'] if row else None


def get_dashboard_data(date_from=None, date_to=None):
    """Returns dashboard metrics, optionally filtered by session creation date."""
    conn = get_connection()

    # Build date filter
    params = []
    date_filter = ""
    if date_from:
        date_filter += " AND DATE(s.created_at) >= ?"
        params.append(date_from)
    if date_to:
        date_filter += " AND DATE(s.created_at) <= ?"
        params.append(date_to)

    # Overall totals (only sugestoes with sugestao > 0 and incluido = 1)
    totals = conn.execute(f"""
        SELECT
            COUNT(DISTINCT su.codigo_produto) as total_skus,
            COUNT(su.id) as total_sugestoes,
            SUM(su.sugestao) as total_unidades,
            SUM(CASE WHEN a.decisao = 'aprovado' THEN 1 ELSE 0 END) as aprovados,
            SUM(CASE WHEN a.decisao = 'recusado' THEN 1 ELSE 0 END) as recusados,
            SUM(CASE WHEN a.decisao = 'alterado' THEN 1 ELSE 0 END) as alterados,
            SUM(CASE WHEN a.decisao IS NULL THEN 1 ELSE 0 END) as pendentes
        FROM sessions s
        JOIN sugestoes su ON su.session_id = s.id
        LEFT JOIN aprovacoes a ON a.sugestao_id = su.id
        WHERE su.sugestao > 0 AND (su.incluido = 1 OR su.incluido IS NULL)
        {date_filter}
    """, params).fetchone()

    # Per-buyer breakdown
    buyers = conn.execute(f"""
        SELECT
            su.comprador,
            COUNT(su.id) as total,
            SUM(CASE WHEN a.decisao = 'aprovado' THEN 1 ELSE 0 END) as aprovados,
            SUM(CASE WHEN a.decisao = 'recusado' THEN 1 ELSE 0 END) as recusados,
            SUM(CASE WHEN a.decisao = 'alterado' THEN 1 ELSE 0 END) as alterados,
            SUM(CASE WHEN a.decisao IS NULL THEN 1 ELSE 0 END) as pendentes,
            SUM(su.sugestao) as unidades_sugeridas,
            SUM(CASE WHEN a.decisao IN ('aprovado','alterado') THEN COALESCE(a.quantidade_aprovada, su.sugestao) ELSE 0 END) as unidades_aprovadas
        FROM sessions s
        JOIN sugestoes su ON su.session_id = s.id
        LEFT JOIN aprovacoes a ON a.sugestao_id = su.id
        WHERE su.sugestao > 0 AND (su.incluido = 1 OR su.incluido IS NULL)
        {date_filter}
        GROUP BY su.comprador
        ORDER BY total DESC
    """, params).fetchall()

    # Sessions in filter
    sessions_list = conn.execute(f"""
        SELECT id, created_at, filial_origem, filial_destino, periodo_dias,
               data_inicio, data_fim, finalizada, total_produtos, total_unidades
        FROM sessions s
        WHERE 1=1 {date_filter}
        ORDER BY created_at DESC
    """, params).fetchall()

    conn.close()
    return dict(totals), [dict(b) for b in buyers], [dict(s) for s in sessions_list]
