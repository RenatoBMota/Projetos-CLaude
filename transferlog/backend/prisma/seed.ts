import { Perfil, PrismaClient, TipoUnidade } from "@prisma/client";
import { hashSenha } from "../src/services/authService";

const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { cnpjMatriz: "03554020000000" },
    create: { razaoSocial: "Paragominas Home Center Ltda", cnpjMatriz: "03554020000000" },
    update: {},
  });

  const matriz = await prisma.unidade.upsert({
    where: { cnpj: "03554020006550" },
    create: {
      empresaId: empresa.id,
      nome: "CD Matriz",
      cnpj: "03554020006550",
      cidade: "Paragominas",
      uf: "PA",
      tipo: TipoUnidade.CD,
    },
    update: {},
  });

  const loja03 = await prisma.unidade.upsert({
    where: { cnpj: "03555402000140" },
    create: {
      empresaId: empresa.id,
      nome: "Loja 03",
      cnpj: "03555402000140",
      cidade: "Paragominas",
      uf: "PA",
      tipo: TipoUnidade.LOJA,
    },
    update: {},
  });

  await prisma.rotaSLA.upsert({
    where: { origemId_destinoId: { origemId: matriz.id, destinoId: loja03.id } },
    create: { origemId: matriz.id, destinoId: loja03.id, prazoHoras: 24 },
    update: { prazoHoras: 24 },
  });

  const senhaHash = await hashSenha("transferlog123");
  await prisma.usuario.upsert({
    where: { email: "admin@transferlog.com" },
    create: {
      nome: "Administrador",
      email: "admin@transferlog.com",
      senhaHash,
      perfil: Perfil.ADMINISTRADOR,
    },
    update: {},
  });

  console.log("Seed concluído: empresa, unidades, rota SLA e usuário admin criados.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
