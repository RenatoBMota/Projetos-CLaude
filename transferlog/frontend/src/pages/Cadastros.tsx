import { Fragment, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { nomeUnidade, type Perfil, type Transportadora, type Unidade, type UsuarioListado } from "../api/types";

interface RotaSla {
  id: string;
  prazoHoras: number;
  origem: Unidade;
  destino: Unidade;
}

const PERFIS: Perfil[] = [
  "ADMINISTRADOR",
  "SUPERVISOR",
  "LIDER_LOJA",
  "OPERADOR",
  "SEPARADOR",
  "CONFERENTE",
  "ANALISTA",
  "AUDITORIA",
];

export function Cadastros() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [rotas, setRotas] = useState<RotaSla[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [u, r, us, t] = await Promise.all([
      api.get<Unidade[]>("/unidades"),
      api.get<RotaSla[]>("/unidades/rotas-sla"),
      api.get<UsuarioListado[]>("/usuarios"),
      api.get<Transportadora[]>("/transportadoras"),
    ]);
    setUnidades(u);
    setRotas(r);
    setUsuarios(us);
    setTransportadoras(t);
  }

  useEffect(() => {
    carregar().catch((err) => setErro(err.message));
  }, []);

  function tratarErro(err: unknown, fallback: string) {
    setErro(err instanceof ApiError ? err.message : fallback);
  }

  return (
    <div>
      <h1>Cadastros</h1>
      {erro && <div className="error-box">{erro}</div>}

      <NovaUnidade onCriada={carregar} onErro={setErro} />
      <ListaUnidades unidades={unidades} onAtualizado={carregar} onErro={tratarErro} />
      <NovaRotaSla unidades={unidades} onCriada={carregar} onErro={setErro} />
      <ListaRotas rotas={rotas} onAtualizado={carregar} onErro={tratarErro} />
      <NovaTransportadora onCriada={carregar} onErro={setErro} />
      <ListaTransportadoras transportadoras={transportadoras} onAtualizado={carregar} onErro={tratarErro} />
      <NovoUsuario unidades={unidades} onCriado={carregar} onErro={setErro} />
      <ListaUsuarios usuarios={usuarios} unidades={unidades} onAtualizado={carregar} onErro={tratarErro} />
    </div>
  );
}

function confirmar(mensagem: string): boolean {
  return window.confirm(mensagem);
}

// ---------- Unidades ----------

function NovaUnidade({ onCriada, onErro }: { onCriada: () => void; onErro: (e: string) => void }) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tipo, setTipo] = useState<"MATRIZ" | "FILIAL">("FILIAL");
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/unidades", { razaoSocial, nomeFantasia: nomeFantasia || undefined, cnpj, tipo });
      setRazaoSocial(""); setNomeFantasia(""); setCnpj("");
      onCriada();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar unidade");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova unidade</h2>
      <div className="form-row">
        <div className="field"><label>Razão social</label><input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} /></div>
        <div className="field"><label>Nome fantasia</label><input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} /></div>
        <div className="field"><label>CNPJ</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
        <div className="field">
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "MATRIZ" | "FILIAL")}>
            <option value="MATRIZ">Matriz</option>
            <option value="FILIAL">Filial</option>
          </select>
        </div>
      </div>
      <button className="primary" disabled={enviando || !razaoSocial || !cnpj} onClick={salvar}>
        Salvar unidade
      </button>
    </div>
  );
}

function ListaUnidades({
  unidades,
  onAtualizado,
  onErro,
}: {
  unidades: Unidade[];
  onAtualizado: () => void;
  onErro: (err: unknown, fallback: string) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ razaoSocial: string; nomeFantasia: string; cnpj: string; tipo: "MATRIZ" | "FILIAL"; ativa: boolean }>({
    razaoSocial: "", nomeFantasia: "", cnpj: "", tipo: "FILIAL", ativa: true,
  });
  const [salvando, setSalvando] = useState(false);

  function iniciarEdicao(u: Unidade) {
    setEditandoId(u.id);
    setForm({ razaoSocial: u.razaoSocial, nomeFantasia: u.nomeFantasia ?? "", cnpj: u.cnpj, tipo: u.tipo, ativa: u.ativa });
  }

  async function salvar(id: string) {
    setSalvando(true);
    try {
      await api.patch(`/unidades/${id}`, {
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || undefined,
        cnpj: form.cnpj,
        tipo: form.tipo,
        ativa: form.ativa,
      });
      setEditandoId(null);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao salvar unidade");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(u: Unidade) {
    if (!confirmar(`Excluir a unidade "${nomeUnidade(u)}"?`)) return;
    try {
      await api.delete(`/unidades/${u.id}`);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao excluir unidade");
    }
  }

  return (
    <div className="card">
      <h2>Unidades</h2>
      {unidades.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma unidade cadastrada ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Razão social</th><th>Fantasia</th><th>CNPJ</th><th>Tipo</th><th>Ativa</th><th></th></tr></thead>
          <tbody>
            {unidades.map((u) =>
              editandoId === u.id ? (
                <tr key={u.id}>
                  <td><input value={form.razaoSocial} onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))} /></td>
                  <td><input value={form.nomeFantasia} onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))} /></td>
                  <td><input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} /></td>
                  <td>
                    <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as "MATRIZ" | "FILIAL" }))}>
                      <option value="MATRIZ">Matriz</option>
                      <option value="FILIAL">Filial</option>
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={form.ativa} onChange={(e) => setForm((f) => ({ ...f, ativa: e.target.checked }))} />
                  </td>
                  <td>
                    <button disabled={salvando} onClick={() => salvar(u.id)}>Salvar</button>{" "}
                    <button disabled={salvando} onClick={() => setEditandoId(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.razaoSocial}</td>
                  <td>{u.nomeFantasia || "—"}</td>
                  <td>{u.cnpj}</td>
                  <td>{u.tipo === "MATRIZ" ? "Matriz" : "Filial"}</td>
                  <td>{u.ativa ? "Sim" : "Não"}</td>
                  <td>
                    <button onClick={() => iniciarEdicao(u)}>Editar</button>{" "}
                    <button className="danger" onClick={() => excluir(u)}>Excluir</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Rotas / SLA ----------

function ListaRotas({
  rotas,
  onAtualizado,
  onErro,
}: {
  rotas: RotaSla[];
  onAtualizado: () => void;
  onErro: (err: unknown, fallback: string) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [prazoHoras, setPrazoHoras] = useState(24);
  const [salvando, setSalvando] = useState(false);

  function iniciarEdicao(r: RotaSla) {
    setEditandoId(r.id);
    setPrazoHoras(r.prazoHoras);
  }

  async function salvar(id: string) {
    setSalvando(true);
    try {
      await api.patch(`/unidades/rotas-sla/${id}`, { prazoHoras });
      setEditandoId(null);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao salvar rota");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(r: RotaSla) {
    if (!confirmar(`Excluir a rota "${nomeUnidade(r.origem)} → ${nomeUnidade(r.destino)}"?`)) return;
    try {
      await api.delete(`/unidades/rotas-sla/${r.id}`);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao excluir rota");
    }
  }

  return (
    <div className="card">
      <h2>Rotas / SLA</h2>
      {rotas.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma rota cadastrada ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Origem</th><th>Destino</th><th>Prazo (h)</th><th></th></tr></thead>
          <tbody>
            {rotas.map((r) => (
              <tr key={r.id}>
                <td>{nomeUnidade(r.origem)}</td>
                <td>{nomeUnidade(r.destino)}</td>
                <td>
                  {editandoId === r.id ? (
                    <input type="number" style={{ width: 70 }} value={prazoHoras} onChange={(e) => setPrazoHoras(Number(e.target.value))} />
                  ) : (
                    r.prazoHoras
                  )}
                </td>
                <td>
                  {editandoId === r.id ? (
                    <>
                      <button disabled={salvando} onClick={() => salvar(r.id)}>Salvar</button>{" "}
                      <button disabled={salvando} onClick={() => setEditandoId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => iniciarEdicao(r)}>Editar</button>{" "}
                      <button className="danger" onClick={() => excluir(r)}>Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NovaRotaSla({
  unidades,
  onCriada,
  onErro,
}: {
  unidades: Unidade[];
  onCriada: () => void;
  onErro: (e: string) => void;
}) {
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [prazoHoras, setPrazoHoras] = useState(24);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/unidades/rotas-sla", { origemId, destinoId, prazoHoras });
      onCriada();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar rota");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova rota / SLA</h2>
      <div className="form-row">
        <div className="field">
          <label>Origem</label>
          <select value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
            <option value="">Selecione</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{nomeUnidade(u)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Destino</label>
          <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
            <option value="">Selecione</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{nomeUnidade(u)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Prazo (horas)</label>
          <input type="number" value={prazoHoras} onChange={(e) => setPrazoHoras(Number(e.target.value))} />
        </div>
      </div>
      <button className="primary" disabled={enviando || !origemId || !destinoId} onClick={salvar}>Salvar rota</button>
    </div>
  );
}

// ---------- Transportadoras ----------

function NovaTransportadora({ onCriada, onErro }: { onCriada: () => void; onErro: (e: string) => void }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/transportadoras", { nome, cnpj: cnpj || undefined, telefone: telefone || undefined });
      setNome(""); setCnpj(""); setTelefone("");
      onCriada();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar transportadora");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova transportadora</h2>
      <div className="form-row">
        <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="field"><label>CNPJ/CPF</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
        <div className="field"><label>Telefone</label><input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
      </div>
      <button className="primary" disabled={enviando || !nome} onClick={salvar}>Salvar transportadora</button>
    </div>
  );
}

function ListaTransportadoras({
  transportadoras,
  onAtualizado,
  onErro,
}: {
  transportadoras: Transportadora[];
  onAtualizado: () => void;
  onErro: (err: unknown, fallback: string) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nome: string; cnpj: string; telefone: string; ativa: boolean }>({
    nome: "", cnpj: "", telefone: "", ativa: true,
  });
  const [salvando, setSalvando] = useState(false);

  function iniciarEdicao(t: Transportadora) {
    setEditandoId(t.id);
    setForm({ nome: t.nome, cnpj: t.cnpj ?? "", telefone: t.telefone ?? "", ativa: t.ativa });
  }

  async function salvar(id: string) {
    setSalvando(true);
    try {
      await api.patch(`/transportadoras/${id}`, {
        nome: form.nome,
        cnpj: form.cnpj || undefined,
        telefone: form.telefone || undefined,
        ativa: form.ativa,
      });
      setEditandoId(null);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao salvar transportadora");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card">
      <h2>Transportadoras</h2>
      {transportadoras.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma transportadora cadastrada ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Nome</th><th>CNPJ/CPF</th><th>Telefone</th><th>Ativa</th><th></th></tr></thead>
          <tbody>
            {transportadoras.map((t) =>
              editandoId === t.id ? (
                <tr key={t.id}>
                  <td><input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></td>
                  <td><input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} /></td>
                  <td><input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} /></td>
                  <td><input type="checkbox" checked={form.ativa} onChange={(e) => setForm((f) => ({ ...f, ativa: e.target.checked }))} /></td>
                  <td>
                    <button disabled={salvando} onClick={() => salvar(t.id)}>Salvar</button>{" "}
                    <button disabled={salvando} onClick={() => setEditandoId(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.cnpj || "—"}</td>
                  <td>{t.telefone || "—"}</td>
                  <td>{t.ativa ? "Sim" : "Não"}</td>
                  <td><button onClick={() => iniciarEdicao(t)}>Editar</button></td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Usuários ----------

function NovoUsuario({
  unidades,
  onCriado,
  onErro,
}: {
  unidades: Unidade[];
  onCriado: () => void;
  onErro: (e: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("OPERADOR");
  const [unidadeIds, setUnidadeIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  function toggleUnidade(id: string) {
    setUnidadeIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/usuarios", { nome, email, senha, perfil, unidadeIds });
      setNome(""); setEmail(""); setSenha(""); setUnidadeIds([]);
      onCriado();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar usuário");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Novo usuário</h2>
      <div className="form-row">
        <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="field"><label>E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>Senha</label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        <div className="field">
          <label>Perfil</label>
          <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
            {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Filiais vinculadas</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {unidades.map((u) => (
            <label key={u.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={unidadeIds.includes(u.id)} onChange={() => toggleUnidade(u.id)} />
              {nomeUnidade(u)}
            </label>
          ))}
        </div>
      </div>
      <button className="primary" disabled={enviando || !nome || !email || !senha} onClick={salvar}>Salvar usuário</button>
    </div>
  );
}

function ListaUsuarios({
  usuarios,
  unidades,
  onAtualizado,
  onErro,
}: {
  usuarios: UsuarioListado[];
  unidades: Unidade[];
  onAtualizado: () => void;
  onErro: (err: unknown, fallback: string) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nome: string; email: string; perfil: Perfil; ativo: boolean; unidadeIds: string[] }>({
    nome: "", email: "", perfil: "OPERADOR", ativo: true, unidadeIds: [],
  });
  const [resetandoId, setResetandoId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function iniciarEdicao(u: UsuarioListado) {
    setEditandoId(u.id);
    setResetandoId(null);
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo, unidadeIds: u.unidades.map((v) => v.unidadeId) });
  }

  function toggleUnidadeForm(id: string) {
    setForm((f) => ({
      ...f,
      unidadeIds: f.unidadeIds.includes(id) ? f.unidadeIds.filter((u) => u !== id) : [...f.unidadeIds, id],
    }));
  }

  async function salvar(id: string) {
    setSalvando(true);
    try {
      await api.patch(`/usuarios/${id}`, form);
      setEditandoId(null);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao salvar usuário");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(u: UsuarioListado) {
    if (!confirmar(`Excluir o usuário "${u.nome}"?`)) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      onAtualizado();
    } catch (err) {
      onErro(err, "Erro ao excluir usuário");
    }
  }

  function iniciarReset(u: UsuarioListado) {
    setResetandoId(u.id);
    setEditandoId(null);
    setNovaSenha("");
    setMensagem(null);
  }

  async function resetarSenha(id: string) {
    setSalvando(true);
    try {
      await api.post(`/usuarios/${id}/resetar-senha`, { novaSenha });
      setResetandoId(null);
      setMensagem("Senha redefinida com sucesso.");
    } catch (err) {
      onErro(err, "Erro ao redefinir senha");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card">
      <h2>Usuários</h2>
      {mensagem && <p style={{ color: "var(--ok)" }}>{mensagem}</p>}
      {usuarios.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhum usuário cadastrado ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Filiais</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <Fragment key={u.id}>
                {editandoId === u.id ? (
                  <tr key={u.id}>
                    <td><input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></td>
                    <td><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></td>
                    <td>
                      <select value={form.perfil} onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value as Perfil }))}>
                        {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 240 }}>
                        {unidades.map((un) => (
                          <label key={un.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12 }}>
                            <input type="checkbox" checked={form.unidadeIds.includes(un.id)} onChange={() => toggleUnidadeForm(un.id)} />
                            {nomeUnidade(un)}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
                    </td>
                    <td>
                      <button disabled={salvando} onClick={() => salvar(u.id)}>Salvar</button>{" "}
                      <button disabled={salvando} onClick={() => setEditandoId(null)}>Cancelar</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.perfil}</td>
                    <td>{u.unidades.map((v) => nomeUnidade(v.unidade)).join(", ") || "—"}</td>
                    <td>{u.ativo ? "Sim" : "Não"}</td>
                    <td>
                      <button onClick={() => iniciarEdicao(u)}>Editar</button>{" "}
                      <button onClick={() => iniciarReset(u)}>Resetar senha</button>{" "}
                      <button className="danger" onClick={() => excluir(u)}>Excluir</button>
                    </td>
                  </tr>
                )}
                {resetandoId === u.id && (
                  <tr key={`${u.id}-reset`}>
                    <td colSpan={6}>
                      <div className="form-row" style={{ alignItems: "flex-end" }}>
                        <div className="field">
                          <label>Nova senha para {u.nome}</label>
                          <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                        </div>
                        <button className="primary" disabled={salvando || novaSenha.length < 6} onClick={() => resetarSenha(u.id)}>
                          Confirmar
                        </button>
                        <button disabled={salvando} onClick={() => setResetandoId(null)}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
