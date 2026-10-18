import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, Pagina } from "../api";
import { data, moeda, PRIORIDADES, STATUS, useFiliais } from "../formato";
import { temPerfil, useSessao } from "../sessao";

interface Linha {
  id: number;
  protocolo: string;
  status: string;
  prioridade: number;
  criado_em: string;
  filial_nome: string;
  requisitante_nome: string;
  itens: number;
  valor_solicitado: number;
  valor_em_loja: number;
}

export const FILAS: Record<string, { rotulo: string; perfis: string[] }> = {
  rascunhos: { rotulo: "Meus rascunhos", perfis: ["requisitante"] },
  comercial: { rotulo: "Aprovação comercial", perfis: ["aprovador_comercial"] },
  logistica: { rotulo: "Aprovação logística", perfis: ["aprovador_logistica"] },
  expedicao: { rotulo: "A expedir", perfis: ["deposito"] },
  devolucao: { rotulo: "Em loja (devolução)", perfis: ["deposito", "gestor"] },
};

const POR_PAGINA = 30;

export function Requisicoes() {
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const filiais = useFiliais();
  const fila = params.get("fila") ?? "";
  const minhas = params.get("minhas") === "1";
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [filial, setFilial] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Pagina<Linha> | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ busca, pagina: String(pagina), limite: String(POR_PAGINA) });
    if (fila) q.set("fila", fila);
    if (minhas) q.set("minhas", "true");
    if (status) q.set("status", status);
    if (filial) q.set("filial_id", filial);
    const t = setTimeout(
      () =>
        api<Pagina<Linha>>(`/api/solicitacoes?${q}`)
          .then(setDados)
          .catch((e) => setErro(e.message)),
      200,
    );
    return () => clearTimeout(t);
  }, [busca, fila, minhas, status, filial, pagina]);

  const escolher = (novo: Record<string, string>) => {
    setPagina(1);
    setParams(novo);
  };
  const filasVisiveis = Object.entries(FILAS).filter(([, f]) => temPerfil(usuario, ...f.perfis));
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / POR_PAGINA)) : 1;

  return (
    <>
      <div className="titulo">
        <h1>Requisições</h1>
        {temPerfil(usuario, "requisitante") && (
          <Link className="botao primario" to="/requisicoes/nova">
            Nova requisição
          </Link>
        )}
      </div>
      <nav className="subabas">
        <button className={!fila && !minhas ? "ativa" : ""} onClick={() => escolher({})}>
          Todas
        </button>
        {temPerfil(usuario, "requisitante") && (
          <button className={minhas ? "ativa" : ""} onClick={() => escolher({ minhas: "1" })}>
            Minhas
          </button>
        )}
        {filasVisiveis.map(([chave, f]) => (
          <button key={chave} className={fila === chave ? "ativa" : ""} onClick={() => escolher({ fila: chave })}>
            {f.rotulo}
          </button>
        ))}
      </nav>
      <section className="cartao">
        <div className="barra">
          <input
            className="busca"
            placeholder="Protocolo, requisitante, SKU ou produto…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          <select className="filtro" value={status} onChange={(e) => (setStatus(e.target.value), setPagina(1))}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([v, s]) => (
              <option key={v} value={v}>
                {s.rotulo}
              </option>
            ))}
          </select>
          {filiais.length > 1 && (
            <select className="filtro" value={filial} onChange={(e) => (setFilial(e.target.value), setPagina(1))}>
              <option value="">Todas as filiais</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        {erro && <div className="erro">{erro}</div>}
        <div className="tabela-rolagem">
          <table className="clicavel">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Data</th>
                <th>Filial</th>
                <th>Requisitante</th>
                <th className="num">Itens</th>
                <th className="num">Valor solicitado</th>
                <th className="num">Em loja</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dados?.itens.map((r) => (
                <tr key={r.id} onClick={() => navegar(`/requisicoes/${r.id}`)}>
                  <td>
                    <Link to={`/requisicoes/${r.id}`}>{r.protocolo}</Link>
                  </td>
                  <td>{data(r.criado_em)}</td>
                  <td>{r.filial_nome}</td>
                  <td>{r.requisitante_nome}</td>
                  <td className="num">{r.itens}</td>
                  <td className="num">{moeda(r.valor_solicitado)}</td>
                  <td className="num">{Number(r.valor_em_loja) ? moeda(r.valor_em_loja) : "—"}</td>
                  <td>{r.prioridade === 1 ? <span className="selo ruim">Alta</span> : PRIORIDADES[r.prioridade]}</td>
                  <td>
                    <SeloStatus status={r.status} />
                  </td>
                </tr>
              ))}
              {dados && dados.itens.length === 0 && (
                <tr>
                  <td colSpan={9} className="vazio">
                    Nenhuma requisição encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {dados && dados.total > POR_PAGINA && (
          <div className="paginacao">
            <span>{dados.total} requisição(ões)</span>
            <span className="espaco" />
            <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </button>
            <span>
              {pagina} / {paginas}
            </span>
            <button disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
              Próxima
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export function SeloStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { rotulo: status, cor: "" };
  return <span className={`selo ${s.cor}`}>{s.rotulo}</span>;
}
