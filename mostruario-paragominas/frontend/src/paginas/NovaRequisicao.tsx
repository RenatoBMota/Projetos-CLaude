import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, enviar, Pagina } from "../api";
import { moeda, useFiliais } from "../formato";
import { temPerfil, useSessao } from "../sessao";

interface Produto {
  id: number;
  sku: string;
  descricao: string;
  unidade: string;
  custo_referencia: number;
  fornecedor_nome: string | null;
}

interface Linha {
  produto: Produto;
  quantidade: string;
}

export function NovaRequisicao() {
  const { id } = useParams();
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const todasFiliais = useFiliais();
  // Mostra só as filiais da abrangência (o backend também valida).
  const permitidas = new Set([...(usuario?.filiais ?? []), ...(usuario?.filial_id ? [usuario.filial_id] : [])]);
  const filiais =
    temPerfil(usuario, "gestor", "admin") || permitidas.size === 0
      ? todasFiliais
      : todasFiliais.filter((f) => permitidas.has(f.id));
  const [filialId, setFilialId] = useState<string>(usuario?.filial_id ? String(usuario.filial_id) : "");
  const [prioridade, setPrioridade] = useState("2");
  const [finalidade, setFinalidade] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<Produto[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Edição de rascunho
  useEffect(() => {
    if (!id) return;
    api<{
      filial_id: number;
      prioridade: number;
      finalidade: string | null;
      justificativa: string | null;
      itens: { produto_id: number; sku: string; descricao: string; unidade: string; custo_referencia: number; fornecedor_nome: string | null; quantidade_solicitada: number }[];
    }>(`/api/solicitacoes/${id}`).then((s) => {
      setFilialId(String(s.filial_id));
      setPrioridade(String(s.prioridade));
      setFinalidade(s.finalidade ?? "");
      setJustificativa(s.justificativa ?? "");
      setLinhas(
        s.itens.map((i) => ({
          produto: { id: i.produto_id, sku: i.sku, descricao: i.descricao, unidade: i.unidade, custo_referencia: i.custo_referencia, fornecedor_nome: i.fornecedor_nome },
          quantidade: String(Number(i.quantidade_solicitada)),
        })),
      );
    });
  }, [id]);

  // Sem filial de lotação: sugere a primeira disponível
  useEffect(() => {
    if (!filialId && filiais.length === 1) setFilialId(String(filiais[0].id));
  }, [filiais.length, filialId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (busca.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(() => {
      const q = new URLSearchParams({ busca, ativos: "true", limite: "15" });
      api<Pagina<Produto>>(`/api/cadastros/produtos?${q}`).then((r) => setSugestoes(r.itens));
    }, 200);
    return () => clearTimeout(t);
  }, [busca]);

  const adicionar = (p: Produto) => {
    if (!linhas.some((l) => l.produto.id === p.id)) setLinhas([...linhas, { produto: p, quantidade: "1" }]);
    setBusca("");
    setSugestoes([]);
  };

  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const total = linhas.reduce((t, l) => t + num(l.quantidade) * Number(l.produto.custo_referencia), 0);

  const salvar = async (enviarParaAprovacao: boolean, e?: FormEvent) => {
    e?.preventDefault();
    setErro("");
    if (!filialId) return setErro("Escolha a filial");
    if (linhas.length === 0) return setErro("Adicione pelo menos um produto");
    if (linhas.some((l) => num(l.quantidade) <= 0)) return setErro("Todas as quantidades devem ser maiores que zero");
    setSalvando(true);
    const corpo = {
      filial_id: Number(filialId),
      prioridade: Number(prioridade),
      finalidade: finalidade || null,
      justificativa: justificativa || null,
      enviar: enviarParaAprovacao,
      itens: linhas.map((l) => ({ produto_id: l.produto.id, quantidade: num(l.quantidade) })),
    };
    try {
      const s = id
        ? await enviar<{ id: number }>(`/api/solicitacoes/${id}`, "PUT", corpo)
        : await enviar<{ id: number }>("/api/solicitacoes", "POST", corpo);
      navegar(`/requisicoes/${s.id}`);
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="titulo">
        <h1>{id ? "Editar rascunho" : "Nova requisição"}</h1>
        <Link to={id ? `/requisicoes/${id}` : "/requisicoes"}>Voltar</Link>
      </div>
      <form className="cartao formulario" onSubmit={(e) => salvar(true, e)}>
        <div className="linha">
          <label>
            Filial *
            <select value={filialId} onChange={(e) => setFilialId(e.target.value)} required>
              <option value="">Selecione…</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigo} · {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
              <option value="1">Alta</option>
              <option value="2">Normal</option>
              <option value="3">Baixa</option>
            </select>
          </label>
        </div>
        <label>
          Finalidade
          <input value={finalidade} onChange={(e) => setFinalidade(e.target.value)} placeholder="Ex.: troca do painel de porcelanatos" />
        </label>
        <label>
          Justificativa
          <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        </label>

        <fieldset>
          <legend>Produtos</legend>
          <div className="autocompletar">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por SKU ou descrição para adicionar…" />
            {sugestoes.length > 0 && (
              <ul>
                {sugestoes.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => adicionar(p)}>
                      <b>{p.sku}</b> {p.descricao}
                      <small>
                        {p.fornecedor_nome ?? "sem fornecedor"} · {moeda(p.custo_referencia)}/{p.unidade}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busca.trim().length >= 2 && sugestoes.length === 0 && <p className="sutil">Nenhum produto ativo encontrado.</p>}
          </div>
          {linhas.length > 0 && (
            <div className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th className="num">Quantidade</th>
                    <th className="num">Custo unit.</th>
                    <th className="num">Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, n) => (
                    <tr key={l.produto.id}>
                      <td>{l.produto.sku}</td>
                      <td>{l.produto.descricao}</td>
                      <td className="num">
                        <input
                          className="qtd"
                          inputMode="decimal"
                          value={l.quantidade}
                          onChange={(e) => setLinhas(linhas.map((x, i) => (i === n ? { ...x, quantidade: e.target.value } : x)))}
                        />{" "}
                        {l.produto.unidade}
                      </td>
                      <td className="num">{moeda(l.produto.custo_referencia)}</td>
                      <td className="num">{moeda(num(l.quantidade) * Number(l.produto.custo_referencia))}</td>
                      <td className="acoes">
                        <button type="button" className="link" onClick={() => setLinhas(linhas.filter((_, i) => i !== n))}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total de referência</td>
                    <td className="num">
                      <b>{moeda(total)}</b>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </fieldset>

        {erro && <div className="erro">{erro}</div>}
        <footer>
          <button type="button" disabled={salvando} onClick={() => salvar(false)}>
            Salvar rascunho
          </button>
          <button className="primario" disabled={salvando}>
            Enviar para aprovação
          </button>
        </footer>
      </form>
    </>
  );
}
