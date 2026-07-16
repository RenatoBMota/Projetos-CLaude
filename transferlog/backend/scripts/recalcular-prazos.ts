import { PrismaClient } from "@prisma/client";
import { calcularPrazoPrevisto } from "../src/services/unidadeService";

const prisma = new PrismaClient();

/**
 * Recalcula o prazoPrevisto de TODAS as transferências (inclusive já
 * finalizadas) usando o SLA de rota e a regra de cálculo atuais. Necessário
 * tanto quando uma RotaSLA é alterada depois que transferências já foram
 * criadas quanto quando a própria fórmula do prazo muda (ex.: passou a
 * considerar dias úteis e horário fixo de 18h) — nesse segundo caso é
 * importante recalcular também as já finalizadas, porque o OTIF (On Time) é
 * apurado comparando dataRecebimento com prazoPrevisto toda vez que o
 * indicador é consultado, não fica travado no valor de quando foi conferida.
 */
async function main() {
  const todas = await prisma.transferencia.findMany();

  let atualizadas = 0;
  for (const t of todas) {
    const novoPrazo = await calcularPrazoPrevisto(t.origemId, t.destinoId, t.dataPedido);
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

  console.log(`Concluído. ${todas.length} transferências verificadas, ${atualizadas} atualizadas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
