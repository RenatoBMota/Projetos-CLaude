import type { Tom } from "../KpiTile";

interface MeterProps {
  percentual: number | null;
  meta?: number;
}

function tomPorPercentual(percentual: number): Tom {
  if (percentual >= 90) return "ok";
  if (percentual >= 70) return "warn";
  return "danger";
}

/** Medidor de uma razão contra um limite (ex.: OTIF %). Trilho neutro, preenchimento por severidade. */
export function Meter({ percentual, meta = 90 }: MeterProps) {
  if (percentual === null) {
    return <div className="meter meter--vazio" />;
  }
  const tom = tomPorPercentual(percentual);
  const largura = Math.min(Math.max(percentual, 0), 100);

  return (
    <div className="meter">
      <div className="meter__trilho">
        <div className={`meter__fill meter__fill--${tom}`} style={{ width: `${largura}%` }} />
        <div className="meter__meta" style={{ left: `${Math.min(meta, 100)}%` }} title={`Meta: ${meta}%`} />
      </div>
    </div>
  );
}
