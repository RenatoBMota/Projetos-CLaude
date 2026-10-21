import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";

/** Intervalo entre consultas da marca de dados: tela visível / em segundo plano. */
const INTERVALO = 5000;
const INTERVALO_OCULTO = 30000;

const Contexto = createContext(0);

/**
 * Consulta /api/versao a cada poucos segundos (e na hora em que a aba volta a ficar visível).
 * Quando alguém inclui ou altera qualquer coisa, a marca muda e todas as telas
 * que usam useVersao() recarregam sozinhas.
 */
export function ProvedorAtualizacao({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(0);
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    let parado = false;
    let timer: number | undefined;
    let ocupado = false;
    const verificar = async () => {
      if (ocupado) return;
      ocupado = true;
      window.clearTimeout(timer);
      try {
        const r = await api<{ versao: string }>("/api/versao");
        if (ultima.current !== null && r.versao !== ultima.current) setVersao((n) => n + 1);
        ultima.current = r.versao;
      } catch {
        // sem conexão: tenta de novo no próximo ciclo
      }
      ocupado = false;
      if (!parado) timer = window.setTimeout(verificar, document.visibilityState === "visible" ? INTERVALO : INTERVALO_OCULTO);
    };
    verificar();
    const aoVoltar = () => document.visibilityState === "visible" && verificar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", verificar);
    return () => {
      parado = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", verificar);
    };
  }, []);

  return <Contexto.Provider value={versao}>{children}</Contexto.Provider>;
}

/** Número que aumenta sempre que os dados mudam no servidor: use nas dependências do carregamento. */
export const useVersao = () => useContext(Contexto);

/** Aviso do sistema (fora da tela), se o usuário permitiu. */
export async function notificar(titulo: string, texto: string, url = "/") {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opcoes = { body: texto, icon: "/icone-192.png", badge: "/icone-192.png", tag: "pendencias", data: { url } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return void (await reg.showNotification(titulo, opcoes));
    new Notification(titulo, opcoes);
  } catch {
    // navegador sem suporte
  }
}

/** Número no ícone do aplicativo instalado (onde o sistema suporta). */
export function marcarIcone(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  (n > 0 ? nav.setAppBadge?.(n) : nav.clearAppBadge?.())?.catch(() => {});
}
