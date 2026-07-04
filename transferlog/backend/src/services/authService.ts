import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Perfil } from "@prisma/client";
import { prisma } from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "8h";
const SALT_ROUNDS = 10;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado");
}

export interface TokenPayload {
  sub: string;
  perfil: Perfil;
  unidadeIds: string[];
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { unidades: true },
  });

  if (!usuario || !usuario.ativo) {
    throw new Error("Credenciais inválidas");
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    throw new Error("Credenciais inválidas");
  }

  const payload: TokenPayload = {
    sub: usuario.id,
    perfil: usuario.perfil,
    unidadeIds: usuario.unidades.map((u) => u.unidadeId),
  };

  const token = jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      unidadeIds: payload.unidadeIds,
    },
  };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
}
