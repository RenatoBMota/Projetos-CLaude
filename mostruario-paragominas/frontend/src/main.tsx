import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./estilo.css";
import { Layout } from "./componentes/Layout";
import { Configuracao } from "./paginas/Configuracao";
import { Inicio } from "./paginas/Inicio";
import { Login } from "./paginas/Login";
import { TrocarSenha } from "./paginas/TrocarSenha";
import { ProvedorSessao, temPerfil, useSessao } from "./sessao";

function App() {
  const { usuario, carregando } = useSessao();
  if (carregando) return <div className="centro">Carregando…</div>;
  if (!usuario) return <Login />;
  if (usuario.trocar_senha) return <TrocarSenha obrigatoria />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="minha-senha" element={<TrocarSenha />} />
        {temPerfil(usuario, "admin") && <Route path="configuracao/*" element={<Configuracao />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvedorSessao>
        <App />
      </ProvedorSessao>
    </BrowserRouter>
  </React.StrictMode>,
);
