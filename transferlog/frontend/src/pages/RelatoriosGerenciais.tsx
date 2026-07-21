import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatarData, formatarDuracao, formatarMoeda } from "../utils/formatar";

interface CustoFreteItem {
  nome: string;
  valorTotal: number;
  quantidade: number;
  valorMedio: number;
}

interface CustoFreteData {
  porRota: CustoFreteItem[];
  porTransportadora: CustoFreteItem[];
}

interface PerformanceTransportadora {
  transportadora: string;
  totalTransferencias: number;
  onTimePercentual: number | null;
  atrasoMedioHoras: number | null;
  qtdTratativas: number;
  qtdDevolucoes: number;
}

interface DivergenciaRecorrente {
  produtoFilial: string;
  ocorrencias: number;
  qtdDivergente: number;
  ultimaOcorrencia: string;
}

interface AgingTratativa {
  id: string;
  numeroNF: string;
  numeroPedido: string;
  origem: string;
  destino: string;
  status: string;
  responsavel: string | null;
  prazo: string | null;
  diasEmAberto: number | null;
}

interface ResumoPrioridade {
  quantidade: number;
  valorFreteMedio: number | null;
  otifPercentual: number | null;
}

interface UrgenciasData {
  urgentes: ResumoPrioridade;
  normais: ResumoPrioridade;
  percentualUrgentes: number;
}

interface MotivoDevolucao {
  motivo: string;
  ocorrencias: number;
  quantidadeTotal: number;
}

interface MotivosDevolucaoData {
  totalDevolucoes: number;
  porMotivo: MotivoDevolucao[];
}

const LABEL_MOTIVO: Record<string, string> = {
  FALTOU: "Faltou",
  SOBROU: "Sobrou",
  QUEBRADO: "Quebrado",
  PRODUTO_ERRADO: "Produto errado",
  "Não identificado": "Não identificado",
};

const LABEL_STATUS_TRATATIVA: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
};

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

function TabelaVazia({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ color: "var(--text-muted)" }}>Sem dados no período.</td>
    </tr>
  );
}

export function RelatoriosGerenciais() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMesAtual);
  const [dataFim, setDataFim] = useState(ultimoDiaMesAtual);

  const [custoFrete, setCustoFrete] = useState<CustoFreteData | null>(null);
  const [performance, setPerformance] = useState<PerformanceTransportadora[] | null>(null);
  const [divergencias, setDivergencias] = useState<DivergenciaRecorrente[] | null>(null);
  const [aging, setAging] = useState<AgingTratativa[] | null>(null);
  const [urgencias, setUrgencias] = useState<UrgenciasData | null>(null);
  const [devolucoes, setDevolucoes] = useState<MotivosDevolucaoData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const qs = params.toString();

    Promise.all([
      api.get<CustoFreteData>(`/relatorios-gerenciais/custo-frete?${qs}`),
      api.get<PerformanceTransportadora[]>(`/relatorios-gerenciais/performance-transportadoras?${qs}`),
      api.get<DivergenciaRecorrente[]>(`/relatorios-gerenciais/divergencias-recorrentes?${qs}`),
      api.get<AgingTratativa[]>("/relatorios-gerenciais/aging-tratativas"),
      api.get<UrgenciasData>(`/relatorios-gerenciais/urgencias?${qs}`),
      api.get<MotivosDevolucaoData>(`/relatorios-gerenciais/motivos-devolucao?${qs}`),
    ])
      .then(([cf, perf, div, ag, urg, dev]) => {
        setCustoFrete(cf);
        setPerformance(perf);
        setDivergencias(div);
        setAging(ag);
        setUrgencias(urg);
        setDevolucoes(dev);
      })
      .catch((err) => setErro(err.message));
  }, [dataInicio, dataFim]);

  if (erro) return <div className="error-box">{erro}</div>;

  return (
    <div>
      <div className="dashboard-toolbar">
        <h1>Relatórios gerenciais</h1>
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

      <div className="card">
        <h2>Custo de frete por rota</h2>
        <table>
          <thead>
            <tr><th>Rota</th><th>Qtd. transferências</th><th>Custo total</th><th>Custo médio</th></tr>
          </thead>
          <tbody>
            {!custoFrete ? (
              <tr><td colSpan={4}>Carregando...</td></tr>
            ) : custoFrete.porRota.length === 0 ? (
              <TabelaVazia colSpan={4} />
            ) : (
              custoFrete.porRota.map((r) => (
                <tr key={r.nome}>
                  <td>{r.nome}</td>
                  <td>{r.quantidade}</td>
                  <td>{formatarMoeda(r.valorTotal)}</td>
                  <td>{formatarMoeda(r.valorMedio)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Custo de frete por transportadora</h2>
        <table>
          <thead>
            <tr><th>Transportadora</th><th>Qtd. transferências</th><th>Custo total</th><th>Custo médio</th></tr>
          </thead>
          <tbody>
            {!custoFrete ? (
              <tr><td colSpan={4}>Carregando...</td></tr>
            ) : custoFrete.porTransportadora.length === 0 ? (
              <TabelaVazia colSpan={4} />
            ) : (
              custoFrete.porTransportadora.map((r) => (
                <tr key={r.nome}>
                  <td>{r.nome}</td>
                  <td>{r.quantidade}</td>
                  <td>{formatarMoeda(r.valorTotal)}</td>
                  <td>{formatarMoeda(r.valorMedio)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Performance por transportadora</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
          Apoia decisão de manter, renegociar ou trocar transportadora.
        </p>
        <table>
          <thead>
            <tr>
              <th>Transportadora</th><th>Total</th><th>On Time</th><th>Atraso médio</th>
              <th>Tratativas geradas</th><th>Devoluções geradas</th>
            </tr>
          </thead>
          <tbody>
            {!performance ? (
              <tr><td colSpan={6}>Carregando...</td></tr>
            ) : performance.length === 0 ? (
              <TabelaVazia colSpan={6} />
            ) : (
              performance.map((p) => (
                <tr key={p.transportadora}>
                  <td>{p.transportadora}</td>
                  <td>{p.totalTransferencias}</td>
                  <td>{p.onTimePercentual === null ? "—" : `${p.onTimePercentual.toFixed(0)}%`}</td>
                  <td>{formatarDuracao(p.atrasoMedioHoras)}</td>
                  <td>{p.qtdTratativas}</td>
                  <td>{p.qtdDevolucoes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Divergências recorrentes</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
          Produto + filial de origem com mais ocorrências de sobra/falta/quebra — indício de problema de processo, não acaso.
        </p>
        <table>
          <thead>
            <tr><th>Produto (filial de origem)</th><th>Ocorrências</th><th>Qtd. divergente acumulada</th><th>Última ocorrência</th></tr>
          </thead>
          <tbody>
            {!divergencias ? (
              <tr><td colSpan={4}>Carregando...</td></tr>
            ) : divergencias.length === 0 ? (
              <TabelaVazia colSpan={4} />
            ) : (
              divergencias.map((d) => (
                <tr key={d.produtoFilial}>
                  <td>{d.produtoFilial}</td>
                  <td>{d.ocorrencias}</td>
                  <td>{d.qtdDivergente}</td>
                  <td>{formatarData(d.ultimaOcorrencia)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Tratativas em aberto (aging)</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
          Não depende do filtro de período — mostra tudo que ainda está pendente hoje.
        </p>
        <table>
          <thead>
            <tr><th>NF</th><th>Pedido</th><th>Origem → Destino</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Dias em aberto</th></tr>
          </thead>
          <tbody>
            {!aging ? (
              <tr><td colSpan={7}>Carregando...</td></tr>
            ) : aging.length === 0 ? (
              <TabelaVazia colSpan={7} />
            ) : (
              aging.map((t) => (
                <tr key={t.id}>
                  <td>{t.numeroNF}</td>
                  <td>{t.numeroPedido}</td>
                  <td>{t.origem} → {t.destino}</td>
                  <td>{LABEL_STATUS_TRATATIVA[t.status] ?? t.status}</td>
                  <td>{t.responsavel ?? "Ninguém assumiu ainda"}</td>
                  <td>{t.prazo ? formatarData(t.prazo) : "—"}</td>
                  <td>{t.diasEmAberto ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Urgências: frequência e custo</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
          Se o percentual de urgentes for alto, pode valer investir em estoque de segurança para reduzir a necessidade de urgência.
        </p>
        <table>
          <thead>
            <tr><th>Prioridade</th><th>Qtd. transferências</th><th>Frete médio</th><th>OTIF</th></tr>
          </thead>
          <tbody>
            {!urgencias ? (
              <tr><td colSpan={4}>Carregando...</td></tr>
            ) : (
              <>
                <tr>
                  <td>Urgente ({urgencias.percentualUrgentes.toFixed(1)}% do período)</td>
                  <td>{urgencias.urgentes.quantidade}</td>
                  <td>{urgencias.urgentes.valorFreteMedio === null ? "—" : formatarMoeda(urgencias.urgentes.valorFreteMedio)}</td>
                  <td>{urgencias.urgentes.otifPercentual === null ? "—" : `${urgencias.urgentes.otifPercentual.toFixed(0)}%`}</td>
                </tr>
                <tr>
                  <td>Normal</td>
                  <td>{urgencias.normais.quantidade}</td>
                  <td>{urgencias.normais.valorFreteMedio === null ? "—" : formatarMoeda(urgencias.normais.valorFreteMedio)}</td>
                  <td>{urgencias.normais.otifPercentual === null ? "—" : `${urgencias.normais.otifPercentual.toFixed(0)}%`}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Motivos de devolução</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
          {devolucoes ? `${devolucoes.totalDevolucoes} devolução(ões) criada(s) no período.` : ""}
          {" "}Por volume (quantidade de itens) — o sistema ainda não rastreia valor unitário por item.
        </p>
        <table>
          <thead>
            <tr><th>Motivo original</th><th>Ocorrências</th><th>Quantidade total</th></tr>
          </thead>
          <tbody>
            {!devolucoes ? (
              <tr><td colSpan={3}>Carregando...</td></tr>
            ) : devolucoes.porMotivo.length === 0 ? (
              <TabelaVazia colSpan={3} />
            ) : (
              devolucoes.porMotivo.map((m) => (
                <tr key={m.motivo}>
                  <td>{LABEL_MOTIVO[m.motivo] ?? m.motivo}</td>
                  <td>{m.ocorrencias}</td>
                  <td>{m.quantidadeTotal}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
