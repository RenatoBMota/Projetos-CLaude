import {
  Activity,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Hourglass,
  PackageX,
  Printer,
  Recycle,
  Store,
  Timer,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api, baixar, Pagina } from "../api";
import { useVersao } from "../componentes/atualizacao";
import { Cabecalho, Carregando, Indicador, Vazio } from "../componentes/ui";
import { data, dataHora, moeda, qtd, STATUS, useFiliais } from "../formato";
import { GraficoDestino, GraficoIdade, GraficoMensal, GraficoRanking, type DestinoFilial, type Faixa, type Mes } from "./Graficos";

// ---------------------------------------------------------------------------
// Filtros compartilhados (período, filial, fornecedor)
// ---------------------------------------------------------------------------

interface Filtros {
  inicio: string;
  fim: string;
  filial: string;
  fornecedor: string;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diasAtras = (n: number) => iso(new Date(Date.now() - n * 86400000));

const PERIODOS: { rotulo: string; inicio: () => string }[] = [
  { rotulo: "30 dias", inicio: () => diasAtras(29) },
  { rotulo: "90 dias", inicio: () => diasAtras(89) },
  { rotulo: "6 meses", inicio: () => iso(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)) },
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
  return n < 48
    ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`
    : `${(n / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
};

export function Relatorios() {
  const filiais = useFiliais();
  const [fornecedores, setFornecedores] = useState<{ id: number; razao_social: string }[]>([]);
  const [f, setF] = useState<Filtros>({ inicio: iso(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)), fim: iso(new Date()), filial: "", fornecedor: "" });

  useEffect(() => {
    api<Pagina<{ id: number; razao_social: string }>>("/api/cadastros/fornecedores?ativos=true&limite=500").then((r) => setFornecedores(r.itens));
  }, []);

  const abas: [string, string, typeof BarChart3][] = [
    ["painel", "Painel gerencial", BarChart3],
    ["exposicao", "Em exposição", Store],
    ["descarte", "Descarte e perda", Trash2],
    ["reintegrado", "Reintegrado ao estoque", FileSpreadsheet],
    ["movimentacoes", "Movimentações", Activity],
    ["requisicoes", "Requisições", ClipboardList],
    ["pendentes", "Aprovações pendentes", Hourglass],
  ];

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        subtitulo="Indicadores e relatórios gerenciais das amostras."
        acoes={
          <button className="sem-impressao" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        }
      />
      <nav className="abas sem-impressao">
        {abas.map(([to, rotulo, Icone]) => (
          <NavLink key={to} to={to}>
            <Icone size={16} /> {rotulo}
          </NavLink>
        ))}
      </nav>
      <div className="filtros sem-impressao">
        <label>
          De
          <input type="date" value={f.inicio} max={f.fim} onChange={(e) => e.target.value && setF({ ...f, inicio: e.target.value })} />
        </label>
        <label>
          Até
          <input type="date" value={f.fim} min={f.inicio} onChange={(e) => e.target.value && setF({ ...f, fim: e.target.value })} />
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
      <p className="impressao-periodo sutil">
        Período: {data(f.inicio + "T12:00")} a {data(f.fim + "T12:00")}
      </p>
      <Routes>
        <Route path="painel" element={<Painel f={f} />} />
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
        <Route
          path="reintegrado"
          element={
            <TabelaRelatorio
              nome="reintegrado_estoque"
              f={f}
              ajuda="Peças que voltaram em condição de uso e foram reintegradas ao estoque no período, somadas por SKU."
            />
          }
        />
        <Route path="movimentacoes" element={<TabelaRelatorio nome="movimentacoes" f={f} />} />
        <Route path="requisicoes" element={<TabelaRelatorio nome="requisicoes" f={f} />} />
        <Route path="pendentes" element={<TabelaRelatorio nome="aprovacoes_pendentes" f={f} />} />
        <Route path="*" element={<Navigate to="painel" replace />} />
      </Routes>
    </>
  );
}

// ---------------------------------------------------------------------------
// Painel gerencial
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

interface Gerencial {
  mensal: Mes[];
  destino_filial: DestinoFilial[];
  aging: Faixa[];
  exposicao_filial: { filial: string; valor: number; quantidade: number }[];
  top_produtos: { sku: string; descricao: string; valor: number; quantidade: number }[];
  top_requisitantes: { requisitante: string; requisicoes: number; valor: number }[];
  status: { status: string; n: number }[];
}

function Grafico({ titulo, subtitulo, children, vazio }: { titulo: string; subtitulo?: string; children: ReactNode; vazio?: boolean }) {
  return (
    <section className="cartao">
      <div className="cartao-cabecalho">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
      </div>
      {vazio ? <Vazio icone={BarChart3} titulo="Sem dados no período" /> : children}
    </section>
  );
}

function Painel({ f }: { f: Filtros }) {
  const [d, setD] = useState<Ind | null>(null);
  const [g, setG] = useState<Gerencial | null>(null);
  const [erro, setErro] = useState("");
  const versao = useVersao();
  useEffect(() => {
    setD(null);
    setG(null);
  }, [f]);
  useEffect(() => {
    api<Ind>(`/api/relatorios/indicadores?${consulta(f)}`)
      .then(setD)
      .catch((e) => setErro(e.message));
    api<Gerencial>(`/api/relatorios/gerencial?${consulta(f)}`)
      .then(setG)
      .catch((e) => setErro(e.message));
  }, [f, versao]);
  if (erro) return <div className="erro">{erro}</div>;
  if (!d || !g)
    return (
      <div className="cartao">
        <Carregando linhas={6} />
      </div>
    );

  const semMov = g.mensal.every((m) => !Number(m.expedido) && !Number(m.estoque) && !Number(m.descarte) && !Number(m.perda));
  const statusOrdenado = [...g.status]
    .sort((a, b) => b.n - a.n)
    .map((s) => ({ status: STATUS[s.status]?.rotulo ?? s.status, n: s.n }));

  return (
    <>
      <div className="indicadores">
        <Indicador
          icone={Wallet}
          rotulo="Valor em exposição"
          valor={moeda(d.em_exposicao.valor)}
          detalhe={`${qtd(d.em_exposicao.quantidade)} unid. em ${d.em_exposicao.itens} item(ns)`}
          destaque
        />
        <Indicador
          icone={CalendarClock}
          rotulo="Idade média das amostras"
          valor={d.em_exposicao.idade_media_dias == null ? "—" : `${qtd(d.em_exposicao.idade_media_dias)} dias`}
          detalhe={d.permanencia_media_dias == null ? "desde a expedição" : `permanência das encerradas: ${qtd(d.permanencia_media_dias)} dias`}
        />
        <Indicador icone={ClipboardList} rotulo="Requisições no período" valor={d.solicitacoes} detalhe={moeda(d.valor_solicitado)} />
        <Indicador icone={Truck} rotulo="Expedido no período" valor={moeda(d.valor_expedido)} detalhe={`${qtd(d.qtd_expedida)} unidades`} />
        <Indicador
          icone={Recycle}
          rotulo="Reaproveitamento"
          valor={pct(d.taxa_reaproveitamento)}
          detalhe={`${qtd(d.qtd_estoque)} unid. voltaram ao estoque`}
        />
        <Indicador
          icone={PackageX}
          rotulo="Descarte + perda"
          valor={moeda(Number(d.valor_descarte) + Number(d.valor_perda))}
          detalhe={`descarte ${pct(d.taxa_descarte)} · perda ${pct(d.taxa_perda)}`}
        />
        <Indicador
          icone={Timer}
          rotulo="Tempo de aprovação"
          valor={horas(
            d.horas_aprovacao_comercial == null && d.horas_aprovacao_logistica == null
              ? null
              : Number(d.horas_aprovacao_comercial ?? 0) + Number(d.horas_aprovacao_logistica ?? 0),
          )}
          detalhe={`comercial ${horas(d.horas_aprovacao_comercial)} · logística ${horas(d.horas_aprovacao_logistica)}`}
        />
        <Indicador
          icone={Boxes}
          rotulo="Pendências agora"
          valor={d.pendentes_aprovacao + d.pendentes_expedicao}
          detalhe={`${d.pendentes_aprovacao} em aprovação · ${d.pendentes_expedicao} a expedir · expedição em ${horas(d.horas_ate_expedicao)}`}
        />
      </div>

      <Grafico titulo="Evolução mensal" subtitulo="Valor expedido para as lojas e valor que retornou ou foi baixado." vazio={semMov}>
        <GraficoMensal dados={g.mensal} />
      </Grafico>

      <div className="grade-2" style={{ marginTop: 16 }}>
        <Grafico titulo="Destino das devoluções por filial" subtitulo="% das unidades devolvidas no período." vazio={!g.destino_filial.length}>
          <GraficoDestino dados={g.destino_filial} />
        </Grafico>
        <Grafico titulo="Idade das amostras em loja" subtitulo="Valor em exposição por tempo desde a expedição." vazio={g.aging.every((a) => !a.itens)}>
          <GraficoIdade dados={g.aging} />
        </Grafico>
      </div>

      <div className="grade-2" style={{ marginTop: 16 }}>
        <Grafico titulo="Valor em exposição por filial" subtitulo="Posição atual." vazio={!g.exposicao_filial.length}>
          <GraficoRanking dados={g.exposicao_filial} rotulo="filial" valor="valor" />
        </Grafico>
        <Grafico titulo="Produtos com mais valor em exposição" subtitulo="10 maiores, posição atual." vazio={!g.top_produtos.length}>
          <GraficoRanking dados={g.top_produtos} rotulo="descricao" valor="valor" />
        </Grafico>
      </div>

      <div className="grade-2" style={{ marginTop: 16 }}>
        <Grafico titulo="Requisitantes" subtitulo="Valor solicitado no período (10 maiores)." vazio={!g.top_requisitantes.length}>
          <GraficoRanking dados={g.top_requisitantes} rotulo="requisitante" valor="valor" />
        </Grafico>
        <Grafico titulo="Requisições por situação" subtitulo="Enviadas no período." vazio={!statusOrdenado.length}>
          <GraficoRanking dados={statusOrdenado} rotulo="status" valor="n" formato={(v) => String(v)} nomeValor="Requisições" />
        </Grafico>
      </div>
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
  const versao = useVersao();

  useEffect(() => setD(null), [nome, f]);
  useEffect(() => {
    api<Dados>(`/api/relatorios/${nome}?${consulta(f)}`)
      .then(setD)
      .catch((e) => setErro(e.message));
  }, [nome, f, versao]);

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
      <div className="cartao-cabecalho">
        <div>
          <h2>
            {d?.titulo ?? "…"} {d && !d.usa_periodo && <span className="selo">posição atual</span>}
          </h2>
          {ajuda && <p>{ajuda}</p>}
        </div>
        <div className="botoes sem-impressao">
          <button className="pequeno" onClick={() => exportar("xlsx")}>
            <Download size={14} /> Excel
          </button>
          <button className="pequeno" onClick={() => exportar("csv")}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>
      {erro && <div className="erro">{erro}</div>}
      {!d && !erro && <Carregando />}
      {d && d.linhas.length === 0 && <Vazio icone={BarChart3} titulo="Nada no período" texto="Ajuste as datas ou os filtros." />}
      {d && d.linhas.length > 0 && (
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
                    <td
                      key={c.campo}
                      className={NUMERICOS.has(c.tipo) ? "num" : c.tipo === "texto" ? "texto-longo" : ""}
                      title={c.tipo === "texto" && l[c.campo] ? String(l[c.campo]) : undefined}
                    >
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
