import { Router } from "express";
import { z } from "zod";
import { Perfil } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requirePerfil } from "../middlewares/auth";
import { hashSenha } from "../services/authService";

export const usuariosRouter = Router();
usuariosRouter.use(authenticate);
usuariosRouter.use(requirePerfil(Perfil.ADMINISTRADOR));

usuariosRouter.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    include: { unidades: { include: { unidade: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(
    usuarios.map(({ senhaHash, ...usuario }) => usuario),
  );
});

const usuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  perfil: z.nativeEnum(Perfil),
  unidadeIds: z.array(z.string()).default([]),
});

usuariosRouter.post("/", async (req, res) => {
  const parsed = usuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { senha, unidadeIds, ...dados } = parsed.data;
  const senhaHash = await hashSenha(senha);

  const usuario = await prisma.usuario.create({
    data: {
      ...dados,
      senhaHash,
      unidades: {
        create: unidadeIds.map((unidadeId) => ({ unidadeId })),
      },
    },
  });

  const { senhaHash: _omit, ...usuarioSemSenha } = usuario;
  res.status(201).json(usuarioSemSenha);
});

usuariosRouter.patch("/:id/unidades", async (req, res) => {
  const parsed = z.object({ unidadeIds: z.array(z.string()) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  await prisma.usuarioUnidade.deleteMany({ where: { usuarioId: req.params.id } });
  await prisma.usuarioUnidade.createMany({
    data: parsed.data.unidadeIds.map((unidadeId) => ({
      usuarioId: req.params.id,
      unidadeId,
    })),
  });

  res.status(204).send();
});
