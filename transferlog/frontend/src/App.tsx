import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { DashboardOperacional } from "./pages/DashboardOperacional";
import { DashboardGerencial } from "./pages/DashboardGerencial";
import { UploadNota } from "./pages/UploadNota";
import { FilaTransferencias } from "./pages/FilaTransferencias";
import { TransferenciaDetalhe } from "./pages/TransferenciaDetalhe";
import { Cadastros } from "./pages/Cadastros";

function Rotas() {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardOperacional />} />
        <Route path="/transferencias" element={<FilaTransferencias />} />
        <Route path="/transferencias/:id" element={<TransferenciaDetalhe />} />
        <Route path="/upload" element={<UploadNota />} />
        <Route path="/dashboard-gerencial" element={<DashboardGerencial />} />
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  );
}

export default App;
