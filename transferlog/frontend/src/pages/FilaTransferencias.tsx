import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { nomeUnidade, type Transferencia } from "../api/types";
import { formatarDataHora } from "../utils/formatar";

export function FilaTransferencias() {
  const [transferencias, setTransferencias] = useState<Transferencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Transferencia[]>("/transferencias")
      .then(setTransferencias)
      .catch((err) => setErro(err.message));
  }, []);

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
              <th>Criada</th>
              <th>Prazo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transferencias.map((t) => (
              <tr key={t.id}>
                <td>{t.numeroPedido}</td>
                <td>{t.numeroNF}</td>
                <td>{nomeUnidade(t.origem)}</td>
                <td>{nomeUnidade(t.destino)}</td>
                <td>{formatarDataHora(t.createdAt)}</td>
                <td>{formatarDataHora(t.prazoPrevisto)}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><Link to={`/transferencias/${t.id}`}>Ver</Link></td>
              </tr>
            ))}
            {transferencias.length === 0 && (
              <tr><td colSpan={8} style={{ color: "var(--text-muted)" }}>Nenhuma transferência encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
