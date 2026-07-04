import { Router } from "express";
import { z } from "zod";
import { Perfil, TipoUnidade } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requirePerfil } from "../middlewares/auth";

export const unidadesRouter = Router();
unidadesRouter.use(authenticate);

unidadesRouter.get("/", async (_req, res) => {
  const unidades = await prisma.unidade.findMany({ orderBy: { nome: "asc" } });
  res.json(unidades);
});

const unidadeSchema = z.object({
  empresaId: z.string(),
  nome: z.string().min(1),
  cnpj: z.string().min(11),
  cidade: z.string().min(1),
  uf: z.string().length(2),
  tipo: z.nativeEnum(TipoUnidade),
  ativa: z.boolean().optional(),
});

unidadesRouter.post("/", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const parsed = unidadeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const unidade = await prisma.unidade.create({ data: parsed.data });
  res.status(201).json(unidade);
});

unidadesRouter.patch("/:id", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const parsed = unidadeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const unidade = await prisma.unidade.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(unidade);
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
