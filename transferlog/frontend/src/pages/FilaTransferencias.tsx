import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge, temDivergencia } from "../components/StatusBadge";
import { StatusDot } from "../components/StatusDot";
import { useAuth } from "../context/AuthContext";
import { nomeUnidade, type StatusTransferencia, type Transferencia, type Unidade } from "../api/types";
import { formatarDataHora } from "../utils/formatar";

type StatusFiltro = StatusTransferencia | "FINALIZADO_DIVERGENTE";

const STATUS_OPCOES: { valor: StatusFiltro; label: string }[] = [
  { valor: "PENDENTE_SEPARACAO", label: "Pendente de separação" },
  { valor: "EM_SEPARACAO", label: "Em separação" },
  { valor: "CARREGADO", label: "Separado / pronto p/ carregar" },
  { valor: "EM_TRANSITO", label: "Em trânsito" },
  { valor: "RECEBIDO", label: "Aguardando conferência" },
  { valor: "CONFERIDO_OK", label: "Recebido OK" },
  { valor: "CONFERIDO_DIVERGENTE", label: "Recebido com divergência" },
  { valor: "FINALIZADO", label: "Finalizado" },
  { valor: "FINALIZADO_DIVERGENTE", label: "Finalizado com divergência" },
  { valor: "CANCELADO", label: "Cancelado" },
];

export function FilaTransferencias() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const isAdmin = usuario?.perfil === "ADMINISTRADOR";

  const origemId = searchParams.get("origemId") ?? "";
  const destinoId = searchParams.get("destinoId") ?? "";
  const status = (searchParams.get("status") ?? "") as StatusFiltro | "";
  const numeroNF = searchParams.get("numeroNF") ?? "";
  const viagemNumero = searchParams.get("viagemNumero") ?? "";
  const dataInicio = searchParams.get("dataInicio") ?? "";
  const dataFim = searchParams.get("dataFim") ?? "";

  function atualizarFiltro(chave: string, valor: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) next.set(chave, valor);
        else next.delete(chave);
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    api.get<Unidade[]>("/unidades").then(setUnidades).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (origemId) params.set("origemId", origemId);
      if (destinoId) params.set("destinoId", destinoId);
      if (status === "FINALIZADO_DIVERGENTE") params.set("status", "FINALIZADO");
      else if (status) params.set("status", status);
      if (numeroNF) params.set("numeroNF", numeroNF);
      if (viagemNumero) params.set("viagemNumero", viagemNumero);
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);

      api
        .get<Transferencia[]>(`/transferencias?${params.toString()}`)
        .then((dados) =>
          setTransferencias(status === "FINALIZADO_DIVERGENTE" ? dados.filter((t) => temDivergencia(t.itens)) : dados),
        )
        .catch((err) => setErro(err.message));
    }, 300);

    return () => clearTimeout(timer);
  }, [origemId, destinoId, status, numeroNF, viagemNumero, dataInicio, dataFim]);

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

  return (
    <div>
      <h1>Transferências</h1>

      <div className="card">
        <div className="form-row">
          <div className="field">
            <label>Número da NF</label>
            <input
              type="text"
              placeholder="Buscar por NF..."
              value={numeroNF}
              onChange={(e) => atualizarFiltro("numeroNF", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nº da viagem</label>
            <input
              type="text"
              placeholder="Buscar por viagem..."
              value={viagemNumero}
              onChange={(e) => atualizarFiltro("viagemNumero", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Data do pedido de</label>
            <input type="date" value={dataInicio} onChange={(e) => atualizarFiltro("dataInicio", e.target.value)} />
          </div>
          <div className="field">
            <label>Data do pedido até</label>
            <input type="date" value={dataFim} onChange={(e) => atualizarFiltro("dataFim", e.target.value)} />
          </div>
          <div className="field">
            <label>Origem</label>
            <select value={origemId} onChange={(e) => atualizarFiltro("origemId", e.target.value)}>
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{nomeUnidade(u)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Destino</label>
            <select value={destinoId} onChange={(e) => atualizarFiltro("destinoId", e.target.value)}>
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{nomeUnidade(u)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => atualizarFiltro("status", e.target.value)}>
              <option value="">Todos</option>
              {STATUS_OPCOES.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!transferencias ? (
        <p>Carregando...</p>
      ) : (
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
                <th>In Full</th>
                <th>On Time</th>
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
                  <td><StatusDot valor={t.otif?.inFull} titulo="In Full" /></td>
                  <td><StatusDot valor={t.otif?.onTime} titulo="On Time" /></td>
                  <td><Link to={`/transferencias/${t.id}`}>Ver</Link></td>
                  {isAdmin && (
                    <td><button className="danger" onClick={() => excluir(t)}>Excluir</button></td>
                  )}
                </tr>
              ))}
              {transferencias.length === 0 && (
                <tr><td colSpan={isAdmin ? 11 : 10} style={{ color: "var(--text-muted)" }}>Nenhuma transferência encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
