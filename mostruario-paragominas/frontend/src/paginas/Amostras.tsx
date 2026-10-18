import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { data, moeda, qtd, useFiliais } from "../formato";

interface Amostra {
  item_id: number;
  solicitacao_id: number;
  protocolo: string;
  filial_nome: string;
  sku: string;
  descricao: string;
  unidade: string;
  fornecedor_nome: string | null;
  requisitante_nome: string;
  qtd_em_loja: number;
  valor_em_loja: number;
  primeira_expedicao_em: string;
  dias_em_exposicao: number;
}

export function Amostras() {
  const filiais = useFiliais();
  const [filial, setFilial] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Amostra[] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ busca });
    if (filial) q.set("filial_id", filial);
    const t = setTimeout(() => api<Amostra[]>(`/api/amostras?${q}`).then(setLista), 200);
    return () => clearTimeout(t);
  }, [filial, busca]);

  const valor = lista?.reduce((t, a) => t + Number(a.valor_em_loja), 0) ?? 0;
  const quantidade = lista?.reduce((t, a) => t + Number(a.qtd_em_loja), 0) ?? 0;

  return (
    <>
      <h1>Amostras em exposição</h1>
      <div className="indicadores">
        <div className="cartao indicador">
          <span>Itens em loja</span>
          <b>{lista?.length ?? "—"}</b>
        </div>
        <div className="cartao indicador">
          <span>Quantidade</span>
          <b>{qtd(quantidade)}</b>
        </div>
        <div className="cartao indicador">
          <span>Valor em exposição</span>
          <b>{moeda(valor)}</b>
        </div>
      </div>
      <section className="cartao">
        <div className="barra">
          <input className="busca" placeholder="SKU, produto ou protocolo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {filiais.length > 1 && (
            <select className="filtro" value={filial} onChange={(e) => setFilial(e.target.value)}>
              <option value="">Todas as filiais</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Filial</th>
                <th>SKU</th>
                <th>Produto</th>
                <th>Fornecedor</th>
                <th className="num">Em loja</th>
                <th className="num">Valor</th>
                <th>Desde</th>
                <th className="num">Dias</th>
                <th>Protocolo</th>
              </tr>
            </thead>
            <tbody>
              {lista?.map((a) => (
                <tr key={a.item_id}>
                  <td>{a.filial_nome}</td>
                  <td className="nowrap">{a.sku}</td>
                  <td>{a.descricao}</td>
                  <td>{a.fornecedor_nome ?? "—"}</td>
                  <td className="num">
                    {qtd(a.qtd_em_loja)} {a.unidade}
                  </td>
                  <td className="num">{moeda(a.valor_em_loja)}</td>
                  <td>{data(a.primeira_expedicao_em)}</td>
                  <td className="num">{a.dias_em_exposicao}</td>
                  <td>
                    <Link to={`/requisicoes/${a.solicitacao_id}`}>{a.protocolo}</Link>
                  </td>
                </tr>
              ))}
              {lista && lista.length === 0 && (
                <tr>
                  <td colSpan={9} className="vazio">
                    Nenhuma amostra em exposição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
