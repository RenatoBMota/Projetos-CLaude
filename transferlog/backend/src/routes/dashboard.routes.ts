import { Router } from "express";
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

dashboardRouter.get(
  "/gerencial",
  requirePerfil(Perfil.SUPERVISOR, Perfil.AUDITORIA),
  async (_req, res) => {
    const dados = await dashboardGerencial();
    res.json(dados);
  },
);
