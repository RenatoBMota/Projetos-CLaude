import type { Tom } from "../KpiTile";

export interface ItemBarra {
  label: string;
  valor: number;
  valorExibido?: string;
  tom?: Tom;
}

interface BarraHorizontalProps {
  itens: ItemBarra[];
  tomPadrao?: Tom;
  vazio?: string;
}

/**
 * Ranking de magnitude em barras horizontais. Uma única cor por barra (tom),
 * fim arredondado (4px) na ponta, reto na base — nunca a base inteira.
 * O valor sempre fica visível ao lado da barra (nunca só na cor).
 */
export function BarraHorizontal({ itens, tomPadrao = "accent", vazio = "Sem dados" }: BarraHorizontalProps) {
  if (itens.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>{vazio}</p>;
  }

  const maxValor = Math.max(...itens.map((i) => i.valor), 1);

  return (
    <div className="barra-lista">
      {itens.map((item) => {
        const largura = Math.max((item.valor / maxValor) * 100, item.valor > 0 ? 3 : 0);
        const tom = item.tom ?? tomPadrao;
        return (
          <div className="barra-linha" key={item.label} title={`${item.label}: ${item.valorExibido ?? item.valor}`}>
            <div className="barra-linha__label">{item.label}</div>
            <div className="barra-linha__trilho">
              <div className={`barra-linha__fill barra-linha__fill--${tom}`} style={{ width: `${largura}%` }} />
            </div>
            <div className="barra-linha__valor">{item.valorExibido ?? item.valor}</div>
          </div>
        );
      })}
    </div>
  );
}
