import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { UsuarioAutenticado } from "../api/types";

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "transferlog:token";
const USER_KEY = "transferlog:user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UsuarioAutenticado) : null;
  });

  async function login(email: string, senha: string) {
    const resultado = await api.post<{ token: string; usuario: UsuarioAutenticado }>(
      "/auth/login",
      { email, senha },
    );
    localStorage.setItem(TOKEN_KEY, resultado.token);
    localStorage.setItem(USER_KEY, JSON.stringify(resultado.usuario));
    setUsuario(resultado.usuario);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
