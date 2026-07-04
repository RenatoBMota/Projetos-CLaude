import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Perfil, Unidade } from "../api/types";

interface RotaSla {
  id: string;
  prazoHoras: number;
  origem: Unidade;
  destino: Unidade;
}

interface Empresa {
  id: string;
  razaoSocial: string;
  cnpjMatriz: string;
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
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [rotas, setRotas] = useState<RotaSla[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [e, u, r] = await Promise.all([
      api.get<Empresa[]>("/empresas"),
      api.get<Unidade[]>("/unidades"),
      api.get<RotaSla[]>("/unidades/rotas-sla"),
    ]);
    setEmpresas(e);
    setUnidades(u);
    setRotas(r);
  }

  useEffect(() => {
    carregar().catch((err) => setErro(err.message));
  }, []);

  return (
    <div>
      <h1>Cadastros</h1>
      {erro && <div className="error-box">{erro}</div>}

      <NovaEmpresa onCriada={carregar} onErro={setErro} />
      <ListaEmpresas empresas={empresas} />
      <NovaUnidade empresas={empresas} onCriada={carregar} onErro={setErro} />
      <ListaUnidades unidades={unidades} />
      <NovaRotaSla unidades={unidades} onCriada={carregar} onErro={setErro} />
      <ListaRotas rotas={rotas} />
      <NovoUsuario unidades={unidades} onErro={setErro} />
    </div>
  );
}

function ListaEmpresas({ empresas }: { empresas: Empresa[] }) {
  return (
    <div className="card">
      <h2>Empresas</h2>
      {empresas.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Razão social</th><th>CNPJ matriz</th></tr></thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id}>
                <td>{e.razaoSocial}</td>
                <td>{e.cnpjMatriz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NovaEmpresa({ onCriada, onErro }: { onCriada: () => void; onErro: (e: string) => void }) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpjMatriz, setCnpjMatriz] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/empresas", { razaoSocial, cnpjMatriz });
      setRazaoSocial(""); setCnpjMatriz("");
      onCriada();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar empresa");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova empresa (Matriz)</h2>
      <div className="form-row">
        <div className="field">
          <label>Razão social</label>
          <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
        </div>
        <div className="field">
          <label>CNPJ da matriz</label>
          <input value={cnpjMatriz} onChange={(e) => setCnpjMatriz(e.target.value)} />
        </div>
      </div>
      <button className="primary" disabled={enviando || !razaoSocial || !cnpjMatriz} onClick={salvar}>
        Salvar empresa
      </button>
    </div>
  );
}

function ListaUnidades({ unidades }: { unidades: Unidade[] }) {
  return (
    <div className="card">
      <h2>Unidades</h2>
      <table>
        <thead><tr><th>Nome</th><th>CNPJ</th><th>Cidade/UF</th><th>Tipo</th><th>Ativa</th></tr></thead>
        <tbody>
          {unidades.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>{u.cnpj}</td>
              <td>{u.cidade}/{u.uf}</td>
              <td>{u.tipo}</td>
              <td>{u.ativa ? "Sim" : "Não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NovaUnidade({
  empresas,
  onCriada,
  onErro,
}: {
  empresas: Empresa[];
  onCriada: () => void;
  onErro: (e: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [tipo, setTipo] = useState<"CD" | "LOJA">("LOJA");
  const [empresaId, setEmpresaId] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!empresaId && empresas.length > 0) setEmpresaId(empresas[0].id);
  }, [empresas, empresaId]);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/unidades", { nome, cnpj, cidade, uf, tipo, empresaId });
      setNome(""); setCnpj(""); setCidade(""); setUf("");
      onCriada();
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar unidade");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova unidade (Matriz, CD ou Loja)</h2>
      {empresas.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Cadastre uma empresa primeiro.</p>
      ) : (
        <>
          <div className="form-row">
            <div className="field">
              <label>Empresa</label>
              <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
              </select>
            </div>
            <div className="field"><label>Nome (ex: Matriz, Loja 03)</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="field"><label>CNPJ</label><input value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
            <div className="field"><label>Cidade</label><input value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
            <div className="field"><label>UF</label><input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} /></div>
            <div className="field">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as "CD" | "LOJA")}>
                <option value="LOJA">Loja</option>
                <option value="CD">Centro de Distribuição</option>
              </select>
            </div>
          </div>
          <button className="primary" disabled={enviando || !nome || !cnpj} onClick={salvar}>Salvar unidade</button>
        </>
      )}
    </div>
  );
}

function ListaRotas({ rotas }: { rotas: RotaSla[] }) {
  return (
    <div className="card">
      <h2>Rotas / SLA</h2>
      <table>
        <thead><tr><th>Origem</th><th>Destino</th><th>Prazo (h)</th></tr></thead>
        <tbody>
          {rotas.map((r) => (
            <tr key={r.id}>
              <td>{r.origem.nome}</td>
              <td>{r.destino.nome}</td>
              <td>{r.prazoHoras}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Destino</label>
          <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
            <option value="">Selecione</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
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

function NovoUsuario({ unidades, onErro }: { unidades: Unidade[]; onErro: (e: string) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("OPERADOR");
  const [unidadeIds, setUnidadeIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function toggleUnidade(id: string) {
    setUnidadeIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function salvar() {
    setEnviando(true);
    setSucesso(false);
    try {
      await api.post("/usuarios", { nome, email, senha, perfil, unidadeIds });
      setNome(""); setEmail(""); setSenha(""); setUnidadeIds([]);
      setSucesso(true);
    } catch (err) {
      onErro(err instanceof ApiError ? err.message : "Erro ao criar usuário");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card">
      <h2>Novo usuário</h2>
      {sucesso && <p style={{ color: "var(--ok)" }}>Usuário criado com sucesso.</p>}
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
              {u.nome}
            </label>
          ))}
        </div>
      </div>
      <button className="primary" disabled={enviando} onClick={salvar}>Salvar usuário</button>
    </div>
  );
}
