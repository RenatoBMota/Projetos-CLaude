import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const isGerencial = usuario?.perfil === "ADMINISTRADOR" || usuario?.perfil === "SUPERVISOR" || usuario?.perfil === "AUDITORIA";
  const isAdmin = usuario?.perfil === "ADMINISTRADOR";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 style={{ fontSize: 18 }}>TransferLog</h1>
        <nav>
          <NavLink to="/" end>Painel</NavLink>
          <NavLink to="/transferencias">Transferências</NavLink>
          <NavLink to="/upload">Upload de Nota</NavLink>
          {isGerencial && <NavLink to="/dashboard-gerencial">Dashboard gerencial</NavLink>}
          {isAdmin && <NavLink to="/cadastros">Cadastros</NavLink>}
        </nav>
        <div style={{ marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
          <div>{usuario?.nome}</div>
          <div>{usuario?.perfil}</div>
          <button style={{ marginTop: 8 }} onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
