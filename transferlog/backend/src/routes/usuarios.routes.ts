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

  try {
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
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

const usuarioUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  perfil: z.nativeEnum(Perfil).optional(),
  ativo: z.boolean().optional(),
  unidadeIds: z.array(z.string()).optional(),
});

usuariosRouter.patch("/:id", async (req, res) => {
  const parsed = usuarioUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { unidadeIds, ...dados } = parsed.data;

  try {
    const usuario = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.usuario.update({ where: { id: req.params.id }, data: dados });
      if (unidadeIds) {
        await tx.usuarioUnidade.deleteMany({ where: { usuarioId: req.params.id } });
        await tx.usuarioUnidade.createMany({
          data: unidadeIds.map((unidadeId) => ({ usuarioId: req.params.id, unidadeId })),
        });
      }
      return atualizado;
    });

    const { senhaHash: _omit, ...usuarioSemSenha } = usuario;
    res.json(usuarioSemSenha);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
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

const resetSenhaSchema = z.object({ novaSenha: z.string().min(6) });

usuariosRouter.post("/:id/resetar-senha", async (req, res) => {
  const parsed = resetSenhaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const senhaHash = await hashSenha(parsed.data.novaSenha);
  await prisma.usuario.update({ where: { id: req.params.id }, data: { senhaHash } });
  res.status(204).send();
});

usuariosRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({
      error: "Não é possível excluir: este usuário já tem histórico de ações no sistema. Desative-o em vez de excluir.",
    });
  }
});
