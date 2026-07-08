function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formata data e hora como DD/MM/AAAA HH:MM:SS. */
export function formatarDataHora(valor: string | Date): string {
  const date = typeof valor === "string" ? new Date(valor) : valor;
  const dia = pad(date.getDate());
  const mes = pad(date.getMonth() + 1);
  const ano = date.getFullYear();
  const hora = pad(date.getHours());
  const min = pad(date.getMinutes());
  const seg = pad(date.getSeconds());
  return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
}

/** Formata uma duração em horas decimais como HH:MM:SS. */
export function formatarDuracao(horasDecimais: number | null): string {
  if (horasDecimais === null) return "—";
  const totalSegundos = Math.round(horasDecimais * 3600);
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Formata um valor numérico (ou string decimal) como moeda BRL. */
export function formatarMoeda(valor: string | number): string {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
