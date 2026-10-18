import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, enviar, Pagina, Perfil, PERFIS, Usuario } from "../api";
import { Modal } from "../componentes/Modal";
import { useSessao } from "../sessao";

interface Filial {
  id: number;
  codigo: string;
  nome: string;
}

const rotuloPerfil = (p: Perfil) => PERFIS.find((x) => x.valor === p)?.rotulo ?? p;

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [editando, setEditando] = useState<Usuario | "novo" | null>(null);
  const [senhaDe, setSenhaDe] = useState<Usuario | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    api<Usuario[]>("/api/usuarios").then(setUsuarios).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    carregar();
    api<Pagina<Filial>>("/api/cadastros/filiais?ativos=true&limite=500").then((r) => setFiliais(r.itens));
  }, [carregar]);

  const nomeFilial = (id: number | null) => (id ? filiais.find((f) => f.id === id)?.nome ?? `#${id}` : "Corporativo");

  return (
    <section className="cartao">
      <div className="barra">
        <p className="sutil">
          Novos usuários recebem uma senha temporária e precisam trocá-la no primeiro acesso.
        </p>
        <span className="espaco" />
        <button className="primario" onClick={() => setEditando("novo")}>
          Novo usuário
        </button>
      </div>
      {erro && <div className="erro">{erro}</div>}
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Filial</th>
              <th>Perfis</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={u.ativo ? "" : "inativo"}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  {nomeFilial(u.filial_id)}
                  {u.filiais.length > 0 && <small className="sutil"> +{u.filiais.length} na abrangência</small>}
                </td>
                <td>
                  {u.perfis.map((p) => (
                    <span key={p} className="selo">
                      {rotuloPerfil(p)}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`selo ${u.ativo ? "ok" : ""}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                  {u.trocar_senha && <span className="selo aviso">Senha temporária</span>}
                </td>
                <td className="acoes">
                  <button className="link" onClick={() => setEditando(u)}>
                    Editar
                  </button>
                  <button className="link" onClick={() => setSenhaDe(u)}>
                    Redefinir senha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editando && (
        <FormularioUsuario
          usuario={editando === "novo" ? null : editando}
          filiais={filiais}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
      {senhaDe && (
        <RedefinirSenha
          usuario={senhaDe}
          aoFechar={() => setSenhaDe(null)}
          aoSalvar={() => {
            setSenhaDe(null);
            carregar();
          }}
        />
      )}
    </section>
  );
}

function FormularioUsuario({
  usuario,
  filiais,
  aoFechar,
  aoSalvar,
}: {
  usuario: Usuario | null;
  filiais: Filial[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const { usuario: eu, atualizar } = useSessao();
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [matricula, setMatricula] = useState(usuario?.matricula ?? "");
  const [filialId, setFilialId] = useState<string>(usuario?.filial_id ? String(usuario.filial_id) : "");
  const [perfis, setPerfis] = useState<Perfil[]>(usuario?.perfis ?? []);
  const [abrangencia, setAbrangencia] = useState<number[]>(usuario?.filiais ?? []);
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const alternar = <T,>(lista: T[], item: T) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (perfis.length === 0) return setErro("Selecione pelo menos um perfil");
    setErro("");
    setSalvando(true);
    const corpo = {
      nome,
      email,
      matricula: matricula || null,
      filial_id: filialId ? Number(filialId) : null,
      perfis,
      filiais: abrangencia,
    };
    try {
      if (usuario) {
        const u = await enviar<Usuario>(`/api/usuarios/${usuario.id}`, "PUT", { ...corpo, ativo });
        if (u.id === eu?.id) atualizar(u);
      } else {
        await enviar("/api/usuarios", "POST", { ...corpo, senha_temporaria: senha });
      }
      aoSalvar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={usuario ? "Editar usuário" : "Novo usuário"} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <label>
          Nome *
          <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
        </label>
        <label>
          E-mail (login) *
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <div className="linha">
          <label>
            Matrícula
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} />
          </label>
          <label>
            Filial de lotação
            <select value={filialId} onChange={(e) => setFilialId(e.target.value)}>
              <option value="">Corporativo (sem filial)</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} · {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!usuario && (
          <label>
            Senha temporária * (mínimo 8 caracteres)
            <input value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
          </label>
        )}

        <fieldset>
          <legend>Perfis (permissões)</legend>
          {PERFIS.map((p) => (
            <label key={p.valor} className="check opcao">
              <input type="checkbox" checked={perfis.includes(p.valor)} onChange={() => setPerfis(alternar(perfis, p.valor))} />
              <span>
                <b>{p.rotulo}</b>
                <small>{p.descricao}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Abrangência — filiais adicionais que pode ver/atender</legend>
          {filiais.length === 0 && <p className="sutil">Nenhuma filial cadastrada ainda (Cadastros › Filiais).</p>}
          <div className="grade-check">
            {filiais.map((f) => (
              <label key={f.id} className="check">
                <input
                  type="checkbox"
                  checked={abrangencia.includes(f.id)}
                  onChange={() => setAbrangencia(alternar(abrangencia, f.id))}
                />
                {f.nome}
              </label>
            ))}
          </div>
        </fieldset>

        {usuario && (
          <label className="check">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo (desmarque para bloquear o acesso)
          </label>
        )}
        {erro && <div className="erro">{erro}</div>}
        <footer>
          <button type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primario" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function RedefinirSenha({ usuario, aoFechar, aoSalvar }: { usuario: Usuario; aoFechar: () => void; aoSalvar: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await enviar(`/api/usuarios/${usuario.id}/redefinir-senha`, "POST", { senha_temporaria: senha });
      aoSalvar();
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  return (
    <Modal titulo={`Redefinir senha — ${usuario.nome}`} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <p className="sutil">O usuário terá de trocar esta senha temporária no próximo acesso.</p>
        <label>
          Senha temporária (mínimo 8 caracteres)
          <input value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoFocus />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <footer>
          <button type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primario">Redefinir</button>
        </footer>
      </form>
    </Modal>
  );
}
