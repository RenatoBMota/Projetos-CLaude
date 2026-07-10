const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

function getToken(): string | null {
  return localStorage.getItem("transferlog:token");
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipJsonBody?: boolean } = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !options.skipJsonBody) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.formErrors?.join(", ") ?? data?.error ?? "Erro na requisição";
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};

/** Baixa um arquivo binário (ex.: PDF) autenticado, disparando o download no navegador. */
export async function baixarArquivo(path: string, nomeArquivoPadrao: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api${path}`, { headers });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error?.formErrors?.join(", ") ?? data?.error ?? "Erro ao baixar arquivo";
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), res.status);
  }

  const disposition = res.headers.get("Content-Disposition");
  const nomeArquivo = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? nomeArquivoPadrao;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
