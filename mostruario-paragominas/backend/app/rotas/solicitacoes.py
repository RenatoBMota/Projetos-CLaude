"""Fluxo principal: requisição → aprovação comercial → aprovação logística →
expedição → devolução (estoque, descarte ou perda).

As quantidades nunca são gravadas como saldo: toda saída e retorno vira uma
linha em `movimentacoes`, e a posição é lida de `vw_posicao_item`. O banco
valida as quantidades por trigger; aqui ficam as regras de permissão e de
fluxo.
"""
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection
from pydantic import BaseModel, Field

from ..db import auditar, get_conn
from ..seguranca import filiais_permitidas, pode_ver_filial, tem_perfil, usuario_atual

router = APIRouter(prefix="/api", tags=["solicitacoes"])

STATUS_APROVACAO = {"aguardando_aprovacao_comercial": "comercial",
                    "aguardando_aprovacao_logistica": "logistica"}
STATUS_ATENDIMENTO = ("aguardando_expedicao", "em_exposicao", "devolucao_parcial")
DESTINOS = {"estoque": "devolucao_estoque", "descarte": "devolucao_descarte", "perda": "perda"}


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------

class ItemIn(BaseModel):
    produto_id: int
    quantidade: Decimal = Field(gt=0)
    observacao: str | None = None


class SolicitacaoIn(BaseModel):
    filial_id: int
    finalidade: str | None = None
    justificativa: str | None = None
    prioridade: int = Field(default=2, ge=1, le=3)
    itens: list[ItemIn] = Field(min_length=1)
    enviar: bool = False


class DecisaoIn(BaseModel):
    decisao: Literal["aprovada", "reprovada"]
    motivo_id: int | None = None
    observacao: str | None = None
    # item_id -> quantidade aprovada (só para reduzir; ausente = mantém)
    quantidades: dict[int, Decimal] = {}


class CancelarIn(BaseModel):
    motivo_id: int | None = None
    observacao: str | None = None


class ExpedicaoItem(BaseModel):
    item_id: int
    quantidade: Decimal = Field(gt=0)


class ExpedicaoIn(BaseModel):
    chave: str = Field(min_length=8)
    itens: list[ExpedicaoItem] = Field(min_length=1)
    observacao: str | None = None


class DevolucaoLinha(BaseModel):
    item_id: int
    destino: Literal["estoque", "descarte", "perda"]
    quantidade: Decimal = Field(gt=0)
    motivo_id: int | None = None
    observacao: str | None = None


class DevolucaoIn(BaseModel):
    chave: str = Field(min_length=8)
    lancamentos: list[DevolucaoLinha] = Field(min_length=1)


class CancelarPendenteIn(BaseModel):
    observacao: str = Field(min_length=3)


class EstornoIn(BaseModel):
    motivo_id: int
    observacao: str | None = None


# ---------------------------------------------------------------------------
# Apoio
# ---------------------------------------------------------------------------

def _carregar(conn: Connection, usuario: dict, sid: int, bloquear: bool = False) -> dict:
    s = conn.execute(
        "SELECT * FROM solicitacoes WHERE id = %s" + (" FOR UPDATE" if bloquear else ""), (sid,)
    ).fetchone()
    if s is None or not pode_ver_filial(usuario, s["filial_id"]):
        raise HTTPException(404, "Requisição não encontrada")
    return s


def _posicao(conn: Connection, sid: int) -> list[dict]:
    return conn.execute(
        """SELECT v.*, i.quantidade_solicitada, i.quantidade_aprovada, i.custo_referencia, i.observacao,
                  p.sku, p.descricao, p.unidade, f.razao_social AS fornecedor_nome
           FROM vw_posicao_item v
           JOIN itens_solicitacao i ON i.id = v.item_id
           JOIN produtos p ON p.id = v.produto_id
           LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
           WHERE v.solicitacao_id = %s ORDER BY i.id""",
        (sid,),
    ).fetchall()


def _status(conn: Connection, sid: int, usuario: dict) -> None:
    """Recalcula o status da requisição a partir da posição dos itens."""
    s = conn.execute("SELECT status FROM solicitacoes WHERE id = %s", (sid,)).fetchone()
    if s["status"] not in STATUS_ATENDIMENTO + ("encerrada",):
        return
    itens = _posicao(conn, sid)
    expedida = sum(i["qtd_expedida"] for i in itens)
    retornada = sum(i["qtd_estoque"] + i["qtd_descarte"] + i["qtd_perda"] for i in itens)
    if all(i["status_item"] in ("encerrado", "sem_atendimento") for i in itens):
        novo = "encerrada"
    elif expedida == 0:
        novo = "aguardando_expedicao"
    elif retornada > 0:
        novo = "devolucao_parcial"
    else:
        novo = "em_exposicao"
    if novo != s["status"]:
        conn.execute(
            "UPDATE solicitacoes SET status = %s, encerrado_em = CASE WHEN %s = 'encerrada' THEN now() END WHERE id = %s",
            (novo, novo, sid),
        )
        auditar(conn, usuario["id"], "solicitacoes", sid, "status", {"status": s["status"]}, {"status": novo})


def _motivo(conn: Connection, motivo_id: int | None, tipo: str, observacao: str | None, obrigatorio: bool) -> None:
    if motivo_id is None:
        if obrigatorio:
            raise HTTPException(400, "Informe o motivo")
        return
    m = conn.execute("SELECT tipo, exige_observacao, ativo FROM motivos WHERE id = %s", (motivo_id,)).fetchone()
    if m is None or m["tipo"] != tipo or not m["ativo"]:
        raise HTTPException(400, "Motivo inválido para esta operação")
    if m["exige_observacao"] and not (observacao or "").strip():
        raise HTTPException(400, "Este motivo exige observação")


def _acoes(s: dict, itens: list[dict], usuario: dict) -> list[str]:
    acoes = []
    dono = s["requisitante_id"] == usuario["id"]
    gestor = tem_perfil(usuario, "gestor", "admin")
    expedida = sum(i["qtd_expedida"] for i in itens)
    if s["status"] == "rascunho" and dono:
        acoes += ["editar", "enviar"]
    if (s["status"] == "rascunho" and dono) or (
            s["status"] in ("aguardando_aprovacao_comercial", "aguardando_aprovacao_logistica", "aguardando_expedicao")
            and expedida == 0 and (dono or gestor)):
        acoes.append("cancelar")
    etapa = STATUS_APROVACAO.get(s["status"])
    if etapa and not dono and tem_perfil(usuario, f"aprovador_{etapa}"):
        acoes.append("aprovar")
    if s["status"] in STATUS_ATENDIMENTO and tem_perfil(usuario, "deposito"):
        if any(i["qtd_pendente_expedicao"] > 0 for i in itens):
            acoes += ["expedir", "cancelar_pendente"]
        if any(i["qtd_em_loja"] > 0 for i in itens):
            acoes.append("devolver")
    if gestor and expedida > 0:
        acoes.append("estornar")
    return acoes


def _detalhe(conn: Connection, usuario: dict, sid: int) -> dict:
    s = conn.execute(
        """SELECT s.*, f.nome AS filial_nome, f.codigo AS filial_codigo, u.nome AS requisitante_nome,
                  m.descricao AS motivo_descricao
           FROM solicitacoes s JOIN filiais f ON f.id = s.filial_id JOIN usuarios u ON u.id = s.requisitante_id
           LEFT JOIN motivos m ON m.id = s.motivo_id
           WHERE s.id = %s""",
        (sid,),
    ).fetchone()
    itens = _posicao(conn, sid)
    s["itens"] = itens
    s["aprovacoes"] = conn.execute(
        """SELECT a.*, u.nome AS aprovador_nome, m.descricao AS motivo_descricao
           FROM aprovacoes a JOIN usuarios u ON u.id = a.aprovador_id LEFT JOIN motivos m ON m.id = a.motivo_id
           WHERE a.solicitacao_id = %s ORDER BY a.decidido_em""",
        (sid,),
    ).fetchall()
    s["movimentacoes"] = conn.execute(
        """SELECT mv.id, mv.item_id, mv.tipo, mv.quantidade, mv.custo_unitario, mv.observacao, mv.ocorrido_em,
                  mv.estorno_de_id, u.nome AS usuario_nome, m.descricao AS motivo_descricao, p.sku,
                  EXISTS (SELECT 1 FROM movimentacoes e WHERE e.estorno_de_id = mv.id) AS estornada
           FROM movimentacoes mv
           JOIN itens_solicitacao i ON i.id = mv.item_id JOIN produtos p ON p.id = i.produto_id
           JOIN usuarios u ON u.id = mv.usuario_id LEFT JOIN motivos m ON m.id = mv.motivo_id
           WHERE i.solicitacao_id = %s ORDER BY mv.id""",
        (sid,),
    ).fetchall()
    s["historico"] = conn.execute(
        """SELECT a.acao, a.dados_depois, a.ocorrido_em, u.nome AS usuario_nome
           FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
           WHERE a.entidade = 'solicitacoes' AND a.entidade_id = %s ORDER BY a.id""",
        (sid,),
    ).fetchall()
    s["acoes"] = _acoes(s, itens, usuario)
    s["valor_solicitado"] = sum(i["quantidade_solicitada"] * i["custo_referencia"] for i in itens)
    s["valor_em_loja"] = sum(i["valor_em_loja"] for i in itens)
    return s


def _gravar_itens(conn: Connection, sid: int, itens: list[ItemIn]) -> None:
    ids = [i.produto_id for i in itens]
    if len(set(ids)) != len(ids):
        raise HTTPException(400, "O mesmo produto aparece mais de uma vez")
    produtos = {p["id"]: p for p in conn.execute(
        "SELECT id, custo_referencia, ativo FROM produtos WHERE id = ANY(%s)", (ids,))}
    conn.execute("DELETE FROM itens_solicitacao WHERE solicitacao_id = %s", (sid,))
    for item in itens:
        p = produtos.get(item.produto_id)
        if p is None or not p["ativo"]:
            raise HTTPException(400, f"Produto {item.produto_id} inexistente ou inativo")
        conn.execute(
            """INSERT INTO itens_solicitacao (solicitacao_id, produto_id, quantidade_solicitada, custo_referencia, observacao)
               VALUES (%s, %s, %s, %s, %s)""",
            (sid, item.produto_id, item.quantidade, p["custo_referencia"], item.observacao),
        )


def _validar_filial(conn: Connection, usuario: dict, filial_id: int) -> None:
    f = conn.execute("SELECT ativo FROM filiais WHERE id = %s", (filial_id,)).fetchone()
    if f is None or not f["ativo"] or not pode_ver_filial(usuario, filial_id):
        raise HTTPException(400, "Filial inválida ou fora da sua abrangência")


def _exigir(acao: str, s: dict, conn: Connection, usuario: dict) -> list[dict]:
    itens = _posicao(conn, s["id"])
    if acao not in _acoes(s, itens, usuario):
        raise HTTPException(403, "Ação não permitida nesta etapa ou para o seu perfil")
    return itens


# ---------------------------------------------------------------------------
# Consulta
# ---------------------------------------------------------------------------

FILAS = {
    "comercial": "s.status = 'aguardando_aprovacao_comercial' AND s.requisitante_id <> %(eu)s",
    "logistica": "s.status = 'aguardando_aprovacao_logistica' AND s.requisitante_id <> %(eu)s",
    "expedicao": """s.status IN ('aguardando_expedicao', 'em_exposicao', 'devolucao_parcial') AND EXISTS
                    (SELECT 1 FROM vw_posicao_item v WHERE v.solicitacao_id = s.id AND v.qtd_pendente_expedicao > 0)""",
    "devolucao": """s.status IN ('em_exposicao', 'devolucao_parcial') AND EXISTS
                    (SELECT 1 FROM vw_posicao_item v WHERE v.solicitacao_id = s.id AND v.qtd_em_loja > 0)""",
    "rascunhos": "s.status = 'rascunho' AND s.requisitante_id = %(eu)s",
}


def _filtro_base(usuario: dict) -> tuple[list[str], dict]:
    filtros = ["(s.status <> 'rascunho' OR s.requisitante_id = %(eu)s)"]
    params = {"eu": usuario["id"]}
    permitidas = filiais_permitidas(usuario)
    if permitidas is not None:
        filtros.append("s.filial_id = ANY(%(filiais)s)")
        params["filiais"] = list(permitidas)
    return filtros, params


@router.get("/solicitacoes")
def listar(status: str = "", fila: str = "", filial_id: int | None = None, busca: str = "",
           minhas: bool = False, pagina: int = 1, limite: int = 30,
           usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    filtros, params = _filtro_base(usuario)
    if status:
        filtros.append("s.status::text = ANY(%(status)s)")
        params["status"] = status.split(",")
    if fila:
        if fila not in FILAS:
            raise HTTPException(400, "Fila inválida")
        filtros.append(FILAS[fila])
    if filial_id:
        filtros.append("s.filial_id = %(filial_id)s")
        params["filial_id"] = filial_id
    if minhas:
        filtros.append("s.requisitante_id = %(eu)s")
    if busca.strip():
        filtros.append("(s.protocolo ILIKE %(busca)s OR unaccent(u.nome) ILIKE unaccent(%(busca)s) OR EXISTS ("
                       "SELECT 1 FROM itens_solicitacao i2 JOIN produtos p2 ON p2.id = i2.produto_id "
                       "WHERE i2.solicitacao_id = s.id AND (p2.sku ILIKE %(busca)s "
                       "OR unaccent(p2.descricao) ILIKE unaccent(%(busca)s))))")
        params["busca"] = f"%{busca.strip()}%"
    limite = max(1, min(limite, 200))
    params.update(limite=limite, offset=(max(pagina, 1) - 1) * limite)
    linhas = conn.execute(
        f"""SELECT s.id, s.protocolo, s.status, s.prioridade, s.criado_em, s.enviado_em, s.encerrado_em,
                   s.filial_id, f.nome AS filial_nome, s.requisitante_id, u.nome AS requisitante_nome,
                   (SELECT count(*) FROM itens_solicitacao i WHERE i.solicitacao_id = s.id) AS itens,
                   (SELECT COALESCE(sum(i.quantidade_solicitada * i.custo_referencia), 0)
                      FROM itens_solicitacao i WHERE i.solicitacao_id = s.id) AS valor_solicitado,
                   (SELECT COALESCE(sum(v.valor_em_loja), 0) FROM vw_posicao_item v
                     WHERE v.solicitacao_id = s.id) AS valor_em_loja,
                   count(*) OVER () AS _total
            FROM solicitacoes s JOIN filiais f ON f.id = s.filial_id JOIN usuarios u ON u.id = s.requisitante_id
            WHERE {' AND '.join(filtros)}
            ORDER BY s.prioridade, s.id DESC
            LIMIT %(limite)s OFFSET %(offset)s""",
        params,
    ).fetchall()
    total = linhas[0]["_total"] if linhas else 0
    for linha in linhas:
        del linha["_total"]
    return {"itens": linhas, "total": total, "pagina": pagina, "limite": limite}


@router.get("/solicitacoes/resumo")
def resumo(usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    """Contagem das filas que o usuário atende, para a tela inicial."""
    filtros, params = _filtro_base(usuario)
    filas = {"rascunhos": tem_perfil(usuario, "requisitante"),
             "comercial": tem_perfil(usuario, "aprovador_comercial"),
             "logistica": tem_perfil(usuario, "aprovador_logistica"),
             "expedicao": tem_perfil(usuario, "deposito"),
             "devolucao": tem_perfil(usuario, "deposito", "gestor")}
    resultado = {}
    for fila, visivel in filas.items():
        if visivel:
            resultado[fila] = conn.execute(
                f"SELECT count(*) AS n FROM solicitacoes s WHERE {' AND '.join(filtros + [FILAS[fila]])}", params
            ).fetchone()["n"]
    filtro_amostras = ""
    if params.get("filiais") is not None:
        filtro_amostras = "AND filial_id = ANY(%(filiais)s)"
    exposicao = conn.execute(
        f"""SELECT COALESCE(sum(qtd_em_loja), 0) AS quantidade, COALESCE(sum(valor_em_loja), 0) AS valor
            FROM vw_posicao_item WHERE qtd_em_loja > 0 {filtro_amostras}""",
        params,
    ).fetchone()
    return {"filas": resultado, "em_exposicao": exposicao}


@router.get("/solicitacoes/{sid}")
def detalhe(sid: int, usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid)
    if s["status"] == "rascunho" and s["requisitante_id"] != usuario["id"]:
        raise HTTPException(404, "Requisição não encontrada")
    return _detalhe(conn, usuario, sid)


# ---------------------------------------------------------------------------
# Requisição
# ---------------------------------------------------------------------------

@router.post("/solicitacoes", status_code=201)
def criar(dados: SolicitacaoIn, usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    if not tem_perfil(usuario, "requisitante"):
        raise HTTPException(403, "Apenas requisitantes criam requisições")
    _validar_filial(conn, usuario, dados.filial_id)
    status = "aguardando_aprovacao_comercial" if dados.enviar else "rascunho"
    sid = conn.execute(
        """INSERT INTO solicitacoes (filial_id, requisitante_id, finalidade, justificativa, prioridade, status, enviado_em)
           VALUES (%s, %s, %s, %s, %s, %s, CASE WHEN %s THEN now() END) RETURNING id""",
        (dados.filial_id, usuario["id"], dados.finalidade, dados.justificativa, dados.prioridade, status, dados.enviar),
    ).fetchone()["id"]
    _gravar_itens(conn, sid, dados.itens)
    auditar(conn, usuario["id"], "solicitacoes", sid, "criar", depois={"status": status})
    return _detalhe(conn, usuario, sid)


@router.put("/solicitacoes/{sid}")
def alterar(sid: int, dados: SolicitacaoIn, usuario: dict = Depends(usuario_atual),
            conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    _exigir("editar", s, conn, usuario)
    _validar_filial(conn, usuario, dados.filial_id)
    status = "aguardando_aprovacao_comercial" if dados.enviar else "rascunho"
    conn.execute(
        """UPDATE solicitacoes SET filial_id = %s, finalidade = %s, justificativa = %s, prioridade = %s,
                  status = %s, enviado_em = CASE WHEN %s THEN now() END WHERE id = %s""",
        (dados.filial_id, dados.finalidade, dados.justificativa, dados.prioridade, status, dados.enviar, sid),
    )
    _gravar_itens(conn, sid, dados.itens)
    auditar(conn, usuario["id"], "solicitacoes", sid, "enviar" if dados.enviar else "alterar", depois={"status": status})
    return _detalhe(conn, usuario, sid)


@router.post("/solicitacoes/{sid}/enviar")
def enviar(sid: int, usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    _exigir("enviar", s, conn, usuario)
    conn.execute("UPDATE solicitacoes SET status = 'aguardando_aprovacao_comercial', enviado_em = now() WHERE id = %s",
                 (sid,))
    auditar(conn, usuario["id"], "solicitacoes", sid, "enviar", depois={"status": "aguardando_aprovacao_comercial"})
    return _detalhe(conn, usuario, sid)


@router.post("/solicitacoes/{sid}/cancelar")
def cancelar(sid: int, dados: CancelarIn, usuario: dict = Depends(usuario_atual),
             conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    _exigir("cancelar", s, conn, usuario)
    _motivo(conn, dados.motivo_id, "cancelamento", dados.observacao, obrigatorio=s["status"] != "rascunho")
    conn.execute(
        "UPDATE solicitacoes SET status = 'cancelada', motivo_id = %s, observacao = %s, encerrado_em = now() WHERE id = %s",
        (dados.motivo_id, dados.observacao, sid),
    )
    auditar(conn, usuario["id"], "solicitacoes", sid, "cancelar",
            {"status": s["status"]}, {"status": "cancelada", "observacao": dados.observacao})
    return _detalhe(conn, usuario, sid)


# ---------------------------------------------------------------------------
# Aprovações
# ---------------------------------------------------------------------------

@router.post("/solicitacoes/{sid}/decisao")
def decidir(sid: int, dados: DecisaoIn, usuario: dict = Depends(usuario_atual),
            conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    itens = _exigir("aprovar", s, conn, usuario)
    etapa = STATUS_APROVACAO[s["status"]]

    if dados.decisao == "reprovada":
        if dados.motivo_id is None and not (dados.observacao or "").strip():
            raise HTTPException(400, "Informe o motivo da reprovação")
        _motivo(conn, dados.motivo_id, "reprovacao", dados.observacao, obrigatorio=False)
        novo = "reprovada"
    else:
        por_id = {i["item_id"]: i for i in itens}
        for item_id, qtd in dados.quantidades.items():
            if item_id not in por_id:
                raise HTTPException(400, f"Item {item_id} não pertence à requisição")
            if qtd < 0 or qtd > por_id[item_id]["qtd_aprovada"]:
                raise HTTPException(400, "A quantidade aprovada não pode ser negativa nem maior que a anterior")
            conn.execute("UPDATE itens_solicitacao SET quantidade_aprovada = %s WHERE id = %s", (qtd, item_id))
        total = sum(dados.quantidades.get(i["item_id"], i["qtd_aprovada"]) for i in itens)
        if total == 0:
            raise HTTPException(400, "Nenhuma quantidade aprovada; use Reprovar")
        novo = "aguardando_aprovacao_logistica" if etapa == "comercial" else "aguardando_expedicao"

    conn.execute(
        """INSERT INTO aprovacoes (solicitacao_id, etapa, decisao, aprovador_id, motivo_id, observacao)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (sid, etapa, dados.decisao, usuario["id"], dados.motivo_id, dados.observacao),
    )
    conn.execute(
        "UPDATE solicitacoes SET status = %s, encerrado_em = CASE WHEN %s = 'reprovada' THEN now() END WHERE id = %s",
        (novo, novo, sid),
    )
    auditar(conn, usuario["id"], "solicitacoes", sid, f"{dados.decisao}_{etapa}",
            {"status": s["status"]},
            {"status": novo, "quantidades": {str(k): str(v) for k, v in dados.quantidades.items()} or None,
             "observacao": dados.observacao})
    return _detalhe(conn, usuario, sid)


# ---------------------------------------------------------------------------
# Depósito: expedição e devolução
# ---------------------------------------------------------------------------

def _ja_processado(conn: Connection, chave: str) -> bool:
    return conn.execute("SELECT 1 FROM movimentacoes WHERE chave_idempotencia = %s",
                        (f"{chave}:0",)).fetchone() is not None


@router.post("/solicitacoes/{sid}/expedir")
def expedir(sid: int, dados: ExpedicaoIn, usuario: dict = Depends(usuario_atual),
            conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    if _ja_processado(conn, dados.chave):  # duplo clique / reenvio
        return _detalhe(conn, usuario, sid)
    itens = _exigir("expedir", s, conn, usuario)
    ids = {i["item_id"] for i in itens}
    for n, linha in enumerate(dados.itens):
        if linha.item_id not in ids:
            raise HTTPException(400, f"Item {linha.item_id} não pertence à requisição")
        conn.execute(
            """INSERT INTO movimentacoes (item_id, tipo, quantidade, observacao, usuario_id, chave_idempotencia)
               VALUES (%s, 'expedicao', %s, %s, %s, %s)""",
            (linha.item_id, linha.quantidade, dados.observacao, usuario["id"], f"{dados.chave}:{n}"),
        )
    _status(conn, sid, usuario)
    return _detalhe(conn, usuario, sid)


@router.post("/solicitacoes/{sid}/devolver")
def devolver(sid: int, dados: DevolucaoIn, usuario: dict = Depends(usuario_atual),
             conn: Connection = Depends(get_conn)):
    s = _carregar(conn, usuario, sid, bloquear=True)
    if _ja_processado(conn, dados.chave):
        return _detalhe(conn, usuario, sid)
    itens = _exigir("devolver", s, conn, usuario)
    ids = {i["item_id"] for i in itens}
    for n, linha in enumerate(dados.lancamentos):
        if linha.item_id not in ids:
            raise HTTPException(400, f"Item {linha.item_id} não pertence à requisição")
        if linha.destino != "estoque":
            _motivo(conn, linha.motivo_id, linha.destino, linha.observacao, obrigatorio=True)
        conn.execute(
            """INSERT INTO movimentacoes (item_id, tipo, quantidade, motivo_id, observacao, usuario_id, chave_idempotencia)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (linha.item_id, DESTINOS[linha.destino], linha.quantidade,
             linha.motivo_id if linha.destino != "estoque" else None, linha.observacao,
             usuario["id"], f"{dados.chave}:{n}"),
        )
    _status(conn, sid, usuario)
    return _detalhe(conn, usuario, sid)


@router.post("/solicitacoes/{sid}/itens/{item_id}/cancelar-pendente")
def cancelar_pendente(sid: int, item_id: int, dados: CancelarPendenteIn, usuario: dict = Depends(usuario_atual),
                      conn: Connection = Depends(get_conn)):
    """Encerra o saldo que não será expedido (aprovada passa a ser igual à expedida)."""
    s = _carregar(conn, usuario, sid, bloquear=True)
    itens = _exigir("cancelar_pendente", s, conn, usuario)
    item = next((i for i in itens if i["item_id"] == item_id), None)
    if item is None or item["qtd_pendente_expedicao"] <= 0:
        raise HTTPException(400, "Item sem saldo pendente de expedição")
    conn.execute("UPDATE itens_solicitacao SET quantidade_aprovada = %s WHERE id = %s",
                 (item["qtd_expedida"], item_id))
    auditar(conn, usuario["id"], "solicitacoes", sid, "cancelar_pendente",
            {"item_id": item_id, "quantidade_aprovada": item["qtd_aprovada"]},
            {"item_id": item_id, "sku": item["sku"], "quantidade_aprovada": item["qtd_expedida"],
             "observacao": dados.observacao})
    _status(conn, sid, usuario)
    return _detalhe(conn, usuario, sid)


@router.post("/movimentacoes/{mid}/estornar")
def estornar(mid: int, dados: EstornoIn, usuario: dict = Depends(usuario_atual),
             conn: Connection = Depends(get_conn)):
    mov = conn.execute(
        "SELECT m.*, i.solicitacao_id FROM movimentacoes m JOIN itens_solicitacao i ON i.id = m.item_id WHERE m.id = %s",
        (mid,),
    ).fetchone()
    if mov is None:
        raise HTTPException(404, "Movimentação não encontrada")
    s = _carregar(conn, usuario, mov["solicitacao_id"], bloquear=True)
    _exigir("estornar", s, conn, usuario)
    if mov["tipo"] == "estorno":
        raise HTTPException(400, "Não é possível estornar um estorno")
    if conn.execute("SELECT 1 FROM movimentacoes WHERE estorno_de_id = %s", (mid,)).fetchone():
        raise HTTPException(400, "Movimentação já estornada")
    _motivo(conn, dados.motivo_id, "estorno", dados.observacao, obrigatorio=True)
    conn.execute(
        """INSERT INTO movimentacoes (item_id, tipo, quantidade, motivo_id, observacao, estorno_de_id, usuario_id, chave_idempotencia)
           VALUES (%s, 'estorno', %s, %s, %s, %s, %s, %s)""",
        (mov["item_id"], mov["quantidade"], dados.motivo_id, dados.observacao, mid, usuario["id"], f"estorno:{mid}"),
    )
    auditar(conn, usuario["id"], "solicitacoes", s["id"], "estornar",
            depois={"movimentacao_id": mid, "tipo": mov["tipo"], "quantidade": str(mov["quantidade"]),
                    "observacao": dados.observacao})
    _status(conn, s["id"], usuario)
    return _detalhe(conn, usuario, s["id"])


# ---------------------------------------------------------------------------
# Amostras em exposição
# ---------------------------------------------------------------------------

@router.get("/amostras")
def amostras(filial_id: int | None = None, fornecedor_id: int | None = None, busca: str = "",
             usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    """O que está hoje nas lojas, item a item."""
    filtros, params = ["v.qtd_em_loja > 0"], {}
    permitidas = filiais_permitidas(usuario)
    if permitidas is not None:
        filtros.append("v.filial_id = ANY(%(filiais)s)")
        params["filiais"] = list(permitidas)
    if filial_id:
        filtros.append("v.filial_id = %(filial_id)s")
        params["filial_id"] = filial_id
    if fornecedor_id:
        filtros.append("v.fornecedor_id = %(fornecedor_id)s")
        params["fornecedor_id"] = fornecedor_id
    if busca.strip():
        filtros.append("(p.sku ILIKE %(busca)s OR unaccent(p.descricao) ILIKE unaccent(%(busca)s) "
                       "OR v.protocolo ILIKE %(busca)s)")
        params["busca"] = f"%{busca.strip()}%"
    return conn.execute(
        f"""SELECT v.item_id, v.solicitacao_id, v.protocolo, v.filial_id, f.nome AS filial_nome,
                   p.sku, p.descricao, p.unidade, fo.razao_social AS fornecedor_nome, u.nome AS requisitante_nome,
                   v.qtd_em_loja, v.valor_em_loja, v.primeira_expedicao_em, v.dias_em_exposicao
            FROM vw_posicao_item v
            JOIN filiais f ON f.id = v.filial_id JOIN produtos p ON p.id = v.produto_id
            JOIN usuarios u ON u.id = v.requisitante_id
            LEFT JOIN fornecedores fo ON fo.id = v.fornecedor_id
            WHERE {' AND '.join(filtros)}
            ORDER BY v.dias_em_exposicao DESC, f.nome, p.descricao
            LIMIT 1000""",
        params,
    ).fetchall()
