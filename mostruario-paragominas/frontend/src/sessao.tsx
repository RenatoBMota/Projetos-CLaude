import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, definirAoExpirar, enviar, token, Usuario } from "./api";

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
  atualizar: (u: Usuario) => void;
}

const Contexto = createContext<Sessao>(null!);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(() => {
    token.gravar(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    definirAoExpirar(sair);
    if (!token.ler()) {
      setCarregando(false);
      return;
    }
    api<Usuario>("/api/auth/eu")
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = async (email: string, senha: string) => {
    const r = await enviar<{ token: string; usuario: Usuario }>("/api/auth/login", "POST", { email, senha });
    token.gravar(r.token);
    setUsuario(r.usuario);
  };

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, sair, atualizar: setUsuario }}>
      {children}
    </Contexto.Provider>
  );
}

export const useSessao = () => useContext(Contexto);

export const PERFIS_RELATORIOS = ["gestor", "admin", "aprovador_comercial", "aprovador_logistica", "deposito"];

export const temPerfil = (u: Usuario | null, ...perfis: string[]) =>
  !!u && u.perfis.some((p) => perfis.includes(p));
