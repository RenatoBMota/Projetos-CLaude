import { PrismaClient, StatusTransferencia } from "@prisma/client";
import { calcularPrazoPrevisto } from "../src/services/unidadeService";

const prisma = new PrismaClient();

/**
 * Recalcula o prazoPrevisto de transferências ainda abertas usando o SLA de
 * rota atual. Necessário quando uma RotaSLA é cadastrada/alterada depois que
 * transferências já foram criadas (o prazo é travado no momento da criação,
 * não recalculado automaticamente quando o SLA muda).
 */
const STATUS_ABERTO: StatusTransferencia[] = [
  "PENDENTE_SEPARACAO",
  "EM_SEPARACAO",
  "CARREGADO",
  "EM_TRANSITO",
  "RECEBIDO",
];

async function main() {
  const abertas = await prisma.transferencia.findMany({
    where: { status: { in: STATUS_ABERTO } },
  });

  let atualizadas = 0;
  for (const t of abertas) {
    const novoPrazo = await calcularPrazoPrevisto(t.origemId, t.destinoId, t.dataEmissao);
    if (novoPrazo.getTime() !== t.prazoPrevisto.getTime()) {
      await prisma.transferencia.update({
        where: { id: t.id },
        data: { prazoPrevisto: novoPrazo },
      });
      console.log(
        `NF ${t.numeroNF}/${t.serie}: prazo atualizado de ${t.prazoPrevisto.toISOString()} para ${novoPrazo.toISOString()}`,
      );
      atualizadas++;
    }
  }

  console.log(`Concluído. ${abertas.length} transferências verificadas, ${atualizadas} atualizadas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
