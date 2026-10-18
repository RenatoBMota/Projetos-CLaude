export type Perfil =
  | "requisitante"
  | "aprovador_comercial"
  | "aprovador_logistica"
  | "deposito"
  | "gestor"
  | "admin";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  matricula: string | null;
  filial_id: number | null;
  ativo: boolean;
  trocar_senha: boolean;
  perfis: Perfil[];
  filiais: number[];
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
}

export const PERFIS: { valor: Perfil; rotulo: string; descricao: string }[] = [
  { valor: "requisitante", rotulo: "Requisitante", descricao: "Cria e acompanha requisições da sua filial" },
  { valor: "aprovador_comercial", rotulo: "Aprovador comercial", descricao: "Aprova ou reprova a 1ª etapa" },
  { valor: "aprovador_logistica", rotulo: "Aprovador logístico", descricao: "Aprova ou reprova a 2ª etapa" },
  { valor: "deposito", rotulo: "Depósito", descricao: "Registra expedição, devolução e perda" },
  { valor: "gestor", rotulo: "Gestor", descricao: "Consulta tudo, relatórios e estornos" },
  { valor: "admin", rotulo: "Administrador", descricao: "Configurações, cadastros e usuários" },
];

const CHAVE_TOKEN = "mostruario.token";

export const token = {
  ler: () => {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  gravar: (t: string | null) => {
    try {
      if (t) localStorage.setItem(CHAVE_TOKEN, t);
      else localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* armazenamento indisponível */
    }
  },
};

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

let aoExpirar: () => void = () => {};
export function definirAoExpirar(fn: () => void) {
  aoExpirar = fn;
}

function mensagemDeErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown })?.detail;
  if (typeof detalhe === "string") return detalhe;
  if (Array.isArray(detalhe) && detalhe.length) {
    return detalhe
      .map((e: { loc?: (string | number)[]; msg?: string }) => {
        const campo = e.loc?.filter((p) => p !== "body").join(".");
        return campo ? `${campo}: ${e.msg}` : e.msg;
      })
      .join("; ");
  }
  return `Erro ${status}`;
}

export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const cabecalhos = new Headers(opcoes.headers);
  const t = token.ler();
  if (t) cabecalhos.set("Authorization", `Bearer ${t}`);
  if (opcoes.body && !(opcoes.body instanceof FormData)) cabecalhos.set("Content-Type", "application/json");
  const r = await fetch(caminho, { ...opcoes, headers: cabecalhos });
  if (r.status === 401 && t) aoExpirar();
  const tipo = r.headers.get("content-type") || "";
  const corpo = tipo.includes("application/json") ? await r.json() : null;
  if (!r.ok) throw new ErroApi(r.status, mensagemDeErro(corpo, r.status));
  return corpo as T;
}

export const enviar = <T>(caminho: string, metodo: string, dados: unknown) =>
  api<T>(caminho, { method: metodo, body: JSON.stringify(dados) });

export async function baixar(caminho: string, nomeArquivo: string) {
  const r = await fetch(caminho, { headers: { Authorization: `Bearer ${token.ler()}` } });
  if (!r.ok) throw new ErroApi(r.status, "Falha ao baixar arquivo");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
