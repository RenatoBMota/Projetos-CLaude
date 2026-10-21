import { CheckCheck, ChevronRight, ClipboardCheck, FileEdit, PackageOpen, Plus, Store, Truck, Undo2, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Pagina } from "../api";
import { useVersao } from "../componentes/atualizacao";
import { Carregando, Cabecalho, Indicador, SeloStatus, Vazio } from "../componentes/ui";
import { data, moeda, qtd } from "../formato";
import { PERFIS_REQUISITANTE, temPerfil, useSessao } from "../sessao";
import { FILAS, type LinhaRequisicao } from "./Requisicoes";

interface Resumo {
  filas: Record<string, number>;
  em_exposicao: { quantidade: number; valor: number };
}

const ICONES_FILA: Record<string, LucideIcon> = {
  rascunhos: FileEdit,
  comercial: ClipboardCheck,
  logistica: ClipboardCheck,
  expedicao: Truck,
  devolucao: Undo2,
};

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

export function Inicio() {
  const { usuario } = useSessao();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [recentes, setRecentes] = useState<LinhaRequisicao[] | null>(null);
  const requisitante = temPerfil(usuario, ...PERFIS_REQUISITANTE);
  const versao = useVersao();

  useEffect(() => {
    api<Resumo>("/api/solicitacoes/resumo").then(setResumo);
    api<Pagina<LinhaRequisicao>>(`/api/solicitacoes?limite=6${requisitante ? "&minhas=true" : ""}`).then((r) => setRecentes(r.itens));
  }, [requisitante, versao]);

  const filas = resumo ? Object.entries(resumo.filas) : [];
  const pendentes = filas.filter(([f]) => f !== "rascunhos" && f !== "devolucao").reduce((t, [, n]) => t + n, 0);
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <Cabecalho
        titulo={`${saudacao()}, ${usuario?.nome.split(" ")[0]}`}
        subtitulo={
          resumo
            ? pendentes > 0
              ? `${hoje} · você tem ${pendentes} ${pendentes === 1 ? "requisição esperando" : "requisições esperando"} por você.`
              : `${hoje} · nada pendente com você agora.`
            : hoje
        }
        acoes={
          requisitante && (
            <Link className="botao primario" to="/requisicoes/nova">
              <Plus size={18} /> Nova requisição
            </Link>
          )
        }
      />

      {!resumo ? (
        <Carregando linhas={2} />
      ) : (
        <div className="indicadores">
          {filas.map(([fila, n]) => (
            <Indicador
              key={fila}
              icone={ICONES_FILA[fila]}
              rotulo={FILAS[fila]?.rotulo ?? fila}
              valor={n}
              detalhe={n === 1 ? "requisição" : "requisições"}
              para={`/requisicoes?fila=${fila}`}
              destaque={n > 0 && fila !== "devolucao"}
            />
          ))}
          <Indicador
            icone={Store}
            rotulo="Em exposição nas lojas"
            valor={moeda(resumo.em_exposicao.valor)}
            detalhe={`${qtd(resumo.em_exposicao.quantidade)} unidades`}
            para="/amostras"
          />
        </div>
      )}

      <section className="cartao">
        <div className="cartao-cabecalho">
          <div>
            <h2>{requisitante ? "Minhas requisições recentes" : "Requisições recentes"}</h2>
          </div>
          <Link to={requisitante ? "/requisicoes?minhas=1" : "/requisicoes"} className="botao pequeno">
            Ver todas <ChevronRight size={16} />
          </Link>
        </div>
        {!recentes ? (
          <Carregando linhas={3} />
        ) : recentes.length === 0 ? (
          <Vazio
            icone={requisitante ? PackageOpen : CheckCheck}
            titulo={requisitante ? "Nenhuma requisição ainda" : "Nenhuma requisição por aqui"}
            texto={requisitante ? "Peça as amostras para o mostruário da sua loja." : "Quando houver requisições, elas aparecem aqui."}
            acao={
              requisitante && (
                <Link className="botao primario" to="/requisicoes/nova">
                  <Plus size={16} /> Criar a primeira
                </Link>
              )
            }
          />
        ) : (
          <div className="lista-cartoes">
            {recentes.map((r) => (
              <Link key={r.id} to={`/requisicoes/${r.id}`} className="item-cartao" style={{ boxShadow: "none" }}>
                <div className="topo-item">
                  <span className="protocolo">{r.protocolo}</span>
                  <SeloStatus status={r.status} />
                </div>
                <div className="meta">
                  <span>{r.filial_nome}</span>
                  <span>{r.requisitante_nome}</span>
                  <span>{data(r.criado_em)}</span>
                  <span>
                    {r.itens} {r.itens === 1 ? "item" : "itens"} · {moeda(r.valor_solicitado)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
