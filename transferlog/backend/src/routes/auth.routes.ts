import { Router } from "express";
import { z } from "zod";
import { login } from "../services/authService";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const resultado = await login(parsed.data.email, parsed.data.senha);
    return res.json(resultado);
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});
