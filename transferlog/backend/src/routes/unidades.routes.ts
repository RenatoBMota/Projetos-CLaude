import { Router } from "express";
import { z } from "zod";
import { Perfil, TipoUnidade } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requirePerfil } from "../middlewares/auth";

export const unidadesRouter = Router();
unidadesRouter.use(authenticate);

unidadesRouter.get("/", async (_req, res) => {
  const unidades = await prisma.unidade.findMany({ orderBy: { razaoSocial: "asc" } });
  res.json(unidades);
});

const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos");

const unidadeSchema = z.object({
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().optional(),
  cnpj: cnpjSchema,
  tipo: z.nativeEnum(TipoUnidade),
  ativa: z.boolean().optional(),
});

unidadesRouter.post("/", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const parsed = unidadeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const unidade = await prisma.unidade.create({ data: parsed.data });
    res.status(201).json(unidade);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

unidadesRouter.patch("/:id", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const parsed = unidadeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const unidade = await prisma.unidade.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(unidade);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

unidadesRouter.delete("/:id", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  try {
    await prisma.unidade.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({
      error: "Não é possível excluir: existem transferências ou vínculos associados a esta unidade. Marque como inativa em vez de excluir.",
    });
  }
});

const rotaSlaSchema = z.object({
  origemId: z.string(),
  destinoId: z.string(),
  prazoHoras: z.number().int().positive(),
});

unidadesRouter.post("/rotas-sla", requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR), async (req, res) => {
  const parsed = rotaSlaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const rota = await prisma.rotaSLA.upsert({
    where: {
      origemId_destinoId: {
        origemId: parsed.data.origemId,
        destinoId: parsed.data.destinoId,
      },
    },
    create: parsed.data,
    update: { prazoHoras: parsed.data.prazoHoras },
  });
  res.status(201).json(rota);
});

unidadesRouter.get("/rotas-sla", async (_req, res) => {
  const rotas = await prisma.rotaSLA.findMany({
    include: { origem: true, destino: true },
  });
  res.json(rotas);
});

unidadesRouter.patch(
  "/rotas-sla/:id",
  requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR),
  async (req, res) => {
    const parsed = z.object({ prazoHoras: z.number().int().positive() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const rota = await prisma.rotaSLA.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(rota);
  },
);

unidadesRouter.delete(
  "/rotas-sla/:id",
  requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR),
  async (req, res) => {
    await prisma.rotaSLA.delete({ where: { id: req.params.id } });
    res.status(204).send();
  },
);
