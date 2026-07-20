import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { transferenciasRouter } from "./routes/transferencias.routes";
import { transportadorasRouter } from "./routes/transportadoras.routes";
import { unidadesRouter } from "./routes/unidades.routes";
import { usuariosRouter } from "./routes/usuarios.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Tudo sob /api/* — evita qualquer colisão entre rotas da API e rotas do
  // frontend (ex: /api/dashboard/* vs /dashboard-gerencial, /api/transferencias
  // vs /transferencias) quando o Caddy decide o que proxiar pro backend.
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/unidades", unidadesRouter);
  app.use("/api/usuarios", usuariosRouter);
  app.use("/api/transportadoras", transportadorasRouter);
  app.use("/api/transferencias", transferenciasRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
