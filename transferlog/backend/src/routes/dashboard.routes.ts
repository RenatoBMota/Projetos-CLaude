import { Router } from "express";
import { Perfil } from "@prisma/client";
import { authenticate, requirePerfil } from "../middlewares/auth";
import { dashboardGerencial, dashboardOperacional } from "../services/dashboardService";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/operacional", async (req, res) => {
  const dados = await dashboardOperacional(req.auth!.unidadeIds);
  res.json(dados);
});

dashboardRouter.get(
  "/gerencial",
  requirePerfil(Perfil.SUPERVISOR, Perfil.AUDITORIA),
  async (_req, res) => {
    const dados = await dashboardGerencial();
    res.json(dados);
  },
);
