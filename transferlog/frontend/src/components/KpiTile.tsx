import type { ReactNode } from "react";

export type Tom = "accent" | "ok" | "warn" | "danger";

interface KpiTileProps {
  icone: ReactNode;
  valor: ReactNode;
  label: string;
  tom?: Tom;
  children?: ReactNode;
}

export function KpiTile({ icone, valor, label, tom = "accent", children }: KpiTileProps) {
  return (
    <div className={`kpi-tile kpi-tile--${tom}`}>
      <div className="kpi-tile__icon">{icone}</div>
      <div className="kpi-tile__body">
        <div className="kpi-tile__value">{valor}</div>
        <div className="kpi-tile__label">{label}</div>
        {children}
      </div>
    </div>
  );
}
