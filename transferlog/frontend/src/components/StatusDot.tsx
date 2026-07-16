/** Bolinha verde/vermelha/neutra pra indicar rapidamente se uma meta (On Time, In Full) foi atingida. */
export function StatusDot({ valor, titulo }: { valor: boolean | null | undefined; titulo: string }) {
  const cor = valor === true ? "var(--ok)" : valor === false ? "var(--danger)" : "var(--border)";
  const texto = valor === true ? "Sim" : valor === false ? "Não" : "Ainda não apurado";
  return (
    <span
      title={`${titulo}: ${texto}`}
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: cor,
      }}
    />
  );
}
