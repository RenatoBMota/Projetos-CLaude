import { Database, Users } from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Cabecalho } from "../componentes/ui";
import { Cadastros } from "./Cadastros";
import { Usuarios } from "./Usuarios";

export function Configuracao() {
  return (
    <>
      <Cabecalho titulo="Configuração" subtitulo="Cadastros, usuários e permissões." />
      <nav className="abas">
        <NavLink to="cadastros">
          <Database size={16} /> Cadastros
        </NavLink>
        <NavLink to="usuarios">
          <Users size={16} /> Usuários
        </NavLink>
      </nav>
      <Routes>
        <Route path="cadastros/*" element={<Cadastros />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="cadastros" replace />} />
      </Routes>
    </>
  );
}
