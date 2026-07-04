import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { empresasRouter } from "./routes/empresas.routes";
import { transferenciasRouter } from "./routes/transferencias.routes";
import { unidadesRouter } from "./routes/unidades.routes";
import { usuariosRouter } from "./routes/usuarios.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/empresas", empresasRouter);
  app.use("/unidades", unidadesRouter);
  app.use("/usuarios", usuariosRouter);
  app.use("/transferencias", transferenciasRouter);
  app.use("/dashboard", dashboardRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
