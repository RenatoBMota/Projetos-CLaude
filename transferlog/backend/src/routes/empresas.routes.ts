import { Router } from "express";
import { z } from "zod";
import { Perfil } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requirePerfil } from "../middlewares/auth";

export const empresasRouter = Router();
empresasRouter.use(authenticate);

empresasRouter.get("/", async (_req, res) => {
  const empresas = await prisma.empresa.findMany({ orderBy: { razaoSocial: "asc" } });
  res.json(empresas);
});

const empresaSchema = z.object({
  razaoSocial: z.string().min(1),
  cnpjMatriz: z.string().min(11),
});

empresasRouter.post("/", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const parsed = empresaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const empresa = await prisma.empresa.create({ data: parsed.data });
    res.status(201).json(empresa);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});
