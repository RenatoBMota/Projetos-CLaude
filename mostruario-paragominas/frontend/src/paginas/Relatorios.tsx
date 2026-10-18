import { ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api, baixar, Pagina } from "../api";
import { data, dataHora, moeda, qtd, useFiliais } from "../formato";

// ---------------------------------------------------------------------------
// Filtros compartilhados (período, filial, fornecedor)
// ---------------------------------------------------------------------------

interface Filtros {
  inicio: string;
  fim: string;
  filial: string;
  fornecedor: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const diasAtras = (n: number) => iso(new Date(Date.now() - n * 86400000));

const PERIODOS: { rotulo: string; inicio: () => string }[] = [
  { rotulo: "30 dias", inicio: () => diasAtras(29) },
  { rotulo: "90 dias", inicio: () => diasAtras(89) },
  { rotulo: "Este mês", inicio: () => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) },
  { rotulo: "Este ano", inicio: () => `${new Date().getFullYear()}-01-01` },
];

const consulta = (f: Filtros, extra: Record<string, string> = {}) => {
  const q = new URLSearchParams({ inicio: f.inicio, fim: f.fim, ...extra });
  if (f.filial) q.set("filial_id", f.filial);
  if (f.fornecedor) q.set("fornecedor_id", f.fornecedor);
  return q.toString();
};

const pct = (v: number | null | undefined) =>
  v == null ? "—" : (Number(v) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

const horas = (h: number | null | undefined) => {
  if (h == null) return "—";
  const n = Number(h);
  return n < 48 ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h` : `${(n / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
};

export function Relatorios() {
  const filiais = useFiliais();
  const [fornecedores, setFornecedores] = useState<{ id: number; razao_social: string }[]>([]);
  const [f, setF] = useState<Filtros>({ inicio: diasAtras(89), fim: iso(new Date()), filial: "", fornecedor: "" });

  useEffect(() => {
    api<Pagina<{ id: number; razao_social: string }>>("/api/cadastros/fornecedores?ativos=true&limite=500").then((r) =>
      setFornecedores(r.itens),
    );
  }, []);

  const abas = [
    ["indicadores", "Indicadores"],
    ["exposicao", "Em exposição"],
    ["descarte", "Descarte e perda"],
    ["erp", "Lançar no ERP"],
    ["movimentacoes", "Movimentações"],
    ["requisicoes", "Requisições"],
    ["pendentes", "Aprovações pendentes"],
  ];

  return (
    <>
      <h1>Relatórios</h1>
      <nav className="abas sem-impressao">
        {abas.map(([to, rotulo]) => (
          <NavLink key={to} to={to}>
            {rotulo}
          </NavLink>
        ))}
      </nav>
      <div className="filtros sem-impressao">
        <label>
          De
          <input type="date" value={f.inicio} max={f.fim} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
        </label>
        <label>
          Até
          <input type="date" value={f.fim} min={f.inicio} onChange={(e) => setF({ ...f, fim: e.target.value })} />
        </label>
        <div className="atalhos">
          {PERIODOS.map((p) => (
            <button key={p.rotulo} className="link" onClick={() => setF({ ...f, inicio: p.inicio(), fim: iso(new Date()) })}>
              {p.rotulo}
            </button>
          ))}
        </div>
        {filiais.length > 1 && (
          <label>
            Filial
            <select value={f.filial} onChange={(e) => setF({ ...f, filial: e.target.value })}>
              <option value="">Todas</option>
              {filiais.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Fornecedor
          <select value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })}>
            <option value="">Todos</option>
            {fornecedores.map((x) => (
              <option key={x.id} value={x.id}>
                {x.razao_social}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Routes>
        <Route path="indicadores" element={<Indicadores f={f} />} />
        <Route path="exposicao" element={<Exposicao f={f} />} />
        <Route
          path="descarte"
          element={
            <>
              <TabelaRelatorio nome="descarte_perda" f={f} />
              <TabelaRelatorio nome="motivos" f={f} barra="valor" />
            </>
          }
        />
        <Route path="erp" element={<TabelaRelatorio nome="lancar_erp" f={f} ajuda="Peças que voltaram em condição de uso no período, somadas por SKU, para dar entrada no ERP." />} />
        <Route path="movimentacoes" element={<TabelaRelatorio nome="movimentacoes" f={f} />} />
        <Route path="requisicoes" element={<TabelaRelatorio nome="requisicoes" f={f} />} />
        <Route path="pendentes" element={<TabelaRelatorio nome="aprovacoes_pendentes" f={f} />} />
        <Route path="*" element={<Navigate to="indicadores" replace />} />
      </Routes>
    </>
  );
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

interface Ind {
  solicitacoes: number;
  qtd_solicitada: number;
  valor_solicitado: number;
  qtd_expedida: number;
  valor_expedido: number;
  qtd_estoque: number;
  valor_estoque: number;
  qtd_descarte: number;
  valor_descarte: number;
  qtd_perda: number;
  valor_perda: number;
  em_exposicao: { quantidade: number; valor: number; itens: number; idade_media_dias: number | null };
  permanencia_media_dias: number | null;
  taxa_aprovacao_comercial: number | null;
  taxa_aprovacao_logistica: number | null;
  horas_aprovacao_comercial: number | null;
  horas_aprovacao_logistica: number | null;
  horas_ate_expedicao: number | null;
  taxa_reaproveitamento: number | null;
  taxa_descarte: number | null;
  taxa_perda: number | null;
  pendentes_aprovacao: number;
  pendentes_expedicao: number;
}

function Tile({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="cartao indicador">
      <span>{rotulo}</span>
      <b>{valor}</b>
      {detalhe && <small>{detalhe}</small>}
    </div>
  );
}

function Indicadores({ f }: { f: Filtros }) {
  const [d, setD] = useState<Ind | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    api<Ind>(`/api/relatorios/indicadores?${consulta(f)}`)
      .then(setD)
      .catch((e) => setErro(e.message));
  }, [f]);
  if (erro) return <div className="erro">{erro}</div>;
  if (!d) return <p className="sutil">Carregando…</p>;
  return (
    <>
      <p className="sutil impressao-periodo">
        Período: {data(f.inicio + "T12:00")} a {data(f.fim + "T12:00")}
      </p>
      <h2 className="secao">Agora</h2>
      <div className="indicadores">
        <Tile rotulo="Valor em exposição" valor={moeda(d.em_exposicao.valor)} detalhe={`${qtd(d.em_exposicao.quantidade)} unidades em ${d.em_exposicao.itens} item(ns)`} />
        <Tile rotulo="Idade média das amostras" valor={d.em_exposicao.idade_media_dias == null ? "—" : `${qtd(d.em_exposicao.idade_media_dias)} dias`} detalhe="desde a expedição" />
        <Tile rotulo="Aguardando aprovação" valor={d.pendentes_aprovacao} detalhe="requisições" />
        <Tile rotulo="Aguardando expedição" valor={d.pendentes_expedicao} detalhe="requisições" />
      </div>

      <h2 className="secao">Requisições no período</h2>
      <div className="indicadores">
        <Tile rotulo="Requisições enviadas" valor={d.solicitacoes} detalhe={`${moeda(d.valor_solicitado)} · ${qtd(d.qtd_solicitada)} unid.`} />
        <Tile rotulo="Aprovação comercial" valor={pct(d.taxa_aprovacao_comercial)} detalhe={`tempo médio ${horas(d.horas_aprovacao_comercial)}`} />
        <Tile rotulo="Aprovação logística" valor={pct(d.taxa_aprovacao_logistica)} detalhe={`tempo médio ${horas(d.horas_aprovacao_logistica)}`} />
        <Tile rotulo="Da aprovação à expedição" valor={horas(d.horas_ate_expedicao)} detalhe="tempo médio" />
      </div>

      <h2 className="secao">Movimentação no período</h2>
      <div className="indicadores">
        <Tile rotulo="Expedido" valor={moeda(d.valor_expedido)} detalhe={`${qtd(d.qtd_expedida)} unid.`} />
        <Tile rotulo="Voltou para estoque" valor={pct(d.taxa_reaproveitamento)} detalhe={`${qtd(d.qtd_estoque)} unid. · ${moeda(d.valor_estoque)}`} />
        <Tile rotulo="Descarte" valor={pct(d.taxa_descarte)} detalhe={`${qtd(d.qtd_descarte)} unid. · ${moeda(d.valor_descarte)}`} />
        <Tile rotulo="Perda" valor={pct(d.taxa_perda)} detalhe={`${qtd(d.qtd_perda)} unid. · ${moeda(d.valor_perda)}`} />
        <Tile rotulo="Permanência média" valor={d.permanencia_media_dias == null ? "—" : `${qtd(d.permanencia_media_dias)} dias`} detalhe="itens encerrados no período" />
      </div>
      <p className="sutil nota">
        Percentuais de estoque, descarte e perda são calculados sobre tudo o que foi devolvido ou dado como perdido no período.
      </p>

      <TabelaRelatorio nome="exposicao_filial" f={f} barra="valor" />
    </>
  );
}

function Exposicao({ f }: { f: Filtros }) {
  const [agrupar, setAgrupar] = useState("filial");
  return (
    <>
      <nav className="subabas sem-impressao">
        {[
          ["filial", "Por filial"],
          ["fornecedor", "Por fornecedor"],
          ["produto", "Por produto"],
          ["requisitante", "Por requisitante"],
        ].map(([v, r]) => (
          <button key={v} className={agrupar === v ? "ativa" : ""} onClick={() => setAgrupar(v)}>
            {r}
          </button>
        ))}
      </nav>
      <TabelaRelatorio key={agrupar} nome={`exposicao_${agrupar}`} f={f} barra="valor" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabela genérica com exportação
// ---------------------------------------------------------------------------

interface Coluna {
  campo: string;
  rotulo: string;
  tipo: "texto" | "qtd" | "moeda" | "data" | "datahora" | "pct" | "int";
}

interface Dados {
  titulo: string;
  usa_periodo: boolean;
  colunas: Coluna[];
  linhas: Record<string, unknown>[];
}

const NUMERICOS = new Set(["qtd", "moeda", "pct", "int"]);

function celula(v: unknown, tipo: Coluna["tipo"]) {
  if (v == null || v === "") return "—";
  switch (tipo) {
    case "moeda":
      return moeda(v);
    case "qtd":
      return qtd(v);
    case "int":
      return String(v);
    case "pct":
      return pct(Number(v));
    case "data":
      return data(v);
    case "datahora":
      return dataHora(v);
    default:
      return String(v);
  }
}

function TabelaRelatorio({ nome, f, barra, ajuda }: { nome: string; f: Filtros; barra?: string; ajuda?: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setD(null);
    api<Dados>(`/api/relatorios/${nome}?${consulta(f)}`)
      .then(setD)
      .catch((e) => setErro(e.message));
  }, [nome, f]);

  const exportar = (formato: "xlsx" | "csv") =>
    baixar(`/api/relatorios/${nome}?${consulta(f, { formato })}`, `${nome}_${f.fim}.${formato}`).catch((e) => setErro(e.message));

  const maximo = barra && d ? Math.max(0, ...d.linhas.map((l) => Number(l[barra] ?? 0))) : 0;
  const totais: Record<string, number> = {};
  if (d)
    for (const c of d.colunas)
      if (["moeda", "qtd", "int"].includes(c.tipo) && !/dias|idade/.test(c.campo))
        totais[c.campo] = d.linhas.reduce((t, l) => t + Number(l[c.campo] ?? 0), 0);

  return (
    <section className="cartao relatorio">
      <div className="barra">
        <h2>{d?.titulo ?? "…"}</h2>
        {d && !d.usa_periodo && <span className="selo">posição atual</span>}
        <span className="espaco" />
        <div className="botoes sem-impressao">
          <button onClick={() => exportar("xlsx")}>Excel</button>
          <button onClick={() => exportar("csv")}>CSV</button>
          <button onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>
      {ajuda && <p className="sutil nota">{ajuda}</p>}
      {erro && <div className="erro">{erro}</div>}
      {!d && !erro && <p className="sutil">Carregando…</p>}
      {d && (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                {d.colunas.map((c) => (
                  <th key={c.campo} className={NUMERICOS.has(c.tipo) ? "num" : ""}>
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.linhas.map((l, n) => (
                <tr key={n}>
                  {d.colunas.map((c) => (
                    <td key={c.campo} className={NUMERICOS.has(c.tipo) ? "num" : c.tipo === "datahora" ? "nowrap" : ""}>
                      {c.campo === barra && maximo > 0 ? (
                        <div className="barra-dado" title={`${l[d.colunas[0].campo]}: ${celula(l[c.campo], c.tipo)}`}>
                          <span>{celula(l[c.campo], c.tipo)}</span>
                          <i style={{ width: `${(Number(l[c.campo] ?? 0) / maximo) * 100}%` }} />
                        </div>
                      ) : (
                        celula(l[c.campo], c.tipo)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {d.linhas.length === 0 && (
                <tr>
                  <td colSpan={d.colunas.length} className="vazio">
                    Nada no período.
                  </td>
                </tr>
              )}
            </tbody>
            {d.linhas.length > 1 && Object.keys(totais).length > 0 && (
              <tfoot>
                <tr>
                  {d.colunas.map((c, i) => (
                    <td key={c.campo} className={NUMERICOS.has(c.tipo) ? "num" : ""}>
                      {i === 0 ? "Total" : c.campo in totais ? celula(totais[c.campo], c.tipo) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
