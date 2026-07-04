import { NextFunction, Request, Response } from "express";
import { Perfil } from "@prisma/client";
import { TokenPayload, verifyToken } from "../services/authService";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não informado" });
  }

  try {
    const token = header.slice("Bearer ".length);
    req.auth = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

const PERFIS_ACESSO_TOTAL: Perfil[] = [Perfil.ADMINISTRADOR];

export function requirePerfil(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (
      PERFIS_ACESSO_TOTAL.includes(req.auth.perfil) ||
      perfis.includes(req.auth.perfil)
    ) {
      return next();
    }
    return res.status(403).json({ error: "Perfil sem permissão para esta ação" });
  };
}

/** Verifica se o usuário autenticado participa da unidade (origem ou destino) informada. */
export function podeAcessarUnidade(auth: TokenPayload, unidadeId: string): boolean {
  if (PERFIS_ACESSO_TOTAL.includes(auth.perfil)) return true;
  return auth.unidadeIds.includes(unidadeId);
}
