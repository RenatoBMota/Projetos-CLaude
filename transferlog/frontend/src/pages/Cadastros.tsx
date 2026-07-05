import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { nomeUnidade, type Perfil, type Unidade } from "../api/types";

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
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [u, r] = await Promise.all([
      api.get<Unidade[]>("/unidades"),
      api.get<RotaSla[]>("/unidades/rotas-sla"),
    ]);
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

      <NovaUnidade onCriada={carregar} onErro={setErro} />
      <ListaUnidades unidades={unidades} />
      <NovaRotaSla unidades={unidades} onCriada={carregar} onErro={setErro} />
      <ListaRotas rotas={rotas} />
      <NovoUsuario unidades={unidades} onErro={setErro} />
    </div>
  );
}

function ListaUnidades({ unidades }: { unidades: Unidade[] }) {
  return (
    <div className="card">
      <h2>Unidades</h2>
      {unidades.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma unidade cadastrada ainda.</p>
      ) : (
        <table>
          <thead><tr><th>Razão social</th><th>Fantasia</th><th>CNPJ</th><th>Tipo</th><th>Ativa</th></tr></thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id}>
                <td>{u.razaoSocial}</td>
                <td>{u.nomeFantasia || "—"}</td>
                <td>{u.cnpj}</td>
                <td>{u.tipo === "MATRIZ" ? "Matriz" : "Filial"}</td>
                <td>{u.ativa ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NovaUnidade({ onCriada, onErro }: { onCriada: () => void; onErro: (e: string) => void }) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tipo, setTipo] = useState<"MATRIZ" | "FILIAL">("FILIAL");
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setEnviando(true);
    try {
      await api.post("/unidades", {
        razaoSocial,
        nomeFantasia: nomeFantasia || undefined,
        cnpj,
        tipo,
      });
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
        <div className="field">
          <label>Razão social</label>
          <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
        </div>
        <div className="field">
          <label>Nome fantasia</label>
          <input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
        </div>
        <div className="field">
          <label>CNPJ</label>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </div>
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

function ListaRotas({ rotas }: { rotas: RotaSla[] }) {
  return (
    <div className="card">
      <h2>Rotas / SLA</h2>
      <table>
        <thead><tr><th>Origem</th><th>Destino</th><th>Prazo (h)</th></tr></thead>
        <tbody>
          {rotas.map((r) => (
            <tr key={r.id}>
              <td>{nomeUnidade(r.origem)}</td>
              <td>{nomeUnidade(r.destino)}</td>
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
              {nomeUnidade(u)}
            </label>
          ))}
        </div>
      </div>
      <button className="primary" disabled={enviando} onClick={salvar}>Salvar usuário</button>
    </div>
  );
}
