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
            dias_min_origem INTEGER,
            dias_meta_destino INTEGER,
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
            status TEXT
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


def create_session(filial_origem, filial_destino, periodo_dias, dias_min_origem,
                   dias_meta_destino, total_produtos, total_unidades):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO sessions (filial_origem, filial_destino, periodo_dias,
            dias_min_origem, dias_meta_destino, total_produtos, total_unidades)
        VALUES (?,?,?,?,?,?,?)
    """, (filial_origem, filial_destino, periodo_dias, dias_min_origem,
          dias_meta_destino, total_produtos, total_unidades))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id


def insert_sugestoes(session_id, rows):
    conn = get_connection()
    c = conn.cursor()
    c.executemany("""
        INSERT INTO sugestoes (session_id, codigo_produto, descricao_produto,
            comprador, codigo_fornecedor, nome_fornecedor,
            mdv_destino, estoque_destino, em_transito, reservas,
            cobertura_destino_atual, estoque_desejado, necessidade,
            mdv_origem, estoque_origem, estoque_vital, disponivel, sugestao, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, [(session_id, r['codigo_produto'], r['descricao_produto'],
           r['comprador'], r['codigo_fornecedor'], r['nome_fornecedor'],
           r['mdv_destino'], r['estoque_destino'], r['em_transito'], r['reservas'],
           r['cobertura_destino_atual'], r['estoque_desejado'], r['necessidade'],
           r['mdv_origem'], r['estoque_origem'], r['estoque_vital'],
           r['disponivel'], r['sugestao'], r['status']) for r in rows])
    conn.commit()
    conn.close()


def get_sugestoes(session_id):
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, a.decisao, a.quantidade_aprovada, a.updated_at as aprovado_em
        FROM sugestoes s
        LEFT JOIN aprovacoes a ON a.sugestao_id = s.id
        WHERE s.session_id = ?
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
        WHERE s.session_id = ? AND s.comprador = ?
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
        WHERE s.session_id = ?
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


def get_latest_session_id():
    conn = get_connection()
    row = conn.execute("SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1").fetchone()
    conn.close()
    return row['id'] if row else None
