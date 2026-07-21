import { Router } from "express";
import { z } from "zod";
import { Perfil } from "@prisma/client";
import { authenticate, requirePerfil } from "../middlewares/auth";
import {
  relatorioCustoFrete,
  relatorioPerformanceTransportadoras,
  relatorioDivergenciasRecorrentes,
  relatorioAgingTratativas,
  relatorioUrgencias,
  relatorioMotivosDevolucao,
} from "../services/relatoriosGerenciaisService";

export const relatoriosGerenciaisRouter = Router();
relatoriosGerenciaisRouter.use(authenticate);
relatoriosGerenciaisRouter.use(requirePerfil(Perfil.SUPERVISOR, Perfil.AUDITORIA));

const periodoQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

function resolverPeriodo(query: unknown): { dataInicio: Date; dataFim: Date } | null {
  const parsed = periodoQuerySchema.safeParse(query);
  if (!parsed.success) return null;

  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  const dataInicio = parsed.data.dataInicio ?? primeiroDiaMes;
  const dataFimBase = parsed.data.dataFim ?? ultimoDiaMes;
  const dataFim = new Date(dataFimBase.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { dataInicio, dataFim };
}

relatoriosGerenciaisRouter.get("/custo-frete", async (req, res) => {
  const periodo = resolverPeriodo(req.query);
  if (!periodo) return res.status(400).json({ error: "Parâmetros inválidos" });
  res.json(await relatorioCustoFrete(periodo.dataInicio, periodo.dataFim));
});

relatoriosGerenciaisRouter.get("/performance-transportadoras", async (req, res) => {
  const periodo = resolverPeriodo(req.query);
  if (!periodo) return res.status(400).json({ error: "Parâmetros inválidos" });
  res.json(await relatorioPerformanceTransportadoras(periodo.dataInicio, periodo.dataFim));
});

relatoriosGerenciaisRouter.get("/divergencias-recorrentes", async (req, res) => {
  const periodo = resolverPeriodo(req.query);
  if (!periodo) return res.status(400).json({ error: "Parâmetros inválidos" });
  res.json(await relatorioDivergenciasRecorrentes(periodo.dataInicio, periodo.dataFim));
});

relatoriosGerenciaisRouter.get("/aging-tratativas", async (_req, res) => {
  res.json(await relatorioAgingTratativas());
});

relatoriosGerenciaisRouter.get("/urgencias", async (req, res) => {
  const periodo = resolverPeriodo(req.query);
  if (!periodo) return res.status(400).json({ error: "Parâmetros inválidos" });
  res.json(await relatorioUrgencias(periodo.dataInicio, periodo.dataFim));
});

relatoriosGerenciaisRouter.get("/motivos-devolucao", async (req, res) => {
  const periodo = resolverPeriodo(req.query);
  if (!periodo) return res.status(400).json({ error: "Parâmetros inválidos" });
  res.json(await relatorioMotivosDevolucao(periodo.dataInicio, periodo.dataFim));
});
