import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { z } from "zod";
import { Perfil, StatusTransferencia, TipoDivergencia } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, podeAcessarUnidade, requirePerfil } from "../middlewares/auth";
import { NfeParsed, parseNfeXml } from "../services/nfeParser";
import { parseDanfePdf } from "../services/danfeParser";
import {
  concluirSeparacao,
  confirmarRecebimento,
  criarTransferencia,
  finalizarTransferencia,
  marcarCarregado,
  marcarItemSeparado,
  montarPreviaTransferencia,
  registrarConferencia,
} from "../services/transferenciaService";
import { calcularOtif } from "../services/otifService";

export const transferenciasRouter = Router();
transferenciasRouter.use(authenticate);

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "nfe")),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const permitido =
      file.mimetype === "text/xml" ||
      file.mimetype === "application/xml" ||
      file.mimetype === "application/pdf";
    if (permitido) {
      cb(null, true);
    } else {
      cb(new Error("Somente arquivos XML ou PDF (DANFE) de NF-e são aceitos"));
    }
  },
});

const fotosUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "divergencias")),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

type FonteNfe = "XML" | "PDF_OCR";

async function lerNfeDoArquivo(file: Express.Multer.File): Promise<{ nfe: NfeParsed; fonte: FonteNfe }> {
  if (file.mimetype === "application/pdf") {
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(file.path);
    return { nfe: await parseDanfePdf(buffer), fonte: "PDF_OCR" };
  }
  const fs = await import("node:fs/promises");
  const xml = await fs.readFile(file.path, "utf-8");
  return { nfe: parseNfeXml(xml), fonte: "XML" };
}

/**
 * Lê o XML ou PDF (DANFE, via OCR) e devolve o resumo da NF sem persistir nada
 * (Tela "Resumo da NF"). Quando a fonte é PDF, os dados vêm de OCR e devem ser
 * revisados/corrigidos pelo analista antes de confirmar a criação da transferência.
 */
transferenciasRouter.post("/resumo", requirePerfil(Perfil.ANALISTA), upload.single("arquivo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    const { nfe, fonte } = await lerNfeDoArquivo(req.file);
    const previa = await montarPreviaTransferencia(nfe);
    res.json({ ...previa, arquivoPath: req.file.path, fonte });
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

const nfeItemSchema = z.object({
  codigoInterno: z.string().min(1),
  descricao: z.string().min(1),
  ncm: z.string().min(1),
  cfop: z.string().min(1),
  quantidade: z.number().int().positive(),
});

const criarTransferenciaSchema = z.object({
  arquivoPath: z.string(),
  numeroNF: z.string().min(1),
  serie: z.string().min(1),
  numeroPedido: z.string(),
  emitenteCnpj: z.string().min(11),
  destinatarioCnpj: z.string().min(11),
  dataPedido: z.coerce.date(),
  dataEmissao: z.coerce.date(),
  dataEmissaoConfiavel: z.boolean(),
  valorTotal: z.number().nonnegative(),
  qtdVolumes: z.number().int().nonnegative(),
  pesoBruto: z.number().nonnegative(),
  itens: z.array(nfeItemSchema).min(1),
});

/**
 * Cria a transferência a partir dos dados da NF já lidos e eventualmente
 * corrigidos pelo analista na tela de Resumo (obrigatório revisar quando a
 * fonte for PDF/OCR, já que a extração por imagem é menos confiável que o XML).
 * A data do pedido (informada manualmente) é a base de todos os cálculos de
 * prazo/lead time — a data/hora de upload fica registrada só como referência.
 */
transferenciasRouter.post("/", requirePerfil(Perfil.ANALISTA), async (req, res) => {
  const parsed = criarTransferenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { arquivoPath, dataPedido, ...nfe } = parsed.data;
    const transferencia = await criarTransferencia(nfe, req.auth!.sub, dataPedido, arquivoPath);
    res.status(201).json(transferencia);
  } catch (err) {
    res.status(422).json({ error: (err as Error).message });
  }
});

/** Fila de transferências visíveis para o usuário autenticado (origem ou destino). */
transferenciasRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  const status = req.query.status as StatusTransferencia | undefined;
  const isAdmin = auth.perfil === Perfil.ADMINISTRADOR;

  const transferencias = await prisma.transferencia.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(isAdmin
        ? {}
        : {
            OR: [
              { origemId: { in: auth.unidadeIds } },
              { destinoId: { in: auth.unidadeIds } },
            ],
          }),
    },
    include: { origem: true, destino: true, itens: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(transferencias);
});

/**
 * Relatório de transferências pesquisável por código de produto, status e
 * período (baseado na data do pedido, não na data de upload da NF).
 */
const relatorioQuerySchema = z.object({
  codigoProduto: z.string().trim().min(1).optional(),
  status: z.nativeEnum(StatusTransferencia).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

transferenciasRouter.get("/relatorio", async (req, res) => {
  const parsed = relatorioQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { codigoProduto, status, dataInicio, dataFim } = parsed.data;
  const auth = req.auth!;
  const isAdmin = auth.perfil === Perfil.ADMINISTRADOR;

  const dataFimFimDoDia = dataFim ? new Date(dataFim.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

  const transferencias = await prisma.transferencia.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(dataInicio || dataFimFimDoDia
        ? {
            dataPedido: {
              ...(dataInicio ? { gte: dataInicio } : {}),
              ...(dataFimFimDoDia ? { lte: dataFimFimDoDia } : {}),
            },
          }
        : {}),
      ...(codigoProduto
        ? { itens: { some: { codigoInterno: { contains: codigoProduto, mode: "insensitive" } } } }
        : {}),
      ...(isAdmin
        ? {}
        : {
            OR: [
              { origemId: { in: auth.unidadeIds } },
              { destinoId: { in: auth.unidadeIds } },
            ],
          }),
    },
    include: { origem: true, destino: true, itens: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  res.json(transferencias);
});

async function carregarTransferenciaAutorizada(req: any, res: any) {
  const transferencia = await prisma.transferencia.findUnique({
    where: { id: req.params.id },
    include: { itens: true, origem: true, destino: true },
  });
  if (!transferencia) {
    res.status(404).json({ error: "Transferência não encontrada" });
    return null;
  }
  const autorizado =
    podeAcessarUnidade(req.auth!, transferencia.origemId) ||
    podeAcessarUnidade(req.auth!, transferencia.destinoId);
  if (!autorizado) {
    res.status(403).json({ error: "Sem acesso a esta transferência" });
    return null;
  }
  return transferencia;
}

transferenciasRouter.get("/:id", async (req, res) => {
  const transferencia = await carregarTransferenciaAutorizada(req, res);
  if (!transferencia) return;

  const otif = calcularOtif(transferencia, transferencia.itens);
  res.json({ ...transferencia, otif });
});

transferenciasRouter.patch(
  "/:id/itens/:itemId/separar",
  requirePerfil(Perfil.SEPARADOR),
  async (req, res) => {
    const schema = z.object({ separado: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    const item = await marcarItemSeparado(req.params.id, req.params.itemId, parsed.data.separado);
    res.json(item);
  },
);

transferenciasRouter.post(
  "/:id/concluir-separacao",
  requirePerfil(Perfil.SEPARADOR),
  async (req, res) => {
    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    try {
      const atualizada = await concluirSeparacao(req.params.id, req.auth!.sub);
      res.json(atualizada);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  },
);

const carregamentoSchema = z.object({
  transportadora: z.string().optional(),
  veiculo: z.string().optional(),
  motorista: z.string().optional(),
});

transferenciasRouter.post(
  "/:id/carregar",
  requirePerfil(Perfil.OPERADOR, Perfil.SUPERVISOR),
  async (req, res) => {
    const parsed = carregamentoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    const atualizada = await marcarCarregado(req.params.id, req.auth!.sub, parsed.data);
    res.json(atualizada);
  },
);

transferenciasRouter.post(
  "/:id/fotos",
  requirePerfil(Perfil.CONFERENTE),
  fotosUpload.array("fotos", 10),
  (req, res) => {
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];
    res.json({ paths: arquivos.map((f) => f.path) });
  },
);

transferenciasRouter.post(
  "/:id/confirmar-recebimento",
  requirePerfil(Perfil.CONFERENTE, Perfil.OPERADOR),
  async (req, res) => {
    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    try {
      const atualizada = await confirmarRecebimento(req.params.id, req.auth!.sub);
      res.json(atualizada);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  },
);

const conferenciaSchema = z.object({
  itens: z.array(
    z.object({
      itemId: z.string(),
      quantidadeConferida: z.number().int().min(0),
      divergenciaTipo: z.nativeEnum(TipoDivergencia).optional(),
      divergenciaQtd: z.number().int().optional(),
      divergenciaObs: z.string().optional(),
      divergenciaFotos: z.array(z.string()).optional(),
    }),
  ),
});

transferenciasRouter.post(
  "/:id/conferencia",
  requirePerfil(Perfil.CONFERENTE),
  async (req, res) => {
    const parsed = conferenciaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    try {
      const atualizada = await registrarConferencia(
        req.params.id,
        req.auth!.sub,
        parsed.data.itens,
      );
      res.json(atualizada);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  },
);

transferenciasRouter.post(
  "/:id/finalizar",
  requirePerfil(Perfil.SUPERVISOR, Perfil.AUDITORIA),
  async (req, res) => {
    const transferencia = await carregarTransferenciaAutorizada(req, res);
    if (!transferencia) return;

    try {
      const atualizada = await finalizarTransferencia(req.params.id, req.auth!.sub);
      res.json(atualizada);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  },
);

/** Exclui uma transferência (ex.: registro de teste), removendo itens e eventos vinculados. */
transferenciasRouter.delete("/:id", requirePerfil(Perfil.ADMINISTRADOR), async (req, res) => {
  const transferencia = await prisma.transferencia.findUnique({ where: { id: req.params.id } });
  if (!transferencia) {
    return res.status(404).json({ error: "Transferência não encontrada" });
  }

  await prisma.$transaction([
    prisma.eventoAuditoria.deleteMany({ where: { transferenciaId: req.params.id } }),
    prisma.itemTransferencia.deleteMany({ where: { transferenciaId: req.params.id } }),
    prisma.transferencia.delete({ where: { id: req.params.id } }),
  ]);

  res.status(204).send();
});
