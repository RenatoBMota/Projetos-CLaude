import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Cadastros } from "./Cadastros";
import { Usuarios } from "./Usuarios";

export function Configuracao() {
  return (
    <>
      <h1>Configuração</h1>
      <nav className="abas">
        <NavLink to="cadastros">Cadastros</NavLink>
        <NavLink to="usuarios">Usuários</NavLink>
      </nav>
      <Routes>
        <Route path="cadastros/*" element={<Cadastros />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="cadastros" replace />} />
      </Routes>
    </>
  );
}
