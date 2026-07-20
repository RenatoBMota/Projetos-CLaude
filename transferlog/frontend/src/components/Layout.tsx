import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

interface DadosAtencao {
  atrasadas: unknown[];
  emRisco: unknown[];
  paradas: unknown[];
}

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const isGerencial = usuario?.perfil === "ADMINISTRADOR" || usuario?.perfil === "SUPERVISOR" || usuario?.perfil === "AUDITORIA";
  const isAdmin = usuario?.perfil === "ADMINISTRADOR";
  const [alertaCount, setAlertaCount] = useState(0);

  useEffect(() => {
    api
      .get<DadosAtencao>("/transferencias/atencao")
      .then((dados) => setAlertaCount(dados.atrasadas.length + dados.emRisco.length))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 style={{ fontSize: 18 }}>TransferLog</h1>
        <nav>
          <NavLink to="/" end>Painel</NavLink>
          <NavLink to="/atencao" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Atenção
            {alertaCount > 0 && (
              <span
                style={{
                  background: "var(--danger, #dc2626)",
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: 11,
                  padding: "1px 7px",
                  fontWeight: 600,
                }}
              >
                {alertaCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/transferencias">Transferências</NavLink>
          <NavLink to="/upload">Upload de Nota</NavLink>
          <NavLink to="/relatorio">Relatório</NavLink>
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
