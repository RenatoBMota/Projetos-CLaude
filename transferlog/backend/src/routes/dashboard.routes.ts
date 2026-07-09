import { Router } from "express";
import { z } from "zod";
import { Perfil } from "@prisma/client";
import { authenticate, requirePerfil } from "../middlewares/auth";
import {
  dashboardGerencial,
  dashboardOperacional,
  dashboardOperacionalPorFilial,
} from "../services/dashboardService";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/operacional", async (req, res) => {
  const dados = await dashboardOperacional(req.auth!.unidadeIds);
  res.json(dados);
});

dashboardRouter.get(
  "/operacional-por-filial",
  requirePerfil(Perfil.ADMINISTRADOR, Perfil.SUPERVISOR),
  async (req, res) => {
    const auth = req.auth!;
    const unidadeIds = auth.perfil === Perfil.ADMINISTRADOR ? undefined : auth.unidadeIds;
    const dados = await dashboardOperacionalPorFilial(unidadeIds);
    res.json(dados);
  },
);

const dashboardGerencialQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

dashboardRouter.get(
  "/gerencial",
  requirePerfil(Perfil.SUPERVISOR, Perfil.AUDITORIA),
  async (req, res) => {
    const parsed = dashboardGerencialQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

    const dataInicio = parsed.data.dataInicio ?? primeiroDiaMes;
    const dataFimBase = parsed.data.dataFim ?? ultimoDiaMes;
    const dataFim = new Date(dataFimBase.getTime() + 24 * 60 * 60 * 1000 - 1);

    const dados = await dashboardGerencial(dataInicio, dataFim);
    res.json(dados);
  },
);
