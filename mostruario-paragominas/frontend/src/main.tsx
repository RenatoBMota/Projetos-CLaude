import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./estilo.css";
import { Layout } from "./componentes/Layout";
import { Amostras } from "./paginas/Amostras";
import { Configuracao } from "./paginas/Configuracao";
import { DetalheRequisicao } from "./paginas/DetalheRequisicao";
import { Inicio } from "./paginas/Inicio";
import { Login } from "./paginas/Login";
import { NovaRequisicao } from "./paginas/NovaRequisicao";
import { Requisicoes } from "./paginas/Requisicoes";
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
        <Route path="requisicoes" element={<Requisicoes />} />
        <Route path="requisicoes/nova" element={<NovaRequisicao />} />
        <Route path="requisicoes/:id" element={<DetalheRequisicao />} />
        <Route path="requisicoes/:id/editar" element={<NovaRequisicao />} />
        <Route path="amostras" element={<Amostras />} />
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
