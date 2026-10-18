"""Anexos das requisições: fotos e comprovantes (imagem ou PDF)."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from psycopg import Connection

from .. import config
from ..db import auditar, get_conn
from ..seguranca import pode_ver_filial, usuario_atual

router = APIRouter(prefix="/api", tags=["anexos"])

TIPOS = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "image/heic": ".heic", "application/pdf": ".pdf",
}


def _solicitacao(conn: Connection, usuario: dict, sid: int) -> dict:
    s = conn.execute("SELECT id, filial_id, status, requisitante_id FROM solicitacoes WHERE id = %s", (sid,)).fetchone()
    if s is None or not pode_ver_filial(usuario, s["filial_id"]) or (
            s["status"] == "rascunho" and s["requisitante_id"] != usuario["id"]):
        raise HTTPException(404, "Requisição não encontrada")
    return s


@router.get("/solicitacoes/{sid}/anexos")
def listar(sid: int, usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    _solicitacao(conn, usuario, sid)
    return conn.execute(
        """SELECT a.id, a.nome_arquivo, a.tipo_conteudo, a.tamanho, a.descricao, a.criado_em, u.nome AS usuario_nome
           FROM anexos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.solicitacao_id = %s ORDER BY a.id""",
        (sid,),
    ).fetchall()


@router.post("/solicitacoes/{sid}/anexos", status_code=201)
def enviar(sid: int, arquivo: UploadFile, descricao: str = Form(""), usuario: dict = Depends(usuario_atual),
           conn: Connection = Depends(get_conn)):
    _solicitacao(conn, usuario, sid)
    extensao = TIPOS.get(arquivo.content_type or "")
    if extensao is None:
        raise HTTPException(400, "Envie uma imagem (JPG, PNG, WEBP, HEIC) ou PDF")
    conteudo = arquivo.file.read(config.ANEXO_MAX_MB * 1024 * 1024 + 1)
    if len(conteudo) > config.ANEXO_MAX_MB * 1024 * 1024:
        raise HTTPException(400, f"Arquivo maior que {config.ANEXO_MAX_MB} MB")
    if not conteudo:
        raise HTTPException(400, "Arquivo vazio")
    pasta = Path(config.ANEXOS_DIR)
    pasta.mkdir(parents=True, exist_ok=True)
    caminho = f"{sid}-{uuid.uuid4().hex}{extensao}"
    (pasta / caminho).write_bytes(conteudo)
    try:
        novo = conn.execute(
            """INSERT INTO anexos (solicitacao_id, nome_arquivo, tipo_conteudo, tamanho, caminho, descricao, usuario_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, nome_arquivo, tipo_conteudo, tamanho, descricao, criado_em""",
            (sid, Path(arquivo.filename or f"anexo{extensao}").name[:200], arquivo.content_type, len(conteudo),
             caminho, descricao.strip() or None, usuario["id"]),
        ).fetchone()
        auditar(conn, usuario["id"], "solicitacoes", sid, "anexar",
                depois={"anexo_id": novo["id"], "arquivo": novo["nome_arquivo"], "observacao": novo["descricao"]})
    except Exception:
        (pasta / caminho).unlink(missing_ok=True)
        raise
    return {**novo, "usuario_nome": usuario["nome"]}


@router.get("/anexos/{aid}")
def baixar(aid: int, usuario: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    a = conn.execute("SELECT * FROM anexos WHERE id = %s", (aid,)).fetchone()
    if a is None:
        raise HTTPException(404, "Anexo não encontrado")
    _solicitacao(conn, usuario, a["solicitacao_id"])
    arquivo = Path(config.ANEXOS_DIR) / a["caminho"]
    if not arquivo.is_file():
        raise HTTPException(404, "Arquivo não encontrado no servidor")
    return FileResponse(arquivo, media_type=a["tipo_conteudo"], filename=a["nome_arquivo"],
                        content_disposition_type="inline",
                        headers={"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox"})
