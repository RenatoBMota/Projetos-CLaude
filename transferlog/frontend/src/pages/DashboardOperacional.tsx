import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { nomeUnidade, type DashboardOperacional as DashboardOperacionalData, type Unidade } from "../api/types";

interface FilialDashboard extends DashboardOperacionalData {
  unidade: Unidade;
}

function otifTexto(otif: number | null): string {
  return otif === null ? "—" : `${otif.toFixed(1)}%`;
}

export function DashboardOperacional() {
  const { usuario } = useAuth();
  const verPorFilial = usuario?.perfil === "ADMINISTRADOR" || usuario?.perfil === "SUPERVISOR";

  const [dados, setDados] = useState<DashboardOperacionalData | null>(null);
  const [porFilial, setPorFilial] = useState<FilialDashboard[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (verPorFilial) {
      api
        .get<FilialDashboard[]>("/dashboard/operacional-por-filial")
        .then(setPorFilial)
        .catch((err) => setErro(err.message));
    } else {
      api
        .get<DashboardOperacionalData>("/dashboard/operacional")
        .then(setDados)
        .catch((err) => setErro(err.message));
    }
  }, [verPorFilial]);

  if (erro) return <div className="error-box">{erro}</div>;

  if (verPorFilial) {
    if (!porFilial) return <p>Carregando...</p>;
    return (
      <div>
        <h1>Painel por filial</h1>
        <div className="card">
          {porFilial.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Nenhuma unidade cadastrada ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Filial</th>
                  <th>Aguardando separação</th>
                  <th>Carregadas</th>
                  <th>Em trânsito</th>
                  <th>Aguardando conferência</th>
                  <th>Com divergência</th>
                  <th>OTIF</th>
                </tr>
              </thead>
              <tbody>
                {porFilial.map((f) => (
                  <tr key={f.unidade.id}>
                    <td>{nomeUnidade(f.unidade)}</td>
                    <td>{f.aguardandoSeparacao}</td>
                    <td>{f.carregadas}</td>
                    <td>{f.emTransito}</td>
                    <td>{f.aguardandoConferencia}</td>
                    <td>{f.comDivergencia}</td>
                    <td>{otifTexto(f.otifPercentual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (!dados) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Painel da unidade</h1>
      <div className="kpi-row">
        <div className="kpi">
          <div className="value">{dados.aguardandoSeparacao}</div>
          <div className="label">Aguardando separação</div>
        </div>
        <div className="kpi">
          <div className="value">{dados.carregadas}</div>
          <div className="label">Carregadas</div>
        </div>
        <div className="kpi">
          <div className="value">{dados.emTransito}</div>
          <div className="label">Em trânsito</div>
        </div>
        <div className="kpi">
          <div className="value">{dados.aguardandoConferencia}</div>
          <div className="label">Aguardando conferência</div>
        </div>
        <div className="kpi">
          <div className="value">{dados.comDivergencia}</div>
          <div className="label">Com divergência</div>
        </div>
        <div className="kpi">
          <div className="value">{otifTexto(dados.otifPercentual)}</div>
          <div className="label">OTIF</div>
        </div>
      </div>
    </div>
  );
}
