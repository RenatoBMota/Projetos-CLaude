import { Perfil, PrismaClient } from "@prisma/client";
import { hashSenha } from "../src/services/authService";

const prisma = new PrismaClient();

/**
 * Cria só o usuário administrador. Nenhuma unidade/rota de exemplo — o
 * cadastro real é feito pela tela de Cadastros.
 */
async function main() {
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

  console.log("Seed concluído: usuário admin criado.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
