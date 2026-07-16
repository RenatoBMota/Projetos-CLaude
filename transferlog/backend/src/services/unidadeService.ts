import { prisma } from "../prisma";

const SLA_PADRAO_HORAS = 24;

export function nomeUnidade(unidade: { razaoSocial: string; nomeFantasia: string | null }): string {
  return unidade.nomeFantasia || unidade.razaoSocial;
}

export async function resolverUnidadePorCnpj(cnpj: string) {
  const unidade = await prisma.unidade.findUnique({ where: { cnpj } });
  if (!unidade) {
    throw new Error(`Nenhuma unidade cadastrada com o CNPJ ${cnpj}`);
  }
  if (!unidade.ativa) {
    throw new Error(`Unidade ${nomeUnidade(unidade)} está inativa`);
  }
  return unidade;
}

export async function obterPrazoHoras(origemId: string, destinoId: string): Promise<number> {
  const rota = await prisma.rotaSLA.findUnique({
    where: { origemId_destinoId: { origemId, destinoId } },
  });
  return rota?.prazoHoras ?? SLA_PADRAO_HORAS;
}

// Brasília é UTC-3 fixo (sem horário de verão desde 2019) — usamos esse
// deslocamento constante pra fazer aritmética de dia-útil sem depender do
// timezone do processo Node (que roda em UTC nos containers).
const DESLOCAMENTO_BRASILIA_HORAS = -3;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

function ehFimDeSemana(diaDaSemana: number): boolean {
  return diaDaSemana === 0 || diaDaSemana === 6;
}

/**
 * prazoHoras (configurado por rota, em horas) é interpretado como quantidade
 * de dias úteis (24h = 1 dia útil). O prazo sempre cai às 18h (horário de
 * Brasília) do dia útil final — sábados e domingos nunca contam como dia
 * útil nem como data de vencimento.
 */
export function calcularPrazoPrevistoData(dataBase: Date, prazoHoras: number): Date {
  const diasUteis = Math.max(1, Math.round(prazoHoras / 24));

  let cursor = new Date(dataBase.getTime() + DESLOCAMENTO_BRASILIA_HORAS * 60 * 60 * 1000);
  let restantes = diasUteis;
  while (restantes > 0) {
    cursor = new Date(cursor.getTime() + UM_DIA_MS);
    if (!ehFimDeSemana(cursor.getUTCDay())) {
      restantes--;
    }
  }

  cursor.setUTCHours(18, 0, 0, 0);
  return new Date(cursor.getTime() - DESLOCAMENTO_BRASILIA_HORAS * 60 * 60 * 1000);
}

export async function calcularPrazoPrevisto(
  origemId: string,
  destinoId: string,
  dataBase: Date,
): Promise<Date> {
  const prazoHoras = await obterPrazoHoras(origemId, destinoId);
  return calcularPrazoPrevistoData(dataBase, prazoHoras);
}
