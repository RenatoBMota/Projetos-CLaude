/**
 * Gráficos do painel gerencial (Recharts).
 * Cores vêm dos tokens CSS (--serie-*, --seq-*), validados para daltonismo
 * e redefinidos no tema escuro.
 */
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { moeda, qtd } from "../formato";

const VARS = ["--serie-1", "--serie-2", "--serie-3", "--seq-1", "--seq-2", "--seq-3", "--seq-4", "--seq-5", "--superficie", "--sutil", "--grade", "--superficie-3"];

/** Lê as cores do tema atual e acompanha a troca claro/escuro. */
export function useCores() {
  const ler = () => {
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(VARS.map((v) => [v.slice(2), css.getPropertyValue(v).trim()])) as Record<string, string>;
  };
  const [cores, setCores] = useState(ler);
  useEffect(() => {
    const atualizar = () => setCores(ler());
    const obs = new MutationObserver(atualizar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", atualizar);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", atualizar);
    };
  }, []);
  return cores;
}

export const moedaCurta = (v: number) => {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (m: string) => {
  const [a, mes] = m.split("-");
  return `${MESES[Number(mes) - 1]}/${a.slice(2)}`;
};

function Dica({
  active,
  payload,
  label,
  formato,
  titulo,
}: TooltipProps<number, string> & { formato: (v: number) => string; titulo?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dica-grafico">
      <strong>{titulo ? titulo(String(label)) : label}</strong>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="linha-dica">
          <span>
            <i style={{ background: p.color }} />
            {p.name}
          </span>
          <b>{formato(Number(p.value))}</b>
        </div>
      ))}
    </div>
  );
}

const eixo = { tickLine: false, axisLine: false } as const;

// ---------------------------------------------------------------------------

export interface Mes {
  mes: string;
  requisicoes: number;
  expedido: number;
  estoque: number;
  descarte: number;
  perda: number;
}

/** Valor expedido x valor que retornou/foi baixado, por mês (barras agrupadas, um eixo). */
export function GraficoMensal({ dados }: { dados: Mes[] }) {
  const c = useCores();
  const linhas = dados.map((m) => ({
    mes: m.mes,
    Expedido: Number(m.expedido),
    Retornado: Number(m.estoque) + Number(m.descarte) + Number(m.perda),
  }));
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <BarChart data={linhas} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="mes" tickFormatter={rotuloMes} {...eixo} />
          <YAxis tickFormatter={moedaCurta} width={78} {...eixo} />
          <Tooltip cursor={{ fill: c["superficie-3"], opacity: 0.6 }} content={<Dica formato={moeda} titulo={rotuloMes} />} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12.5 }} />
          <Bar dataKey="Expedido" fill={c["serie-1"]} radius={[4, 4, 0, 0]} maxBarSize={34} />
          <Bar dataKey="Retornado" name="Retornado (estoque + descarte + perda)" fill={c["serie-2"]} radius={[4, 4, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DestinoFilial {
  filial: string;
  estoque: number;
  descarte: number;
  perda: number;
}

/** Destino das devoluções por filial, em % (barras 100% empilhadas). */
export function GraficoDestino({ dados }: { dados: DestinoFilial[] }) {
  const c = useCores();
  const linhas = dados.map((d) => {
    const total = Number(d.estoque) + Number(d.descarte) + Number(d.perda) || 1;
    return {
      filial: d.filial,
      Estoque: (Number(d.estoque) / total) * 100,
      Descarte: (Number(d.descarte) / total) * 100,
      Perda: (Number(d.perda) / total) * 100,
    };
  });
  const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return (
    <div className="grafico" style={{ height: Math.max(160, 70 + linhas.length * 44) }}>
      <ResponsiveContainer>
        <BarChart data={linhas} layout="vertical" barCategoryGap="30%" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={c.grade} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...eixo} />
          <YAxis type="category" dataKey="filial" width={110} {...eixo} />
          <Tooltip cursor={{ fill: c["superficie-3"], opacity: 0.6 }} content={<Dica formato={pct} />} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12.5 }} />
          <Bar dataKey="Estoque" stackId="d" fill={c["serie-3"]} stroke={c.superficie} strokeWidth={2} />
          <Bar dataKey="Descarte" stackId="d" fill={c["serie-2"]} stroke={c.superficie} strokeWidth={2} />
          <Bar dataKey="Perda" stackId="d" fill={c["serie-1"]} stroke={c.superficie} strokeWidth={2} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface Faixa {
  faixa: string;
  itens: number;
  valor: number;
}

/** Valor em exposição por idade (faixas ordenadas; mais antigo = mais escuro). */
export function GraficoIdade({ dados }: { dados: Faixa[] }) {
  const c = useCores();
  const tons = [c["seq-1"], c["seq-2"], c["seq-3"], c["seq-4"], c["seq-5"]];
  const linhas = dados.map((d) => ({ faixa: d.faixa, Valor: Number(d.valor), itens: d.itens }));
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <BarChart data={linhas} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="faixa" {...eixo} interval={0} tick={{ fontSize: 11.5 }} />
          <YAxis tickFormatter={moedaCurta} width={78} {...eixo} />
          <Tooltip
            cursor={{ fill: c["superficie-3"], opacity: 0.6 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="dica-grafico">
                  <strong>{label}</strong>
                  <div className="linha-dica">
                    <span>Valor</span>
                    <b>{moeda(Number(payload[0].value))}</b>
                  </div>
                  <div className="linha-dica">
                    <span>Itens</span>
                    <b>{payload[0].payload.itens}</b>
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="Valor" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {linhas.map((_, i) => (
              <Cell key={i} fill={tons[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranking em barras horizontais (um tom). */
export function GraficoRanking({
  dados,
  rotulo,
  valor,
  formato = moeda,
  nomeValor = "Valor",
}: {
  dados: Record<string, unknown>[];
  rotulo: string;
  valor: string;
  formato?: (v: number) => string;
  nomeValor?: string;
}) {
  const c = useCores();
  const linhas = dados.map((d) => ({ nome: String(d[rotulo]), [nomeValor]: Number(d[valor]) }));
  const curto = (s: string) => (s.length > 20 ? s.slice(0, 19) + "…" : s);
  return (
    <div className="grafico" style={{ height: Math.max(140, 40 + linhas.length * 34) }}>
      <ResponsiveContainer>
        <BarChart data={linhas} layout="vertical" barCategoryGap="24%" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={c.grade} />
          <XAxis type="number" tickFormatter={formato === moeda ? moedaCurta : (v) => qtd(v)} {...eixo} />
          <YAxis type="category" dataKey="nome" width={140} tickFormatter={curto} {...eixo} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip cursor={{ fill: c["superficie-3"], opacity: 0.6 }} content={<Dica formato={formato} />} />
          <Bar dataKey={nomeValor} fill={c["serie-1"]} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
