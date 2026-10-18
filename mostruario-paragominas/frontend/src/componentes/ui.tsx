import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileEdit,
  Inbox,
  PackageCheck,
  Store,
  Truck,
  Undo2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STATUS } from "../formato";

// ---------------------------------------------------------------------------
// Cabeçalho de página
// ---------------------------------------------------------------------------

export function Cabecalho({
  titulo,
  subtitulo,
  voltar,
  acoes,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  voltar?: { para: string; rotulo: string };
  acoes?: ReactNode;
}) {
  return (
    <header className="cabecalho">
      <div>
        {voltar && (
          <Link to={voltar.para} className="voltar">
            <ChevronLeft size={16} /> {voltar.rotulo}
          </Link>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes && <div className="botoes">{acoes}</div>}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export function Vazio({
  icone: Icone = Inbox,
  titulo,
  texto,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="vazio-estado">
      <div className="bolha">
        <Icone size={22} />
      </div>
      <strong>{titulo}</strong>
      {texto && <span>{texto}</span>}
      {acao}
    </div>
  );
}

export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="carregando-linhas" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto" />
      ))}
    </div>
  );
}

export function Indicador({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  para,
  destaque,
}: {
  icone?: LucideIcon;
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  para?: string;
  destaque?: boolean;
}) {
  const conteudo = (
    <>
      <span className="rotulo">
        {Icone && <Icone size={16} />}
        {rotulo}
      </span>
      <b>{valor}</b>
      {detalhe && <small>{detalhe}</small>}
    </>
  );
  const classe = `cartao indicador ${destaque ? "destaque" : ""}`;
  return para ? (
    <Link to={para} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const ICONES_STATUS: Record<string, LucideIcon> = {
  rascunho: FileEdit,
  aguardando_aprovacao_comercial: Clock,
  aguardando_aprovacao_logistica: Clock,
  aguardando_expedicao: Truck,
  em_exposicao: Store,
  devolucao_parcial: Undo2,
  encerrada: PackageCheck,
  reprovada: XCircle,
  cancelada: Ban,
};

export function SeloStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { rotulo: status, cor: "" };
  const Icone = ICONES_STATUS[status];
  return (
    <span className={`selo ${s.cor}`}>
      {Icone && <Icone />}
      {s.rotulo}
    </span>
  );
}

export const iniciais = (nome = "") =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// ---------------------------------------------------------------------------
// Notificações rápidas (toasts)
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  texto: string;
  tipo: "ok" | "erro" | "info";
  acao?: { rotulo: string; executar: () => void };
  fixo?: boolean;
}

const ContextoToast = createContext<(t: Omit<Toast, "id">) => void>(() => {});
let proximoId = 1;

export function ProvedorToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remover = useCallback((id: number) => setToasts((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = proximoId++;
      setToasts((l) => [...l.slice(-3), { ...t, id }]);
      if (!t.fixo) setTimeout(() => remover(id), t.tipo === "erro" ? 6000 : 3500);
    },
    [remover],
  );
  return (
    <ContextoToast.Provider value={mostrar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}-toast`}>
            {t.tipo === "erro" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{t.texto}</span>
            {t.acao ? (
              <button
                onClick={() => {
                  t.acao!.executar();
                  remover(t.id);
                }}
              >
                {t.acao.rotulo}
              </button>
            ) : (
              t.fixo && (
                <button className="icone" onClick={() => remover(t.id)} aria-label="Fechar">
                  <X size={16} />
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export const useToast = () => useContext(ContextoToast);

// ---------------------------------------------------------------------------
// Tema (claro / escuro / automático)
// ---------------------------------------------------------------------------

export type Tema = "auto" | "claro" | "escuro";
const CHAVE_TEMA = "mostruario.tema";

function aplicarTema(t: Tema) {
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t === "claro" ? "light" : "dark";
}

export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      return (localStorage.getItem(CHAVE_TEMA) as Tema) || "auto";
    } catch {
      return "auto";
    }
  });
  useEffect(() => {
    aplicarTema(tema);
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      /* sem armazenamento */
    }
  }, [tema]);
  const alternar = () => setTema((t) => (t === "auto" ? "escuro" : t === "escuro" ? "claro" : "auto"));
  return [tema, alternar];
}

// ---------------------------------------------------------------------------
// Instalação do app (PWA) e conexão
// ---------------------------------------------------------------------------

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function useInstalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalado, setInstalado] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  useEffect(() => {
    const antes = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const depois = () => {
      setInstalado(true);
      setEvento(null);
    };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => {
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", depois);
    };
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    disponivel: !instalado && (!!evento || ios),
    ios: ios && !evento,
    instalar: async () => {
      if (!evento) return;
      await evento.prompt();
      await evento.userChoice;
      setEvento(null);
    },
  };
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
