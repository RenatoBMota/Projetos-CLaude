import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { DashboardOperacional as DashboardOperacionalData } from "../api/types";

export function DashboardOperacional() {
  const [dados, setDados] = useState<DashboardOperacionalData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardOperacionalData>("/dashboard/operacional")
      .then(setDados)
      .catch((err) => setErro(err.message));
  }, []);

  if (erro) return <div className="error-box">{erro}</div>;
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
          <div className="value">
            {dados.otifPercentual === null ? "—" : `${dados.otifPercentual.toFixed(1)}%`}
          </div>
          <div className="label">OTIF</div>
        </div>
      </div>
    </div>
  );
}
