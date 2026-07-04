import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "./app";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
for (const sub of ["nfe", "divergencias"]) {
  fs.mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true });
}

const app = createApp();
const port = Number(process.env.PORT ?? 3333);

app.listen(port, () => {
  console.log(`TransferLog API rodando na porta ${port}`);
});
