import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
      navigate("/");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>TransferLog</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          Torre de controle de transferências entre filiais
        </p>
        {erro && <div className="error-box">{erro}</div>}
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        <button type="submit" className="primary" disabled={carregando} style={{ width: "100%" }}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
