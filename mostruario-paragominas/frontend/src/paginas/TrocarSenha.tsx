import { FormEvent, useState } from "react";
import { enviar, Usuario } from "../api";
import { useSessao } from "../sessao";

export function TrocarSenha({ obrigatoria = false }: { obrigatoria?: boolean }) {
  const { atualizar, sair } = useSessao();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setOk(false);
    if (nova !== confirma) return setErro("A confirmação não confere com a nova senha");
    try {
      const u = await enviar<Usuario>("/api/auth/trocar-senha", "POST", { senha_atual: atual, nova_senha: nova });
      atualizar(u);
      setOk(true);
      setAtual("");
      setNova("");
      setConfirma("");
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  const formulario = (
    <form className="cartao login" onSubmit={submeter}>
      <h1>{obrigatoria ? "Defina sua senha" : "Trocar senha"}</h1>
      {obrigatoria && <p className="sutil">Seu acesso foi criado com uma senha temporária. Escolha uma nova para continuar.</p>}
      <label>
        Senha atual
        <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
      </label>
      <label>
        Nova senha (mínimo 8 caracteres)
        <input type="password" minLength={8} value={nova} onChange={(e) => setNova(e.target.value)} required />
      </label>
      <label>
        Confirme a nova senha
        <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
      </label>
      {erro && <div className="erro">{erro}</div>}
      {ok && <div className="sucesso">Senha alterada.</div>}
      <button className="primario">Salvar</button>
      {obrigatoria && (
        <button type="button" className="link" onClick={sair}>
          Sair
        </button>
      )}
    </form>
  );

  return obrigatoria ? <div className="centro">{formulario}</div> : formulario;
}
