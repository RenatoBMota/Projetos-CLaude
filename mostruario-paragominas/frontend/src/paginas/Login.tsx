import { ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSessao } from "../sessao";

export function Login() {
  const { entrar } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="login-tela">
      <section className="login-marca">
        <div className="logo">
          <img src="/icone.svg" alt="" />
          Mostruário Paragominas
        </div>
        <div>
          <h2>Cada amostra rastreada, da requisição à devolução.</h2>
          <p>Aprovações, expedição, peças em exposição nas lojas e devoluções em um só lugar.</p>
          <ul>
            <li>
              <CheckCircle2 size={18} /> Aprovação comercial e logística
            </li>
            <li>
              <CheckCircle2 size={18} /> Valor em exposição por loja em tempo real
            </li>
            <li>
              <CheckCircle2 size={18} /> Devolução para estoque, descarte ou perda
            </li>
          </ul>
        </div>
        <span className="rodape">Gestão de amostras de pisos</span>
      </section>
      <div className="login-form-area">
        <form className="login" onSubmit={submeter}>
          <div>
            <h1>Entrar</h1>
            <p className="sutil" style={{ marginTop: 6 }}>
              Use o e-mail e a senha fornecidos pelo administrador.
            </p>
          </div>
          <label>
            E-mail
            <div className="campo-icone">
              <Mail size={16} />
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
          </label>
          <label>
            Senha
            <div className="campo-icone">
              <Lock size={16} />
              <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
          </label>
          {erro && <div className="erro">{erro}</div>}
          <button className="primario" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"} {!enviando && <ArrowRight size={18} />}
          </button>
          <p className="nota">Esqueceu a senha? Peça ao administrador para redefinir.</p>
        </form>
      </div>
    </div>
  );
}
