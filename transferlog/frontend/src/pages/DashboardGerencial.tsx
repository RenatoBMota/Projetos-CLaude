import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatarDuracao, formatarMoeda } from "../utils/formatar";
import { KpiTile } from "../components/KpiTile";
import { Meter } from "../components/charts/Meter";
import { BarraHorizontal, type ItemBarra } from "../components/charts/BarraHorizontal";
import {
  IconClipboard,
  IconClock,
  IconDollar,
  IconLayers,
  IconClipboardCheck,
  IconTarget,
  IconTruck,
} from "../components/icons";

interface DashboardGerencialData {
  transferenciasEmAberto: number;
  atrasadasPorOrigem: Array<{ nome: string; quantidade: number }>;
  atrasadasPorDestino: Array<{ nome: string; quantidade: number }>;
  tempoMedioFaturamentoCarregamentoHoras: number | null;
  tempoMedioTransitoHoras: number | null;
  tempoMedioSeparacaoHoras: number | null;
  tempoMedioConferenciaHoras: number | null;
  otifGeralPercentual: number | null;
  otifPorFilial: Array<{ nome: string; percentual: number; total: number }>;
  otifPorRota: Array<{ nome: string; percentual: number; total: number }>;
  rankingDivergenciasPorFilial: Array<{ nome: string; quantidade: number }>;
  rankingProdutosMaisDivergentes: Array<{ produto: string; quantidade: number }>;
  rankingTransportadoras: Array<{ transportadora: string; quantidade: number }>;
  valorFinanceiroTransferenciasPendentes: number;
  heatmapRotasCriticas: Array<{ rota: string; quantidadeAtrasos: number }>;
  valorPorRota: Array<{ rota: string; valor: number }>;
}

function paraInputDate(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function primeiroDiaMesAtual(): string {
  const hoje = new Date();
  return paraInputDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
}

function ultimoDiaMesAtual(): string {
  const hoje = new Date();
  return paraInputDate(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
}

function tomOtif(percentual: number): "ok" | "warn" | "danger" {
  if (percentual >= 90) return "ok";
  if (percentual >= 70) return "warn";
  return "danger";
}

function RankingCard({ titulo, itens, tomPadrao, vazio }: { titulo: string; itens: ItemBarra[]; tomPadrao?: "accent" | "danger"; vazio?: string }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{titulo}</h2>
      </div>
      <BarraHorizontal itens={itens} tomPadrao={tomPadrao} vazio={vazio} />
    </div>
  );
}

export function DashboardGerencial() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMesAtual);
  const [dataFim, setDataFim] = useState(ultimoDiaMesAtual);
  const [dados, setDados] = useState<DashboardGerencialData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    api
      .get<DashboardGerencialData>(`/dashboard/gerencial?${params.toString()}`)
      .then(setDados)
      .catch((err) => setErro(err.message));
  }, [dataInicio, dataFim]);

  if (erro) return <div className="error-box">{erro}</div>;
  if (!dados) return <p>Carregando...</p>;

  return (
    <div>
      <div className="dashboard-toolbar">
        <h1>Dashboard gerencial</h1>
        <div className="dashboard-toolbar__filtros">
          <div className="field-inline">
            <label htmlFor="dataInicio">De</label>
            <input id="dataInicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="field-inline">
            <label htmlFor="dataFim">Até</label>
            <input id="dataFim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="dashboard-gerencial-layout">
        <div>
          <div className="kpi-row">
            <KpiTile icone={<IconLayers />} tom="accent" valor={dados.transferenciasEmAberto} label="Em aberto" />
            <KpiTile
              icone={<IconTarget />}
              tom={dados.otifGeralPercentual === null ? "warn" : tomOtif(dados.otifGeralPercentual)}
              valor={dados.otifGeralPercentual === null ? "—" : `${dados.otifGeralPercentual.toFixed(1)}%`}
              label="OTIF geral"
            >
              <Meter percentual={dados.otifGeralPercentual} />
            </KpiTile>
            <KpiTile icone={<IconClock />} tom="accent" valor={formatarDuracao(dados.tempoMedioFaturamentoCarregamentoHoras)} label="Faturamento → carregamento" />
            <KpiTile icone={<IconTruck />} tom="accent" valor={formatarDuracao(dados.tempoMedioTransitoHoras)} label="Tempo em trânsito" />
            <KpiTile icone={<IconClipboard />} tom="accent" valor={formatarDuracao(dados.tempoMedioSeparacaoHoras)} label="Tempo de separação" />
            <KpiTile icone={<IconClipboardCheck />} tom="accent" valor={formatarDuracao(dados.tempoMedioConferenciaHoras)} label="Tempo de conferência" />
            <KpiTile
              icone={<IconDollar />}
              tom="accent"
              valor={dados.valorFinanceiroTransferenciasPendentes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              label="Valor pendente"
            />
          </div>

          <div className="rankings-grid">
            <RankingCard
              titulo="OTIF por filial"
              itens={dados.otifPorFilial.map((f) => ({
                label: f.nome,
                valor: f.percentual,
                valorExibido: `${f.percentual.toFixed(0)}% (${f.total})`,
                tom: tomOtif(f.percentual),
              }))}
            />
            <RankingCard
              titulo="OTIF por rota"
              itens={dados.otifPorRota.map((f) => ({
                label: f.nome,
                valor: f.percentual,
                valorExibido: `${f.percentual.toFixed(0)}% (${f.total})`,
                tom: tomOtif(f.percentual),
              }))}
            />
            <RankingCard
              titulo="Atrasadas por origem"
              tomPadrao="danger"
              itens={dados.atrasadasPorOrigem.map((f) => ({ label: f.nome, valor: f.quantidade }))}
            />
            <RankingCard
              titulo="Atrasadas por destino"
              tomPadrao="danger"
              itens={dados.atrasadasPorDestino.map((f) => ({ label: f.nome, valor: f.quantidade }))}
            />
            <RankingCard
              titulo="Filiais com mais divergências"
              tomPadrao="danger"
              itens={dados.rankingDivergenciasPorFilial.map((f) => ({ label: f.nome, valor: f.quantidade }))}
            />
            <RankingCard
              titulo="Produtos mais divergentes"
              tomPadrao="danger"
              itens={dados.rankingProdutosMaisDivergentes.map((f) => ({ label: f.produto, valor: f.quantidade }))}
            />
            <RankingCard
              titulo="Transportadoras mais usadas"
              tomPadrao="accent"
              itens={dados.rankingTransportadoras.map((f) => ({ label: f.transportadora, valor: f.quantidade }))}
            />
            <RankingCard
              titulo="Rotas críticas (mais atrasos)"
              tomPadrao="danger"
              itens={dados.heatmapRotasCriticas.map((f) => ({ label: f.rota, valor: f.quantidadeAtrasos }))}
            />
          </div>
        </div>

        <aside className="dashboard-gerencial-sidebar">
          <h2>Valor por rota</h2>
          {dados.valorPorRota.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Sem dados no período.</p>
          ) : (
            dados.valorPorRota.map((r) => (
              <KpiTile key={r.rota} icone={<IconDollar />} tom="accent" valor={formatarMoeda(r.valor)} label={r.rota} />
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
