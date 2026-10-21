import { Boxes, CalendarClock, Search, Store, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useVersao } from "../componentes/atualizacao";
import { Cabecalho, Carregando, Indicador, Vazio } from "../componentes/ui";
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

const Dias = ({ d }: { d: number }) => (
  <span className={`selo ${d > 180 ? "ruim" : d > 90 ? "aviso" : ""}`}>
    <CalendarClock /> {d} {d === 1 ? "dia" : "dias"}
  </span>
);

export function Amostras() {
  const filiais = useFiliais();
  const [filial, setFilial] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Amostra[] | null>(null);
  const versao = useVersao();

  useEffect(() => {
    const q = new URLSearchParams({ busca });
    if (filial) q.set("filial_id", filial);
    const t = setTimeout(() => api<Amostra[]>(`/api/amostras?${q}`).then(setLista), 200);
    return () => clearTimeout(t);
  }, [filial, busca, versao]);

  const valor = lista?.reduce((t, a) => t + Number(a.valor_em_loja), 0) ?? 0;
  const quantidade = lista?.reduce((t, a) => t + Number(a.qtd_em_loja), 0) ?? 0;
  const idadeMedia = lista?.length ? Math.round(lista.reduce((t, a) => t + a.dias_em_exposicao, 0) / lista.length) : 0;

  return (
    <>
      <Cabecalho titulo="Em exposição" subtitulo="O que está hoje no mostruário de cada loja." />
      <div className="indicadores">
        <Indicador icone={Wallet} rotulo="Valor em exposição" valor={moeda(valor)} />
        <Indicador icone={Boxes} rotulo="Quantidade" valor={qtd(quantidade)} detalhe={`${lista?.length ?? 0} itens`} />
        <Indicador icone={CalendarClock} rotulo="Idade média" valor={`${idadeMedia} dias`} detalhe="desde a expedição" />
      </div>
      <div className="barra">
        <div className="campo-icone busca">
          <Search size={16} />
          <input placeholder="SKU, produto ou protocolo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {filiais.length > 1 && (
          <select className="filtro" value={filial} onChange={(e) => setFilial(e.target.value)} aria-label="Filial">
            <option value="">Todas as filiais</option>
            {filiais.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        )}
      </div>
      {!lista ? (
        <div className="cartao">
          <Carregando />
        </div>
      ) : lista.length === 0 ? (
        <div className="cartao">
          <Vazio icone={Store} titulo="Nenhuma amostra em exposição" texto="As peças aparecem aqui depois da expedição." />
        </div>
      ) : (
        <>
          <section className="cartao so-desktop" style={{ padding: "0 18px" }}>
            <div className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    <th>Filial</th>
                    <th>Produto</th>
                    <th>Fornecedor</th>
                    <th className="num">Em loja</th>
                    <th className="num">Valor</th>
                    <th>Desde</th>
                    <th>Tempo</th>
                    <th>Protocolo</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.item_id}>
                      <td>{a.filial_nome}</td>
                      <td className="produto">
                        <strong>{a.descricao}</strong>
                        <small className="sutil bloco">{a.sku}</small>
                      </td>
                      <td>{a.fornecedor_nome ?? "—"}</td>
                      <td className="num">
                        {qtd(a.qtd_em_loja)} {a.unidade}
                      </td>
                      <td className="num">{moeda(a.valor_em_loja)}</td>
                      <td>{data(a.primeira_expedicao_em)}</td>
                      <td>
                        <Dias d={a.dias_em_exposicao} />
                      </td>
                      <td>
                        <Link to={`/requisicoes/${a.solicitacao_id}`} className="protocolo">
                          {a.protocolo}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="lista-cartoes so-celular">
            {lista.map((a) => (
              <Link key={a.item_id} to={`/requisicoes/${a.solicitacao_id}`} className="item-cartao">
                <div className="topo-item">
                  <strong>{a.descricao}</strong>
                  <Dias d={a.dias_em_exposicao} />
                </div>
                <div className="meta">
                  <span>{a.filial_nome}</span>
                  <span>{a.sku}</span>
                  <span>{a.protocolo}</span>
                </div>
                <div className="valor">
                  {moeda(a.valor_em_loja)}{" "}
                  <span className="sutil" style={{ fontWeight: 450, fontSize: 13 }}>
                    · {qtd(a.qtd_em_loja)} {a.unidade}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
