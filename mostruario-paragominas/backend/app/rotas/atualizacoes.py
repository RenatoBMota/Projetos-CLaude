from fastapi import APIRouter, Depends
from psycopg import Connection

from ..db import get_conn
from ..seguranca import usuario_atual

router = APIRouter(prefix="/api", tags=["atualizacoes"])


@router.get("/versao")
def versao(_: dict = Depends(usuario_atual), conn: Connection = Depends(get_conn)):
    """Marca dos dados: muda a cada inclusão ou alteração. As telas consultam
    a cada poucos segundos e só recarregam quando ela muda."""
    r = conn.execute(
        """SELECT (SELECT COALESCE(max(id), 0) FROM auditoria) AS a,
                  (SELECT COALESCE(max(id), 0) FROM movimentacoes) AS m,
                  (SELECT COALESCE(max(id), 0) FROM ajustes_item) AS j,
                  (SELECT COALESCE(max(id), 0) FROM aprovacoes) AS p,
                  (SELECT COALESCE(max(id), 0) FROM anexos) AS x"""
    ).fetchone()
    return {"versao": f"{r['a']}.{r['m']}.{r['j']}.{r['p']}.{r['x']}"}
