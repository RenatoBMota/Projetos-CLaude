import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatarDuracao } from "../utils/formatar";

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
}

function Ranking({ titulo, itens }: { titulo: string; itens: Array<{ label: string; valor: string | number }> }) {
  return (
    <div className="card">
      <h2>{titulo}</h2>
      {itens.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Sem dados</p>
      ) : (
        <table>
          <tbody>
            {itens.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{item.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function DashboardGerencial() {
  const [dados, setDados] = useState<DashboardGerencialData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardGerencialData>("/dashboard/gerencial")
      .then(setDados)
      .catch((err) => setErro(err.message));
  }, []);

  if (erro) return <div className="error-box">{erro}</div>;
  if (!dados) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Dashboard gerencial</h1>
      <div className="kpi-row">
        <div className="kpi">
          <div className="value">{dados.transferenciasEmAberto}</div>
          <div className="label">Em aberto</div>
        </div>
        <div className="kpi">
          <div className="value">{dados.otifGeralPercentual === null ? "—" : `${dados.otifGeralPercentual.toFixed(1)}%`}</div>
          <div className="label">OTIF geral</div>
        </div>
        <div className="kpi">
          <div className="value">{formatarDuracao(dados.tempoMedioFaturamentoCarregamentoHoras)}</div>
          <div className="label">Faturamento → carregamento</div>
        </div>
        <div className="kpi">
          <div className="value">{formatarDuracao(dados.tempoMedioTransitoHoras)}</div>
          <div className="label">Tempo em trânsito</div>
        </div>
        <div className="kpi">
          <div className="value">{formatarDuracao(dados.tempoMedioSeparacaoHoras)}</div>
          <div className="label">Tempo de separação</div>
        </div>
        <div className="kpi">
          <div className="value">{formatarDuracao(dados.tempoMedioConferenciaHoras)}</div>
          <div className="label">Tempo de conferência</div>
        </div>
        <div className="kpi">
          <div className="value">
            {dados.valorFinanceiroTransferenciasPendentes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div className="label">Valor pendente</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Ranking
          titulo="OTIF por filial"
          itens={dados.otifPorFilial.map((f) => ({ label: f.nome, valor: `${f.percentual.toFixed(0)}% (${f.total})` }))}
        />
        <Ranking
          titulo="OTIF por rota"
          itens={dados.otifPorRota.map((f) => ({ label: f.nome, valor: `${f.percentual.toFixed(0)}% (${f.total})` }))}
        />
        <Ranking
          titulo="Atrasadas por origem"
          itens={dados.atrasadasPorOrigem.map((f) => ({ label: f.nome, valor: f.quantidade }))}
        />
        <Ranking
          titulo="Atrasadas por destino"
          itens={dados.atrasadasPorDestino.map((f) => ({ label: f.nome, valor: f.quantidade }))}
        />
        <Ranking
          titulo="Filiais com mais divergências"
          itens={dados.rankingDivergenciasPorFilial.map((f) => ({ label: f.nome, valor: f.quantidade }))}
        />
        <Ranking
          titulo="Produtos mais divergentes"
          itens={dados.rankingProdutosMaisDivergentes.map((f) => ({ label: f.produto, valor: f.quantidade }))}
        />
        <Ranking
          titulo="Transportadoras mais usadas"
          itens={dados.rankingTransportadoras.map((f) => ({ label: f.transportadora, valor: f.quantidade }))}
        />
        <Ranking
          titulo="Rotas críticas (mais atrasos)"
          itens={dados.heatmapRotasCriticas.map((f) => ({ label: f.rota, valor: f.quantidadeAtrasos }))}
        />
      </div>
    </div>
  );
}
