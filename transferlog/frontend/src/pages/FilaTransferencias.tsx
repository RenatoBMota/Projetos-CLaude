import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { nomeUnidade, type Transferencia } from "../api/types";
import { formatarDataHora } from "../utils/formatar";

export function FilaTransferencias() {
  const { usuario } = useAuth();
  const [transferencias, setTransferencias] = useState<Transferencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const isAdmin = usuario?.perfil === "ADMINISTRADOR";

  useEffect(() => {
    api
      .get<Transferencia[]>("/transferencias")
      .then(setTransferencias)
      .catch((err) => setErro(err.message));
  }, []);

  async function excluir(t: Transferencia) {
    if (!window.confirm(`Excluir a transferência do pedido ${t.numeroPedido} (NF ${t.numeroNF})? Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.delete(`/transferencias/${t.id}`);
      setTransferencias((prev) => prev?.filter((x) => x.id !== t.id) ?? null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível excluir a transferência");
    }
  }

  if (erro) return <div className="error-box">{erro}</div>;
  if (!transferencias) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Transferências</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>NF</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Data pedido</th>
              <th>Prazo</th>
              <th>Status</th>
              <th></th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {transferencias.map((t) => (
              <tr key={t.id}>
                <td>{t.numeroPedido}</td>
                <td>{t.numeroNF}</td>
                <td>{nomeUnidade(t.origem)}</td>
                <td>{nomeUnidade(t.destino)}</td>
                <td>{formatarDataHora(t.dataPedido)}</td>
                <td>{formatarDataHora(t.prazoPrevisto)}</td>
                <td><StatusBadge status={t.status} itens={t.itens} /></td>
                <td><Link to={`/transferencias/${t.id}`}>Ver</Link></td>
                {isAdmin && (
                  <td><button className="danger" onClick={() => excluir(t)}>Excluir</button></td>
                )}
              </tr>
            ))}
            {transferencias.length === 0 && (
              <tr><td colSpan={isAdmin ? 9 : 8} style={{ color: "var(--text-muted)" }}>Nenhuma transferência encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
