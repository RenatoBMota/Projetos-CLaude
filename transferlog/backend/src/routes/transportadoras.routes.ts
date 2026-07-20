import { Router } from "express";
import { z } from "zod";
import { Perfil } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requirePerfil } from "../middlewares/auth";

export const transportadorasRouter = Router();
transportadorasRouter.use(authenticate);

transportadorasRouter.get("/", async (_req, res) => {
  const transportadoras = await prisma.transportadora.findMany({ orderBy: { nome: "asc" } });
  res.json(transportadoras);
});

const transportadoraSchema = z.object({
  nome: z.string().trim().min(1),
  cnpj: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  ativa: z.boolean().optional(),
});

transportadorasRouter.post("/", requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR), async (req, res) => {
  const parsed = transportadoraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const transportadora = await prisma.transportadora.create({ data: parsed.data });
    res.status(201).json(transportadora);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

transportadorasRouter.patch("/:id", requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR), async (req, res) => {
  const parsed = transportadoraSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const transportadora = await prisma.transportadora.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(transportadora);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});
