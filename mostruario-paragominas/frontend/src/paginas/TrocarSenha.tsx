import { KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { enviar, Usuario } from "../api";
import { Cabecalho, useToast } from "../componentes/ui";
import { useSessao } from "../sessao";

export function TrocarSenha({ obrigatoria = false }: { obrigatoria?: boolean }) {
  const { atualizar, sair } = useSessao();
  const toast = useToast();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (nova !== confirma) return setErro("A confirmação não confere com a nova senha");
    try {
      const u = await enviar<Usuario>("/api/auth/trocar-senha", "POST", { senha_atual: atual, nova_senha: nova });
      atualizar(u);
      toast({ tipo: "ok", texto: "Senha alterada." });
      setAtual("");
      setNova("");
      setConfirma("");
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  const formulario = (
    <form className={obrigatoria ? "login" : "cartao formulario"} style={obrigatoria ? undefined : { maxWidth: 460 }} onSubmit={submeter}>
      {obrigatoria && (
        <div>
          <h1>Defina sua senha</h1>
          <p className="sutil" style={{ marginTop: 6 }}>
            Seu acesso foi criado com uma senha temporária. Escolha uma nova para continuar.
          </p>
        </div>
      )}
      <label>
        Senha atual
        <input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
      </label>
      <label>
        Nova senha (mínimo 8 caracteres)
        <input type="password" autoComplete="new-password" minLength={8} value={nova} onChange={(e) => setNova(e.target.value)} required />
      </label>
      <label>
        Confirme a nova senha
        <input type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
      </label>
      {erro && <div className="erro">{erro}</div>}
      <button className="primario">
        <KeyRound size={16} /> Salvar nova senha
      </button>
      {obrigatoria && (
        <button type="button" className="link" onClick={sair}>
          Sair
        </button>
      )}
    </form>
  );

  return obrigatoria ? (
    <div className="centro">{formulario}</div>
  ) : (
    <>
      <Cabecalho titulo="Trocar senha" />
      {formulario}
    </>
  );
}
