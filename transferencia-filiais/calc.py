import math
import pandas as pd

# Z-score by service level (%)
Z_FACTORS = {90: 1.28, 95: 1.65, 98: 2.05, 99: 2.33}


def normalize_columns(df):
    """Normalize column names: strip whitespace and lowercase."""
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def read_file(file_obj, filename):
    """Read CSV or XLSX file into DataFrame."""
    fname = filename.lower()
    if fname.endswith('.csv'):
        try:
            df = pd.read_csv(file_obj, dtype=str, encoding='utf-8')
        except UnicodeDecodeError:
            file_obj.seek(0)
            df = pd.read_csv(file_obj, dtype=str, encoding='latin-1')
    elif fname.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(file_obj, dtype=str)
    else:
        raise ValueError(f"Formato não suportado: {filename}. Use CSV ou XLSX.")
    return normalize_columns(df)


# Column name aliases (lowercase)
COL_ALIASES = {
    'filial': ['filial', 'branch', 'loja'],
    'data': ['data faturamento', 'data', 'date', 'dt faturamento', 'data_faturamento'],
    'codigo_produto': ['código produto', 'codigo produto', 'cod produto', 'code', 'produto', 'codigo_produto', 'código_produto', 'cod_produto', 'item'],
    'descricao_produto': ['descrição produto', 'descricao produto', 'descrição', 'descricao', 'description', 'produto desc', 'descricao_produto', 'descrição_produto'],
    'nf': ['nf', 'nota fiscal', 'nota', 'invoice'],
    'quantidade_faturada': ['quantidade faturada', 'qtd faturada', 'quantidade', 'qty', 'qtd', 'quantidade_faturada'],
    'quantidade': ['quantidade', 'qtd', 'qty', 'estoque', 'saldo', 'saldo estoque'],
    'codigo_fornecedor': ['código fornecedor', 'codigo fornecedor', 'cod fornecedor', 'codigo_fornecedor', 'código_fornecedor', 'cod_fornecedor'],
    'nome_fornecedor': ['nome fornecedor', 'fornecedor', 'supplier', 'nome_fornecedor'],
    'comprador': ['comprador', 'buyer', 'responsavel', 'responsável'],
    'quantidade_em_transito': ['quantidade em trânsito', 'quantidade em transito', 'qtd em trânsito', 'qtd transito', 'em transito', 'em trânsito', 'transito', 'quantidade_em_transito'],
    'quantidade_reservada': ['quantidade reservada', 'qtd reservada', 'reservas', 'pedidos', 'quantidade_reservada'],
}


def find_col(df, key):
    """Find the actual column name in df for a given key."""
    aliases = COL_ALIASES.get(key, [key])
    for alias in aliases:
        if alias in df.columns:
            return alias
    # fuzzy: check if any column contains the alias
    for alias in aliases:
        for col in df.columns:
            if alias in col or col in alias:
                return col
    return None


def safe_float(val, default=0.0):
    try:
        return float(str(val).replace(',', '.').strip())
    except (ValueError, TypeError):
        return default


def normalize_cod(val):
    """Normalize product codes: strip whitespace, remove .0 suffix from floats read as strings."""
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s


def process_transfer(
    vendas_file, vendas_filename,
    estoque_file, estoque_filename,
    compradores_file, compradores_filename,
    transito_file, transito_filename,
    reservas_file, reservas_filename,
    filial_origem, filial_destino,
    periodo_dias, dias_min_origem, dias_meta_destino,
    nivel_servico=95
):
    errors = []

    # --- Load dataframes ---
    try:
        df_vendas = read_file(vendas_file, vendas_filename)
    except Exception as e:
        raise ValueError(f"Erro ao ler Histórico de Vendas: {e}")

    try:
        df_estoque = read_file(estoque_file, estoque_filename)
    except Exception as e:
        raise ValueError(f"Erro ao ler Estoque Atual: {e}")

    try:
        df_compradores = read_file(compradores_file, compradores_filename)
    except Exception as e:
        raise ValueError(f"Erro ao ler Compradores: {e}")

    df_transito = None
    if transito_file is not None:
        try:
            df_transito = read_file(transito_file, transito_filename)
        except Exception as e:
            errors.append(f"Aviso: Erro ao ler Estoque em Trânsito: {e}. Será ignorado.")

    df_reservas = None
    if reservas_file is not None:
        try:
            df_reservas = read_file(reservas_file, reservas_filename)
        except Exception as e:
            errors.append(f"Aviso: Erro ao ler Reservas/Pedidos: {e}. Será ignorado.")

    # --- Process Vendas ---
    col_filial_v = find_col(df_vendas, 'filial')
    col_data = find_col(df_vendas, 'data')
    col_cod_v = find_col(df_vendas, 'codigo_produto')
    col_qtd_v = find_col(df_vendas, 'quantidade_faturada')

    if not col_filial_v:
        raise ValueError("Coluna 'Filial' não encontrada no Histórico de Vendas.")
    if not col_data:
        raise ValueError("Coluna 'Data Faturamento' não encontrada no Histórico de Vendas.")
    if not col_cod_v:
        raise ValueError("Coluna 'Código Produto' não encontrada no Histórico de Vendas.")
    if not col_qtd_v:
        raise ValueError("Coluna 'Quantidade Faturada' não encontrada no Histórico de Vendas.")

    df_vendas[col_filial_v] = df_vendas[col_filial_v].str.strip().str.upper()
    df_vendas[col_cod_v] = df_vendas[col_cod_v].apply(normalize_cod)
    df_vendas[col_qtd_v] = df_vendas[col_qtd_v].apply(safe_float)
    df_vendas[col_data] = pd.to_datetime(df_vendas[col_data], dayfirst=True, errors='coerce', format='mixed')
    df_vendas = df_vendas.dropna(subset=[col_data])

    # Filter to period
    max_date = df_vendas[col_data].max()
    min_date = max_date - pd.Timedelta(days=periodo_dias - 1)
    df_vendas_periodo = df_vendas[df_vendas[col_data] >= min_date].copy()

    # Full date range for the period (to include zero-sale days in std dev)
    all_dates = pd.date_range(start=min_date, end=max_date, freq='D')
    period_days = periodo_dias

    # Sales by filial+product (total)
    vendas_destino = (
        df_vendas_periodo[df_vendas_periodo[col_filial_v] == filial_destino.upper()]
        .groupby(col_cod_v)[col_qtd_v].sum()
        .to_dict()
    )
    vendas_origem = (
        df_vendas_periodo[df_vendas_periodo[col_filial_v] == filial_origem.upper()]
        .groupby(col_cod_v)[col_qtd_v].sum()
        .to_dict()
    )

    # Daily sales series per product per filial (including zero-sale days)
    # Used to calculate standard deviation
    def _daily_series(filial):
        df_f = df_vendas_periodo[df_vendas_periodo[col_filial_v] == filial.upper()]
        if df_f.empty:
            return {}
        daily = (
            df_f.groupby([col_cod_v, col_data])[col_qtd_v]
            .sum()
            .unstack(level=col_data)
            .reindex(columns=all_dates, fill_value=0.0)
        )
        return daily  # DataFrame: index=produto, columns=datas

    daily_destino = _daily_series(filial_destino)
    daily_origem = _daily_series(filial_origem)

    # --- Process Estoque ---
    col_filial_e = find_col(df_estoque, 'filial')
    col_cod_e = find_col(df_estoque, 'codigo_produto')
    col_qtd_e = find_col(df_estoque, 'quantidade')

    if not col_filial_e:
        raise ValueError("Coluna 'Filial' não encontrada no Estoque Atual.")
    if not col_cod_e:
        raise ValueError("Coluna 'Código Produto' não encontrada no Estoque Atual.")
    if not col_qtd_e:
        raise ValueError("Coluna 'Quantidade' não encontrada no Estoque Atual.")

    df_estoque[col_filial_e] = df_estoque[col_filial_e].str.strip().str.upper()
    df_estoque[col_cod_e] = df_estoque[col_cod_e].apply(normalize_cod)
    df_estoque[col_qtd_e] = df_estoque[col_qtd_e].apply(safe_float)

    estoque_destino = (
        df_estoque[df_estoque[col_filial_e] == filial_destino.upper()]
        .groupby(col_cod_e)[col_qtd_e].sum()
        .to_dict()
    )
    estoque_origem = (
        df_estoque[df_estoque[col_filial_e] == filial_origem.upper()]
        .groupby(col_cod_e)[col_qtd_e].sum()
        .to_dict()
    )

    # --- Process Compradores ---
    col_cod_c = find_col(df_compradores, 'codigo_produto')
    col_desc_c = find_col(df_compradores, 'descricao_produto')
    col_cod_forn = find_col(df_compradores, 'codigo_fornecedor')
    col_nome_forn = find_col(df_compradores, 'nome_fornecedor')
    col_comprador = find_col(df_compradores, 'comprador')

    if not col_cod_c:
        raise ValueError("Coluna 'Código Produto' não encontrada em Compradores.")
    if not col_comprador:
        raise ValueError("Coluna 'Comprador' não encontrada em Compradores.")

    df_compradores[col_cod_c] = df_compradores[col_cod_c].apply(normalize_cod)
    compradores_map = {}
    for _, row in df_compradores.iterrows():
        cod = str(row[col_cod_c]).strip()
        compradores_map[cod] = {
            'comprador': str(row[col_comprador]).strip() if col_comprador else 'Sem Comprador',
            'codigo_fornecedor': str(row[col_cod_forn]).strip() if col_cod_forn else '',
            'nome_fornecedor': str(row[col_nome_forn]).strip() if col_nome_forn else '',
            'descricao_produto': str(row[col_desc_c]).strip() if col_desc_c else cod,
        }

    # --- Process Trânsito ---
    transito_map = {}
    if df_transito is not None:
        col_cod_t = find_col(df_transito, 'codigo_produto')
        col_qtd_t = find_col(df_transito, 'quantidade_em_transito')
        if col_cod_t and col_qtd_t:
            df_transito[col_cod_t] = df_transito[col_cod_t].apply(normalize_cod)
            df_transito[col_qtd_t] = df_transito[col_qtd_t].apply(safe_float)
            transito_map = df_transito.groupby(col_cod_t)[col_qtd_t].sum().to_dict()

    # --- Process Reservas ---
    reservas_map = {}
    if df_reservas is not None:
        col_cod_r = find_col(df_reservas, 'codigo_produto')
        col_qtd_r = find_col(df_reservas, 'quantidade_reservada')
        if col_cod_r and col_qtd_r:
            df_reservas[col_cod_r] = df_reservas[col_cod_r].apply(normalize_cod)
            df_reservas[col_qtd_r] = df_reservas[col_qtd_r].apply(safe_float)
            reservas_map = df_reservas.groupby(col_cod_r)[col_qtd_r].sum().to_dict()

    # --- Diagnóstico de filiais ---
    filiais_vendas = df_vendas_periodo[col_filial_v].unique().tolist()
    filiais_estoque = df_estoque[col_filial_e].unique().tolist()

    if filial_destino.upper() not in filiais_vendas:
        errors.append(
            f"⚠ Filial Destino '{filial_destino}' não encontrada no Histórico de Vendas. "
            f"Filiais disponíveis: {', '.join(sorted(filiais_vendas))}"
        )
    if filial_origem.upper() not in filiais_vendas:
        errors.append(
            f"⚠ Filial Origem '{filial_origem}' não encontrada no Histórico de Vendas. "
            f"Filiais disponíveis: {', '.join(sorted(filiais_vendas))}"
        )
    if filial_destino.upper() not in filiais_estoque:
        errors.append(
            f"⚠ Filial Destino '{filial_destino}' não encontrada no Estoque Atual. "
            f"Filiais disponíveis: {', '.join(sorted(filiais_estoque))}"
        )
    if filial_origem.upper() not in filiais_estoque:
        errors.append(
            f"⚠ Filial Origem '{filial_origem}' não encontrada no Estoque Atual. "
            f"Filiais disponíveis: {', '.join(sorted(filiais_estoque))}"
        )

    # --- Build product universe ---
    # All products that exist in origem estoque or compradores
    all_products = set(estoque_origem.keys()) | set(compradores_map.keys())
    # Also include products with sales at destination
    all_products |= set(vendas_destino.keys())

    results = []
    for cod in sorted(all_products):
        # Get descriptions
        info = compradores_map.get(cod, {})
        # Try to get description from vendas if not in compradores
        if not info:
            # Look up description from estoque df
            desc_rows = df_estoque[df_estoque[col_cod_e] == cod]
            if not desc_rows.empty and find_col(df_estoque, 'descricao_produto'):
                col_desc_e = find_col(df_estoque, 'descricao_produto')
                desc = str(desc_rows.iloc[0][col_desc_e]).strip() if col_desc_e else cod
            else:
                desc = cod
            comprador = 'Sem Comprador'
            cod_forn = ''
            nome_forn = ''
        else:
            desc = info.get('descricao_produto', cod)
            comprador = info.get('comprador', 'Sem Comprador')
            cod_forn = info.get('codigo_fornecedor', '')
            nome_forn = info.get('nome_fornecedor', '')

        # MDV
        mdv_destino = vendas_destino.get(cod, 0.0) / period_days
        mdv_origem = vendas_origem.get(cod, 0.0) / period_days

        # Standard deviation of daily sales (includes zero-sale days)
        z = Z_FACTORS.get(int(nivel_servico), 1.65)

        if not isinstance(daily_destino, dict) and cod in daily_destino.index:
            sigma_destino = float(daily_destino.loc[cod].std(ddof=1))
        else:
            sigma_destino = 0.0
        sigma_destino = sigma_destino if not math.isnan(sigma_destino) else 0.0

        cv_destino = round(sigma_destino / mdv_destino, 3) if mdv_destino > 0 else 0.0

        # Safety stock: Z × σ × √(dias_meta)
        estoque_seguranca = z * sigma_destino * math.sqrt(dias_meta_destino)

        # Stocks
        est_destino = estoque_destino.get(cod, 0.0)
        est_origem = estoque_origem.get(cod, 0.0)
        em_transito = transito_map.get(cod, 0.0)
        reservas = reservas_map.get(cod, 0.0)

        # Cobertura atual
        cobertura_destino = est_destino / mdv_destino if mdv_destino > 0 else 999.0
        cobertura_origem = est_origem / mdv_origem if mdv_origem > 0 else 999.0

        # Needs
        estoque_desejado = mdv_destino * dias_meta_destino + estoque_seguranca
        estoque_vital = mdv_origem * dias_min_origem

        necessidade = max(0.0, estoque_desejado - est_destino - em_transito - reservas)
        disponivel = max(0.0, est_origem - estoque_vital)
        sugestao = math.ceil(min(disponivel, necessidade)) if necessidade > 0 else 0

        # Status
        if necessidade == 0:
            status = 'Sem Necessidade'
        elif sugestao == 0:
            status = 'Origem Insuficiente'
        elif sugestao >= necessidade:
            status = 'Transferência Completa'
        else:
            status = 'Transferência Parcial'

        # Include in results if: has comprador AND (necessidade > 0 OR origem insuficiente)
        if comprador == 'Sem Comprador':
            continue
        if necessidade == 0 and status != 'Origem Insuficiente':
            continue

        results.append({
            'codigo_produto': cod,
            'descricao_produto': desc,
            'comprador': comprador,
            'codigo_fornecedor': cod_forn,
            'nome_fornecedor': nome_forn,
            'mdv_destino': round(mdv_destino, 4),
            'sigma_destino': round(sigma_destino, 4),
            'cv_destino': cv_destino,
            'estoque_seguranca': round(estoque_seguranca, 2),
            'estoque_destino': est_destino,
            'em_transito': em_transito,
            'reservas': reservas,
            'cobertura_destino_atual': round(cobertura_destino, 1),
            'estoque_desejado': round(estoque_desejado, 2),
            'necessidade': round(necessidade, 2),
            'mdv_origem': round(mdv_origem, 4),
            'estoque_origem': est_origem,
            'estoque_vital': round(estoque_vital, 2),
            'disponivel': round(disponivel, 2),
            'sugestao': sugestao,
            'status': status,
            'cobertura_origem_atual': round(cobertura_origem, 1),
        })

    if not results:
        sem_comprador = sum(1 for cod in all_products if compradores_map.get(cod, {}).get('comprador', 'Sem Comprador') == 'Sem Comprador')
        errors.append(
            f"⚠ Nenhuma sugestão gerada. "
            f"Produtos no universo: {len(all_products)} | "
            f"Sem comprador: {sem_comprador} | "
            f"Verifique se os nomes das filiais e os códigos de produto conferem entre os arquivos."
        )

    return results, errors
