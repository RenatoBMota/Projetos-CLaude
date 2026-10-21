import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./estilo.css";
import { ProvedorAtualizacao } from "./componentes/atualizacao";
import { Layout } from "./componentes/Layout";
import { Carregando, ProvedorToasts } from "./componentes/ui";
import { Amostras } from "./paginas/Amostras";
import { DetalheRequisicao } from "./paginas/DetalheRequisicao";
import { Inicio } from "./paginas/Inicio";
import { Login } from "./paginas/Login";
import { NovaRequisicao } from "./paginas/NovaRequisicao";
import { Requisicoes } from "./paginas/Requisicoes";
import { TrocarSenha } from "./paginas/TrocarSenha";
import { PERFIS_RELATORIOS, ProvedorSessao, temPerfil, useSessao } from "./sessao";

// Telas pesadas (gráficos, cadastros) carregadas só quando abertas
const Relatorios = lazy(() => import("./paginas/Relatorios").then((m) => ({ default: m.Relatorios })));
const Configuracao = lazy(() => import("./paginas/Configuracao").then((m) => ({ default: m.Configuracao })));

function App() {
  const { usuario, carregando } = useSessao();
  if (carregando)
    return (
      <div className="centro">
        <img src="/icone.svg" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
      </div>
    );
  if (!usuario) return <Login />;
  if (usuario.trocar_senha) return <TrocarSenha obrigatoria />;
  return (
    <ProvedorAtualizacao>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="minha-senha" element={<TrocarSenha />} />
            <Route path="requisicoes" element={<Requisicoes />} />
            <Route path="requisicoes/nova" element={<NovaRequisicao />} />
            <Route path="requisicoes/:id" element={<DetalheRequisicao />} />
            <Route path="requisicoes/:id/editar" element={<NovaRequisicao />} />
            <Route path="amostras" element={<Amostras />} />
            {temPerfil(usuario, ...PERFIS_RELATORIOS) && <Route path="relatorios/*" element={<Relatorios />} />}
            {temPerfil(usuario, "admin") && <Route path="configuracao/*" element={<Configuracao />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ProvedorAtualizacao>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvedorToasts>
        <ProvedorSessao>
          <App />
        </ProvedorSessao>
      </ProvedorToasts>
    </BrowserRouter>
  </React.StrictMode>,
);
