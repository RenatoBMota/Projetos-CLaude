import { ChevronLeft, ChevronRight, Flag, Plus, Search, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, Pagina } from "../api";
import { Cabecalho, Carregando, SeloStatus, Vazio } from "../componentes/ui";
import { data, moeda, STATUS, useFiliais } from "../formato";
import { temPerfil, useSessao } from "../sessao";

export { SeloStatus };

export interface LinhaRequisicao {
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
  devolucao: { rotulo: "Em loja", perfis: ["deposito", "gestor"] },
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
  const [dados, setDados] = useState<Pagina<LinhaRequisicao> | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ busca, pagina: String(pagina), limite: String(POR_PAGINA) });
    if (fila) q.set("fila", fila);
    if (minhas) q.set("minhas", "true");
    if (status) q.set("status", status);
    if (filial) q.set("filial_id", filial);
    const t = setTimeout(
      () =>
        api<Pagina<LinhaRequisicao>>(`/api/solicitacoes?${q}`)
          .then(setDados)
          .catch((e) => setErro(e.message)),
      200,
    );
    return () => clearTimeout(t);
  }, [busca, fila, minhas, status, filial, pagina]);

  const escolher = (novo: Record<string, string>) => {
    setPagina(1);
    setDados(null);
    setParams(novo);
  };
  const filasVisiveis = Object.entries(FILAS).filter(([, f]) => temPerfil(usuario, ...f.perfis));
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / POR_PAGINA)) : 1;
  const filtrando = !!(busca || status || filial || fila || minhas);
  const requisitante = temPerfil(usuario, "requisitante");

  return (
    <>
      <Cabecalho
        titulo="Requisições"
        subtitulo={dados ? `${dados.total} ${dados.total === 1 ? "requisição" : "requisições"}` : " "}
        acoes={
          requisitante && (
            <Link className="botao primario so-desktop" to="/requisicoes/nova">
              <Plus size={18} /> Nova requisição
            </Link>
          )
        }
      />
      <nav className="subabas">
        <button className={!fila && !minhas ? "ativa" : ""} onClick={() => escolher({})}>
          Todas
        </button>
        {requisitante && (
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
      <div className="barra">
        <div className="campo-icone busca">
          <Search size={16} />
          <input
            placeholder="Protocolo, requisitante, SKU ou produto"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <select className="filtro" value={status} onChange={(e) => (setStatus(e.target.value), setPagina(1))} aria-label="Status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([v, s]) => (
            <option key={v} value={v}>
              {s.rotulo}
            </option>
          ))}
        </select>
        {filiais.length > 1 && (
          <select className="filtro" value={filial} onChange={(e) => (setFilial(e.target.value), setPagina(1))} aria-label="Filial">
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

      {!dados ? (
        <div className="cartao">
          <Carregando />
        </div>
      ) : dados.itens.length === 0 ? (
        <div className="cartao">
          <Vazio
            icone={SearchX}
            titulo={filtrando ? "Nada encontrado" : "Nenhuma requisição ainda"}
            texto={filtrando ? "Tente outro filtro ou termo de busca." : requisitante ? "Crie a primeira requisição de amostras." : undefined}
            acao={
              !filtrando &&
              requisitante && (
                <Link className="botao primario" to="/requisicoes/nova">
                  <Plus size={16} /> Nova requisição
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          <section className="cartao so-desktop" style={{ padding: "0 18px" }}>
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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.itens.map((r) => (
                    <tr key={r.id} onClick={() => navegar(`/requisicoes/${r.id}`)}>
                      <td>
                        <Link to={`/requisicoes/${r.id}`} className="protocolo">
                          {r.protocolo}
                        </Link>
                        {r.prioridade === 1 && (
                          <span className="selo ruim" style={{ marginLeft: 8 }}>
                            <Flag /> Alta
                          </span>
                        )}
                      </td>
                      <td>{data(r.criado_em)}</td>
                      <td>{r.filial_nome}</td>
                      <td>{r.requisitante_nome}</td>
                      <td className="num">{r.itens}</td>
                      <td className="num">{moeda(r.valor_solicitado)}</td>
                      <td className="num">{Number(r.valor_em_loja) ? moeda(r.valor_em_loja) : "—"}</td>
                      <td>
                        <SeloStatus status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="lista-cartoes so-celular">
            {dados.itens.map((r) => (
              <Link key={r.id} to={`/requisicoes/${r.id}`} className="item-cartao">
                <div className="topo-item">
                  <span className="protocolo">
                    {r.protocolo} {r.prioridade === 1 && <Flag size={14} color="var(--erro)" />}
                  </span>
                  <SeloStatus status={r.status} />
                </div>
                <div className="meta">
                  <span>{r.filial_nome}</span>
                  <span>{r.requisitante_nome}</span>
                  <span>{data(r.criado_em)}</span>
                </div>
                <div className="valor">
                  {moeda(r.valor_solicitado)}{" "}
                  <span className="sutil" style={{ fontWeight: 450, fontSize: 13 }}>
                    · {r.itens} {r.itens === 1 ? "item" : "itens"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {dados && dados.total > POR_PAGINA && (
        <div className="paginacao">
          <span>
            Página {pagina} de {paginas}
          </span>
          <span className="espaco" />
          <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label="Anterior">
            <ChevronLeft size={16} />
          </button>
          <button disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label="Próxima">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
