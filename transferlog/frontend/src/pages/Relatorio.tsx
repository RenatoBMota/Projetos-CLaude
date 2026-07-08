import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { nomeUnidade, type StatusTransferencia, type Transferencia } from "../api/types";
import { formatarDataHora } from "../utils/formatar";

const STATUS_OPCOES: { valor: StatusTransferencia; label: string }[] = [
  { valor: "PENDENTE_SEPARACAO", label: "Pendente de separação" },
  { valor: "EM_SEPARACAO", label: "Em separação" },
  { valor: "CARREGADO", label: "Separado / pronto p/ carregar" },
  { valor: "EM_TRANSITO", label: "Em trânsito" },
  { valor: "RECEBIDO", label: "Aguardando conferência" },
  { valor: "CONFERIDO_OK", label: "Recebido OK" },
  { valor: "CONFERIDO_DIVERGENTE", label: "Recebido com divergência" },
  { valor: "FINALIZADO", label: "Finalizado" },
  { valor: "CANCELADO", label: "Cancelado" },
];

export function Relatorio() {
  const [codigoProduto, setCodigoProduto] = useState("");
  const [status, setStatus] = useState<StatusTransferencia | "">("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [resultados, setResultados] = useState<Transferencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar() {
    setErro(null);
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (codigoProduto.trim()) params.set("codigoProduto", codigoProduto.trim());
      if (status) params.set("status", status);
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);

      const dados = await api.get<Transferencia[]>(`/transferencias/relatorio?${params.toString()}`);
      setResultados(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível buscar o relatório");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <h1>Relatório de Transferências</h1>
      {erro && <div className="error-box">{erro}</div>}

      <div className="card">
        <div className="form-row">
          <div className="field">
            <label>Código do produto</label>
            <input
              value={codigoProduto}
              onChange={(e) => setCodigoProduto(e.target.value)}
              placeholder="Ex: 373867"
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusTransferencia | "")}>
              <option value="">Todos</option>
              {STATUS_OPCOES.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data de</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="field">
            <label>Data até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
        <button className="primary" disabled={carregando} onClick={buscar}>
          {carregando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {resultados && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>NF</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Criada</th>
                <th>Status</th>
                <th>Produtos correspondentes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((t) => {
                const itensCorrespondentes = codigoProduto.trim()
                  ? t.itens.filter((i) =>
                      i.codigoInterno.toLowerCase().includes(codigoProduto.trim().toLowerCase()),
                    )
                  : t.itens;
                return (
                  <tr key={t.id}>
                    <td>{t.numeroPedido}</td>
                    <td>{t.numeroNF}</td>
                    <td>{nomeUnidade(t.origem)}</td>
                    <td>{nomeUnidade(t.destino)}</td>
                    <td>{formatarDataHora(t.createdAt)}</td>
                    <td><StatusBadge status={t.status} itens={t.itens} /></td>
                    <td>
                      {itensCorrespondentes
                        .map((i) => `${i.codigoInterno} — ${i.descricao} (${i.quantidade})`)
                        .join("; ")}
                    </td>
                    <td><Link to={`/transferencias/${t.id}`}>Ver</Link></td>
                  </tr>
                );
              })}
              {resultados.length === 0 && (
                <tr><td colSpan={8} style={{ color: "var(--text-muted)" }}>Nenhum resultado encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
