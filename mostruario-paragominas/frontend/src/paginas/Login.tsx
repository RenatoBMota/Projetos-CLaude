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
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="centro">
      <form className="cartao login" onSubmit={submeter}>
        <h1>Mostruário Paragominas</h1>
        <p className="sutil">Controle de amostras de pisos</p>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <button className="primario" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
