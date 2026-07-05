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

export async function calcularPrazoPrevisto(
  origemId: string,
  destinoId: string,
  dataBase: Date,
): Promise<Date> {
  const rota = await prisma.rotaSLA.findUnique({
    where: { origemId_destinoId: { origemId, destinoId } },
  });
  const prazoHoras = rota?.prazoHoras ?? SLA_PADRAO_HORAS;
  return new Date(dataBase.getTime() + prazoHoras * 60 * 60 * 1000);
}
