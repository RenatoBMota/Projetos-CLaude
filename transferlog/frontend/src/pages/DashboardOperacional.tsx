import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { nomeUnidade, type DashboardOperacional as DashboardOperacionalData, type Unidade } from "../api/types";
import { KpiTile } from "../components/KpiTile";
import { Meter } from "../components/charts/Meter";
import { BarraHorizontal, type ItemBarra } from "../components/charts/BarraHorizontal";
import {
  IconAlertTriangle,
  IconBox,
  IconClipboardCheck,
  IconClock,
  IconTarget,
  IconTruck,
} from "../components/icons";

interface FilialDashboard extends DashboardOperacionalData {
  unidade: Unidade;
}

function otifTexto(otif: number | null): string {
  return otif === null ? "—" : `${otif.toFixed(1)}%`;
}

function tomOtif(otif: number | null): "ok" | "warn" | "danger" {
  if (otif === null) return "warn";
  if (otif >= 90) return "ok";
  if (otif >= 70) return "warn";
  return "danger";
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

    const barrasOtif: ItemBarra[] = porFilial.map((f) => ({
      label: nomeUnidade(f.unidade),
      valor: f.otifPercentual ?? 0,
      valorExibido: otifTexto(f.otifPercentual),
      tom: tomOtif(f.otifPercentual),
    }));

    return (
      <div>
        <h1>Painel por filial</h1>

        <div className="card">
          <div className="card-header">
            <h2>OTIF por filial</h2>
          </div>
          <BarraHorizontal itens={barrasOtif} vazio="Nenhuma unidade cadastrada ainda." />
        </div>

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
        <KpiTile icone={<IconClock />} tom="accent" valor={dados.aguardandoSeparacao} label="Aguardando separação" />
        <KpiTile icone={<IconBox />} tom="accent" valor={dados.carregadas} label="Carregadas" />
        <KpiTile icone={<IconTruck />} tom="accent" valor={dados.emTransito} label="Em trânsito" />
        <KpiTile icone={<IconClipboardCheck />} tom="accent" valor={dados.aguardandoConferencia} label="Aguardando conferência" />
        <KpiTile
          icone={<IconAlertTriangle />}
          tom={dados.comDivergencia > 0 ? "danger" : "ok"}
          valor={dados.comDivergencia}
          label="Com divergência"
        />
        <KpiTile icone={<IconTarget />} tom={tomOtif(dados.otifPercentual)} valor={otifTexto(dados.otifPercentual)} label="OTIF">
          <Meter percentual={dados.otifPercentual} />
        </KpiTile>
      </div>
    </div>
  );
}
