-- Mostruário Paragominas — modelo de dados (PostgreSQL 16)
--
-- Controle das amostras da requisição até a devolução. O estoque do depósito
-- fica no ERP; aqui só existe o ciclo da amostra.
--
-- Fonte de verdade: tabela `movimentacoes` (imutável). Saldos e status de item
-- são derivados na view `vw_posicao_item`.

BEGIN;

-- Busca sem diferenciar acentos ("vinil" encontra "Vinílico").
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

CREATE TYPE perfil_usuario AS ENUM (
    'requisitante', 'aprovador_comercial', 'aprovador_logistica',
    'deposito', 'gestor', 'admin'
);

CREATE TYPE status_solicitacao AS ENUM (
    'rascunho', 'aguardando_aprovacao_comercial', 'aguardando_aprovacao_logistica',
    'aguardando_expedicao', 'em_exposicao', 'devolucao_parcial',
    'encerrada', 'reprovada', 'cancelada'
);

CREATE TYPE etapa_aprovacao AS ENUM ('comercial', 'logistica');
CREATE TYPE decisao_aprovacao AS ENUM ('aprovada', 'reprovada');

CREATE TYPE tipo_motivo AS ENUM ('descarte', 'perda', 'reprovacao', 'cancelamento', 'estorno');

CREATE TYPE tipo_movimentacao AS ENUM (
    'expedicao',           -- saída para a loja
    'devolucao_estoque',   -- voltou e vai para o estoque (lançado no ERP)
    'devolucao_descarte',  -- voltou sem condição de uso
    'perda',               -- não voltou
    'estorno'              -- anula uma movimentação anterior
);

-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------

CREATE TABLE filiais (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo      text NOT NULL UNIQUE,
    nome        text NOT NULL,
    cnpj        text,
    ativo       boolean NOT NULL DEFAULT true,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        text NOT NULL,
    matricula   text UNIQUE,
    email       text NOT NULL UNIQUE,
    senha_hash  text NOT NULL,
    -- Filial de lotação; nulo para usuários corporativos (ex.: administrador).
    filial_id   bigint REFERENCES filiais(id),
    -- Obriga a troca da senha no próximo login (senha criada pelo administrador).
    trocar_senha boolean NOT NULL DEFAULT true,
    ativo       boolean NOT NULL DEFAULT true,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Um usuário pode ter mais de um perfil.
CREATE TABLE usuario_perfis (
    usuario_id  bigint NOT NULL REFERENCES usuarios(id),
    perfil      perfil_usuario NOT NULL,
    PRIMARY KEY (usuario_id, perfil)
);

-- Abrangência: filiais em que o usuário pode ver/agir além da própria.
CREATE TABLE usuario_filiais (
    usuario_id  bigint NOT NULL REFERENCES usuarios(id),
    filial_id   bigint NOT NULL REFERENCES filiais(id),
    PRIMARY KEY (usuario_id, filial_id)
);

CREATE TABLE fornecedores (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo        text NOT NULL UNIQUE,
    razao_social  text NOT NULL,
    cnpj          text,
    contato       text,
    ativo         boolean NOT NULL DEFAULT true
);

CREATE TABLE produtos (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku               text NOT NULL UNIQUE,
    descricao         text NOT NULL,
    marca             text,
    linha             text,
    formato           text,
    unidade           text NOT NULL DEFAULT 'PC',
    fornecedor_id     bigint REFERENCES fornecedores(id),
    custo_referencia  numeric(14,4) NOT NULL DEFAULT 0 CHECK (custo_referencia >= 0),
    ativo             boolean NOT NULL DEFAULT true
);

CREATE TABLE motivos (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo               tipo_motivo NOT NULL,
    descricao          text NOT NULL,
    exige_observacao   boolean NOT NULL DEFAULT false,
    ativo              boolean NOT NULL DEFAULT true,
    UNIQUE (tipo, descricao)
);

-- ---------------------------------------------------------------------------
-- Requisições
-- ---------------------------------------------------------------------------

CREATE SEQUENCE protocolo_seq;

CREATE TABLE solicitacoes (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    protocolo       text NOT NULL UNIQUE
                    DEFAULT to_char(now(), 'YYYY') || '-' || lpad(nextval('protocolo_seq')::text, 6, '0'),
    filial_id       bigint NOT NULL REFERENCES filiais(id),
    requisitante_id bigint NOT NULL REFERENCES usuarios(id),
    finalidade      text,
    justificativa   text,
    prioridade      smallint NOT NULL DEFAULT 2 CHECK (prioridade BETWEEN 1 AND 3),
    status          status_solicitacao NOT NULL DEFAULT 'rascunho',
    motivo_id       bigint REFERENCES motivos(id),  -- cancelamento
    observacao      text,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    enviado_em      timestamptz,
    encerrado_em    timestamptz
);

CREATE INDEX ON solicitacoes (filial_id, status);
CREATE INDEX ON solicitacoes (requisitante_id);

CREATE TABLE itens_solicitacao (
    id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitacao_id        bigint NOT NULL REFERENCES solicitacoes(id),
    produto_id            bigint NOT NULL REFERENCES produtos(id),
    quantidade_solicitada numeric(12,3) NOT NULL CHECK (quantidade_solicitada > 0),
    -- A logística pode aprovar menos que o solicitado; nulo = igual ao solicitado.
    quantidade_aprovada   numeric(12,3) CHECK (quantidade_aprovada >= 0),
    custo_referencia      numeric(14,4) NOT NULL CHECK (custo_referencia >= 0),
    observacao            text,
    UNIQUE (solicitacao_id, produto_id),
    CHECK (quantidade_aprovada IS NULL OR quantidade_aprovada <= quantidade_solicitada)
);

CREATE TABLE aprovacoes (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitacao_id  bigint NOT NULL REFERENCES solicitacoes(id),
    etapa           etapa_aprovacao NOT NULL,
    decisao         decisao_aprovacao NOT NULL,
    aprovador_id    bigint NOT NULL REFERENCES usuarios(id),
    motivo_id       bigint REFERENCES motivos(id),
    observacao      text,
    decidido_em     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (solicitacao_id, etapa),
    CHECK (decisao = 'aprovada' OR motivo_id IS NOT NULL OR observacao IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- Movimentações (livro imutável)
-- ---------------------------------------------------------------------------

CREATE TABLE movimentacoes (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id             bigint NOT NULL REFERENCES itens_solicitacao(id),
    tipo                tipo_movimentacao NOT NULL,
    quantidade          numeric(12,3) NOT NULL CHECK (quantidade > 0),
    -- Preenchido pelo trigger: expedição usa o custo do produto (se não
    -- informado); devolução/perda usam o custo médio expedido do item.
    custo_unitario      numeric(14,4) NOT NULL CHECK (custo_unitario >= 0),
    motivo_id           bigint REFERENCES motivos(id),
    observacao          text,
    estorno_de_id       bigint UNIQUE REFERENCES movimentacoes(id),
    usuario_id          bigint NOT NULL REFERENCES usuarios(id),
    ocorrido_em         timestamptz NOT NULL DEFAULT now(),
    registrado_em       timestamptz NOT NULL DEFAULT now(),
    chave_idempotencia  text NOT NULL UNIQUE,
    CHECK ((tipo = 'estorno') = (estorno_de_id IS NOT NULL))
);

CREATE INDEX ON movimentacoes (item_id);
CREATE INDEX ON movimentacoes (tipo, ocorrido_em);

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

CREATE TABLE auditoria (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id    bigint REFERENCES usuarios(id),
    entidade      text NOT NULL,
    entidade_id   bigint NOT NULL,
    acao          text NOT NULL,
    dados_antes   jsonb,
    dados_depois  jsonb,
    motivo        text,
    ocorrido_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON auditoria (entidade, entidade_id);

-- ---------------------------------------------------------------------------
-- Posição por item (derivada das movimentações não estornadas)
-- ---------------------------------------------------------------------------

CREATE VIEW vw_posicao_item AS
WITH validas AS (
    SELECT m.*
    FROM movimentacoes m
    WHERE m.tipo <> 'estorno'
      AND NOT EXISTS (SELECT 1 FROM movimentacoes e WHERE e.estorno_de_id = m.id)
),
totais AS (
    SELECT
        i.id AS item_id,
        COALESCE(sum(v.quantidade) FILTER (WHERE v.tipo = 'expedicao'), 0)          AS qtd_expedida,
        COALESCE(sum(v.quantidade) FILTER (WHERE v.tipo = 'devolucao_estoque'), 0)  AS qtd_estoque,
        COALESCE(sum(v.quantidade) FILTER (WHERE v.tipo = 'devolucao_descarte'), 0) AS qtd_descarte,
        COALESCE(sum(v.quantidade) FILTER (WHERE v.tipo = 'perda'), 0)              AS qtd_perda,
        COALESCE(sum(v.quantidade * v.custo_unitario) FILTER (WHERE v.tipo = 'expedicao'), 0)          AS valor_expedido,
        round(COALESCE(sum(v.quantidade * v.custo_unitario) FILTER (WHERE v.tipo = 'devolucao_descarte'), 0), 2) AS valor_descarte,
        round(COALESCE(sum(v.quantidade * v.custo_unitario) FILTER (WHERE v.tipo = 'perda'), 0), 2)              AS valor_perda,
        min(v.ocorrido_em) FILTER (WHERE v.tipo = 'expedicao') AS primeira_expedicao_em,
        max(v.ocorrido_em) FILTER (WHERE v.tipo <> 'expedicao') AS ultimo_retorno_em
    FROM itens_solicitacao i
    LEFT JOIN validas v ON v.item_id = i.id
    GROUP BY i.id
)
SELECT
    i.id AS item_id,
    s.id AS solicitacao_id,
    s.protocolo,
    s.filial_id,
    s.requisitante_id,
    i.produto_id,
    p.fornecedor_id,
    COALESCE(i.quantidade_aprovada, i.quantidade_solicitada) AS qtd_aprovada,
    t.qtd_expedida,
    t.qtd_estoque,
    t.qtd_descarte,
    t.qtd_perda,
    t.qtd_expedida - t.qtd_estoque - t.qtd_descarte - t.qtd_perda AS qtd_em_loja,
    COALESCE(i.quantidade_aprovada, i.quantidade_solicitada) - t.qtd_expedida AS qtd_pendente_expedicao,
    -- valor em loja pelo custo médio das expedições do item
    CASE WHEN t.qtd_expedida > 0
         THEN round((t.qtd_expedida - t.qtd_estoque - t.qtd_descarte - t.qtd_perda)
                    * t.valor_expedido / t.qtd_expedida, 2)
         ELSE 0 END AS valor_em_loja,
    t.valor_descarte,
    t.valor_perda,
    t.primeira_expedicao_em,
    CASE WHEN t.qtd_expedida > 0
         THEN (CASE WHEN t.qtd_expedida - t.qtd_estoque - t.qtd_descarte - t.qtd_perda > 0
                    THEN current_date ELSE t.ultimo_retorno_em::date END)
              - t.primeira_expedicao_em::date
    END AS dias_em_exposicao,
    CASE
        WHEN COALESCE(i.quantidade_aprovada, i.quantidade_solicitada) = 0 THEN 'sem_atendimento'
        WHEN t.qtd_expedida = 0 THEN 'aguardando_expedicao'
        WHEN t.qtd_expedida = t.qtd_estoque + t.qtd_descarte + t.qtd_perda
             AND t.qtd_expedida >= COALESCE(i.quantidade_aprovada, i.quantidade_solicitada)
             THEN 'encerrado'
        WHEN t.qtd_expedida < COALESCE(i.quantidade_aprovada, i.quantidade_solicitada)
             THEN 'expedido_parcialmente'
        WHEN t.qtd_estoque + t.qtd_descarte + t.qtd_perda > 0 THEN 'devolucao_parcial'
        ELSE 'em_exposicao'
    END AS status_item
FROM itens_solicitacao i
JOIN solicitacoes s ON s.id = i.solicitacao_id
JOIN produtos p     ON p.id = i.produto_id
JOIN totais t       ON t.item_id = i.id;

-- ---------------------------------------------------------------------------
-- Integridade das movimentações (validada também no backend)
-- ---------------------------------------------------------------------------

CREATE FUNCTION fn_validar_movimentacao() RETURNS trigger AS $$
DECLARE
    v_status      status_solicitacao;
    v_aprovada    numeric;
    v_pos         vw_posicao_item%ROWTYPE;
    v_orig        movimentacoes%ROWTYPE;
    v_motivo_tipo tipo_motivo;
    v_motivo_obs  boolean;
BEGIN
    -- Serializa operações concorrentes no mesmo item.
    PERFORM 1 FROM itens_solicitacao WHERE id = NEW.item_id FOR UPDATE;

    SELECT s.status INTO v_status
    FROM itens_solicitacao i JOIN solicitacoes s ON s.id = i.solicitacao_id
    WHERE i.id = NEW.item_id;

    SELECT * INTO v_pos FROM vw_posicao_item WHERE item_id = NEW.item_id;

    IF NEW.motivo_id IS NOT NULL THEN
        SELECT tipo, exige_observacao INTO v_motivo_tipo, v_motivo_obs
        FROM motivos WHERE id = NEW.motivo_id;
        IF v_motivo_obs AND coalesce(trim(NEW.observacao), '') = '' THEN
            RAISE EXCEPTION 'Motivo exige observação';
        END IF;
    END IF;

    IF NEW.tipo = 'expedicao' THEN
        IF v_status NOT IN ('aguardando_expedicao', 'em_exposicao', 'devolucao_parcial') THEN
            RAISE EXCEPTION 'Requisição % não está liberada para expedição', v_status;
        END IF;
        IF NEW.custo_unitario IS NULL THEN
            SELECT p.custo_referencia INTO NEW.custo_unitario
            FROM itens_solicitacao i JOIN produtos p ON p.id = i.produto_id
            WHERE i.id = NEW.item_id;
        END IF;
        IF NEW.quantidade > v_pos.qtd_pendente_expedicao THEN
            RAISE EXCEPTION 'Expedição (%) maior que o saldo aprovado pendente (%)',
                NEW.quantidade, v_pos.qtd_pendente_expedicao;
        END IF;

    ELSIF NEW.tipo IN ('devolucao_estoque', 'devolucao_descarte', 'perda') THEN
        IF NEW.quantidade > v_pos.qtd_em_loja THEN
            RAISE EXCEPTION 'Quantidade (%) maior que o saldo em loja (%)',
                NEW.quantidade, v_pos.qtd_em_loja;
        END IF;
        NEW.custo_unitario := round(v_pos.valor_em_loja / v_pos.qtd_em_loja, 4);
        IF NEW.tipo = 'devolucao_descarte' AND v_motivo_tipo IS DISTINCT FROM 'descarte' THEN
            RAISE EXCEPTION 'Descarte exige motivo do tipo descarte';
        END IF;
        IF NEW.tipo = 'perda' AND v_motivo_tipo IS DISTINCT FROM 'perda' THEN
            RAISE EXCEPTION 'Perda exige motivo do tipo perda';
        END IF;

    ELSIF NEW.tipo = 'estorno' THEN
        SELECT * INTO v_orig FROM movimentacoes WHERE id = NEW.estorno_de_id;
        IF v_orig.tipo = 'estorno' THEN
            RAISE EXCEPTION 'Não é possível estornar um estorno';
        END IF;
        NEW.custo_unitario := v_orig.custo_unitario;
        IF v_orig.item_id <> NEW.item_id OR v_orig.quantidade <> NEW.quantidade THEN
            RAISE EXCEPTION 'Estorno deve ter o mesmo item e quantidade da movimentação original';
        END IF;
        IF v_orig.tipo = 'expedicao' AND v_orig.quantidade > v_pos.qtd_em_loja THEN
            RAISE EXCEPTION 'Estorne antes as devoluções/perdas desta expedição';
        END IF;
        IF v_motivo_tipo IS DISTINCT FROM 'estorno' THEN
            RAISE EXCEPTION 'Estorno exige motivo do tipo estorno';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_movimentacao
    BEFORE INSERT ON movimentacoes
    FOR EACH ROW EXECUTE FUNCTION fn_validar_movimentacao();

CREATE FUNCTION fn_bloquear_alteracao() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Movimentações não podem ser alteradas nem apagadas; use estorno';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimentacao_imutavel
    BEFORE UPDATE OR DELETE ON movimentacoes
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_alteracao();

-- ---------------------------------------------------------------------------
-- Motivos iniciais
-- ---------------------------------------------------------------------------

INSERT INTO motivos (tipo, descricao, exige_observacao) VALUES
    ('descarte', 'Quebrada / trincada', false),
    ('descarte', 'Riscada / manchada', false),
    ('descarte', 'Lascada nas bordas', false),
    ('descarte', 'Embalagem danificada', false),
    ('descarte', 'Produto fora de linha', false),
    ('descarte', 'Outro', true),
    ('perda', 'Extraviada na loja', false),
    ('perda', 'Danificada na loja sem retorno', false),
    ('perda', 'Extraviada no transporte', false),
    ('perda', 'Outro', true),
    ('reprovacao', 'Sem necessidade comercial', false),
    ('reprovacao', 'Produto sem disponibilidade', false),
    ('reprovacao', 'Quantidade excessiva', false),
    ('reprovacao', 'Outro', true),
    ('cancelamento', 'Desistência da loja', false),
    ('cancelamento', 'Requisição criada por engano', false),
    ('cancelamento', 'Outro', true),
    ('estorno', 'Lançamento em duplicidade', false),
    ('estorno', 'Quantidade informada errada', false),
    ('estorno', 'Outro', true);

COMMIT;
