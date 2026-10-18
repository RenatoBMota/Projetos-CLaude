import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  Image as IconeImagem,
  Paperclip,
  PackageCheck,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Truck,
  Undo2,
  Upload,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, enviar, token } from "../api";
import { Modal } from "../componentes/Modal";
import { Cabecalho, Carregando, SeloStatus, Vazio, useToast } from "../componentes/ui";
import { data, dataHora, moeda, novaChave, PRIORIDADES, qtd, STATUS, STATUS_ITEM, TIPOS_MOV, useMotivos } from "../formato";

interface Item {
  item_id: number;
  sku: string;
  descricao: string;
  unidade: string;
  fornecedor_nome: string | null;
  quantidade_solicitada: number;
  qtd_aprovada: number;
  qtd_expedida: number;
  qtd_estoque: number;
  qtd_descarte: number;
  qtd_perda: number;
  qtd_em_loja: number;
  qtd_pendente_expedicao: number;
  custo_referencia: number;
  valor_em_loja: number;
  dias_em_exposicao: number | null;
  status_item: string;
}

interface Detalhe {
  id: number;
  protocolo: string;
  status: string;
  prioridade: number;
  filial_nome: string;
  requisitante_nome: string;
  finalidade: string | null;
  justificativa: string | null;
  criado_em: string;
  enviado_em: string | null;
  encerrado_em: string | null;
  motivo_descricao: string | null;
  observacao: string | null;
  valor_solicitado: number;
  valor_em_loja: number;
  acoes: string[];
  itens: Item[];
  aprovacoes: {
    id: number;
    etapa: string;
    decisao: string;
    aprovador_nome: string;
    motivo_descricao: string | null;
    observacao: string | null;
    decidido_em: string;
  }[];
  movimentacoes: {
    id: number;
    tipo: string;
    sku: string;
    quantidade: number;
    custo_unitario: number;
    usuario_nome: string;
    motivo_descricao: string | null;
    observacao: string | null;
    ocorrido_em: string;
    estornada: boolean;
    estorno_de_id: number | null;
  }[];
  historico: { acao: string; usuario_nome: string; ocorrido_em: string; dados_depois: Record<string, unknown> | null }[];
}

type Painel = "aprovar" | "reprovar" | "expedir" | "devolver" | "cancelar" | "cancelar_pendente" | { estornar: number };

const HISTORICO: Record<string, { texto: string; icone: LucideIcon; tom?: string }> = {
  criar: { texto: "Criou a requisição", icone: FileEdit },
  alterar: { texto: "Alterou o rascunho", icone: FileEdit },
  enviar: { texto: "Enviou para aprovação", icone: Send, tom: "info" },
  cancelar: { texto: "Cancelou a requisição", icone: Ban, tom: "ruim" },
  aprovada_comercial: { texto: "Aprovou (comercial)", icone: ThumbsUp, tom: "ok" },
  reprovada_comercial: { texto: "Reprovou (comercial)", icone: ThumbsDown, tom: "ruim" },
  aprovada_logistica: { texto: "Aprovou (logística)", icone: ThumbsUp, tom: "ok" },
  reprovada_logistica: { texto: "Reprovou (logística)", icone: ThumbsDown, tom: "ruim" },
  cancelar_pendente: { texto: "Cancelou saldo pendente de expedição", icone: X },
  estornar: { texto: "Estornou uma movimentação", icone: RotateCcw, tom: "ruim" },
  anexar: { texto: "Anexou arquivo", icone: Paperclip },
  status: { texto: "Situação", icone: Clock },
};

const num = (v: string) => Number(v.replace(",", ".")) || 0;

// ---------------------------------------------------------------------------
// Etapas e próxima ação
// ---------------------------------------------------------------------------

function Etapas({ s }: { s: Detalhe }) {
  const expedido = s.itens.some((i) => Number(i.qtd_expedida) > 0);
  const retornou = s.itens.some((i) => Number(i.qtd_estoque) + Number(i.qtd_descarte) + Number(i.qtd_perda) > 0);
  const apr = (etapa: string) => s.aprovacoes.find((a) => a.etapa === etapa);
  const com = apr("comercial");
  const log = apr("logistica");
  type E = { rotulo: string; estado: "feita" | "atual" | "erro" | ""; quando?: string | null };
  const etapas: E[] = [
    { rotulo: "Enviada", estado: s.status === "rascunho" ? "atual" : "feita", quando: s.enviado_em },
    {
      rotulo: "Comercial",
      estado: com ? (com.decisao === "aprovada" ? "feita" : "erro") : s.status === "aguardando_aprovacao_comercial" ? "atual" : "",
      quando: com?.decidido_em,
    },
    {
      rotulo: "Logística",
      estado: log ? (log.decisao === "aprovada" ? "feita" : "erro") : s.status === "aguardando_aprovacao_logistica" ? "atual" : "",
      quando: log?.decidido_em,
    },
    { rotulo: "Expedição", estado: expedido ? "feita" : s.status === "aguardando_expedicao" ? "atual" : "" },
    { rotulo: "Em loja", estado: retornou || s.status === "encerrada" ? "feita" : s.status === "em_exposicao" ? "atual" : "" },
    {
      rotulo: "Encerrada",
      estado: s.status === "encerrada" ? "feita" : s.status === "devolucao_parcial" ? "atual" : "",
      quando: s.status === "encerrada" ? s.encerrado_em : null,
    },
  ];
  if (s.status === "cancelada") {
    const i = etapas.findIndex((e) => e.estado !== "feita");
    if (i >= 0) etapas[i] = { rotulo: "Cancelada", estado: "erro", quando: s.encerrado_em };
  }
  return (
    <div className="etapas" aria-label="Andamento">
      {etapas.map((e, n) => (
        <div key={e.rotulo} className={`etapa ${e.estado}`}>
          <div className="bola">{e.estado === "feita" ? <Check size={16} /> : e.estado === "erro" ? <X size={16} /> : n + 1}</div>
          <span>
            {e.rotulo}
            {e.quando && <small>{data(e.quando)}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProximaAcao({ s, abrir, executar }: { s: Detalhe; abrir: (p: Painel | "editar") => void; executar: (url: string, msg: string) => void }) {
  const pode = (a: string) => s.acoes.includes(a);
  let tom = "";
  let Icone: LucideIcon = Clock;
  let titulo = "";
  let texto: ReactNode = "";
  let botoes: ReactNode = null;

  const reprovacao = s.aprovacoes.find((a) => a.decisao === "reprovada");
  switch (s.status) {
    case "rascunho":
      Icone = FileEdit;
      titulo = "Rascunho";
      texto = "Revise os itens e envie para a aprovação comercial.";
      botoes = pode("enviar") && (
        <button onClick={() => executar(`/api/solicitacoes/${s.id}/enviar`, "Requisição enviada para aprovação.")} className="primario">
          <Send size={16} /> Enviar para aprovação
        </button>
      );
      break;
    case "aguardando_aprovacao_comercial":
    case "aguardando_aprovacao_logistica": {
      const etapa = s.status.endsWith("comercial") ? "comercial" : "logística";
      if (pode("aprovar")) {
        titulo = `Sua aprovação ${etapa} é necessária`;
        texto = "Confira os itens e as quantidades. Você pode aprovar uma quantidade menor.";
        botoes = (
          <>
            <button className="perigo" onClick={() => abrir("reprovar")}>
              <ThumbsDown size={16} /> Reprovar
            </button>
            <button className="primario" onClick={() => abrir("aprovar")}>
              <ThumbsUp size={16} /> Aprovar
            </button>
          </>
        );
      } else {
        tom = "neutra";
        titulo = `Aguardando aprovação ${etapa}`;
        texto = "O responsável já pode ver esta requisição na fila dele.";
      }
      break;
    }
    case "aguardando_expedicao":
    case "em_exposicao":
    case "devolucao_parcial":
      Icone = s.status === "aguardando_expedicao" ? Truck : Undo2;
      if (pode("expedir") || pode("devolver")) {
        titulo = s.status === "aguardando_expedicao" ? "Pronta para expedição" : "Amostras na loja";
        texto =
          s.status === "aguardando_expedicao"
            ? "Separe as peças e registre a saída (pode ser parcial)."
            : "Quando as peças voltarem, registre a devolução: estoque, descarte ou perda.";
        botoes = (
          <>
            {pode("expedir") && (
              <button className={s.status === "aguardando_expedicao" ? "primario" : ""} onClick={() => abrir("expedir")}>
                <Truck size={16} /> Registrar expedição
              </button>
            )}
            {pode("devolver") && (
              <button className="primario" onClick={() => abrir("devolver")}>
                <Undo2 size={16} /> Registrar devolução
              </button>
            )}
          </>
        );
      } else {
        tom = "neutra";
        titulo = s.status === "aguardando_expedicao" ? "Aguardando o depósito" : "Amostras na loja";
        texto =
          s.status === "aguardando_expedicao"
            ? "Aprovada. O depósito vai separar e expedir as peças."
            : `Valor em exposição: ${moeda(s.valor_em_loja)}. O depósito registra a devolução quando as peças voltarem.`;
      }
      break;
    case "encerrada":
      tom = "neutra";
      Icone = PackageCheck;
      titulo = "Requisição encerrada";
      texto = `Todas as peças tiveram destino registrado${s.encerrado_em ? ` em ${data(s.encerrado_em)}` : ""}.`;
      break;
    case "reprovada":
      tom = "ruim";
      Icone = XCircle;
      titulo = "Requisição reprovada";
      texto = reprovacao
        ? `${reprovacao.aprovador_nome}: ${[reprovacao.motivo_descricao, reprovacao.observacao].filter(Boolean).join(" — ")}`
        : "";
      break;
    case "cancelada":
      tom = "ruim";
      Icone = Ban;
      titulo = "Requisição cancelada";
      texto = [s.motivo_descricao, s.observacao].filter(Boolean).join(" — ") || "Sem motivo informado.";
      break;
  }

  const secundarias = [
    pode("editar") && (
      <button key="e" className="link" onClick={() => abrir("editar")}>
        <FileEdit size={14} /> Editar
      </button>
    ),
    pode("cancelar_pendente") && (
      <button key="p" className="link" onClick={() => abrir("cancelar_pendente")}>
        Cancelar saldo pendente
      </button>
    ),
    pode("cancelar") && (
      <button key="c" className="link" style={{ color: "var(--erro)" }} onClick={() => abrir("cancelar")}>
        {s.status === "rascunho" ? "Descartar rascunho" : "Cancelar requisição"}
      </button>
    ),
  ].filter(Boolean);

  return (
    <div className={`proxima-acao ${tom}`}>
      <div className="icone-acao">
        <Icone size={20} />
      </div>
      <div className="texto">
        <strong>{titulo}</strong>
        <span>{texto}</span>
        {secundarias.length > 0 && (
          <div className="botoes" style={{ marginTop: 4, gap: 2, marginLeft: -6 }}>
            {secundarias}
          </div>
        )}
      </div>
      {botoes && <div className="botoes">{botoes}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function DetalheRequisicao() {
  const { id } = useParams();
  const [s, setS] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const navegar = useNavigate();
  const toast = useToast();

  const carregar = useCallback(() => {
    api<Detalhe>(`/api/solicitacoes/${id}`)
      .then(setS)
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);

  if (erro) return <Vazio icone={XCircle} titulo="Não foi possível abrir" texto={erro} />;
  if (!s)
    return (
      <div className="cartao">
        <Carregando linhas={6} />
      </div>
    );

  const pode = (a: string) => s.acoes.includes(a);
  const concluir = (novo: Detalhe, msg: string) => {
    setS(novo);
    setPainel(null);
    toast({ tipo: "ok", texto: msg });
  };
  const executar = async (url: string, msg: string) => {
    try {
      concluir(await enviar<Detalhe>(url, "POST", {}), msg);
    } catch (e) {
      toast({ tipo: "erro", texto: (e as Error).message });
    }
  };
  const abrir = (p: Painel | "editar") => (p === "editar" ? navegar(`/requisicoes/${s.id}/editar`) : setPainel(p));
  const fechar = () => setPainel(null);

  return (
    <>
      <Cabecalho
        voltar={{ para: "/requisicoes", rotulo: "Requisições" }}
        titulo={
          <>
            {s.protocolo} <SeloStatus status={s.status} />
          </>
        }
        subtitulo={`${s.filial_nome} · ${s.requisitante_nome} · criada em ${data(s.criado_em)}`}
      />

      <section className="cartao">
        <Etapas s={s} />
        <ProximaAcao s={s} abrir={abrir} executar={executar} />
      </section>

      <section className="cartao dados">
        <Dado rotulo="Valor solicitado">{moeda(s.valor_solicitado)}</Dado>
        <Dado rotulo="Valor em loja">{moeda(s.valor_em_loja)}</Dado>
        <Dado rotulo="Prioridade">{PRIORIDADES[s.prioridade]}</Dado>
        <Dado rotulo="Enviada em">{data(s.enviado_em)}</Dado>
        {s.finalidade && (
          <Dado rotulo="Finalidade" largo>
            {s.finalidade}
          </Dado>
        )}
        {s.justificativa && (
          <Dado rotulo="Justificativa" largo>
            {s.justificativa}
          </Dado>
        )}
      </section>

      <h2 className="secao">Itens</h2>
      <Itens s={s} />

      {s.movimentacoes.length > 0 && (
        <>
          <h2 className="secao">Movimentações</h2>
          <section className="cartao" style={{ padding: "0 18px" }}>
            <div className="tabela-rolagem">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>SKU</th>
                    <th className="num">Qtd.</th>
                    <th className="num">Valor</th>
                    <th>Responsável</th>
                    <th>Motivo / observação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {s.movimentacoes.map((m) => (
                    <tr key={m.id} className={m.estornada ? "estornada" : ""}>
                      <td className="nowrap">{dataHora(m.ocorrido_em)}</td>
                      <td className="nowrap">
                        {TIPOS_MOV[m.tipo] ?? m.tipo}
                        {m.estornada && (
                          <span className="selo ruim" style={{ marginLeft: 6 }}>
                            Estornada
                          </span>
                        )}
                      </td>
                      <td>{m.sku}</td>
                      <td className="num">{qtd(m.quantidade)}</td>
                      <td className="num">{moeda(Number(m.quantidade) * Number(m.custo_unitario))}</td>
                      <td>{m.usuario_nome}</td>
                      <td>{[m.motivo_descricao, m.observacao].filter(Boolean).join(" — ") || "—"}</td>
                      <td className="acoes">
                        {pode("estornar") && !m.estornada && m.tipo !== "estorno" && (
                          <button className="link" onClick={() => setPainel({ estornar: m.id })}>
                            <RotateCcw size={14} /> Estornar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grade-2" style={{ marginTop: 16 }}>
        <section className="cartao">
          <div className="cartao-cabecalho">
            <h2>Histórico</h2>
          </div>
          <ul className="linha-tempo">
            {s.historico.map((h, n) => {
              const info = HISTORICO[h.acao] ?? { texto: h.acao, icone: Clock };
              const reprov = h.acao.startsWith("reprovada_")
                ? s.aprovacoes.find((a) => a.etapa === h.acao.split("_")[1])?.motivo_descricao
                : null;
              const detalhe = [
                h.acao === "status" && h.dados_depois?.status ? STATUS[String(h.dados_depois.status)]?.rotulo : null,
                typeof h.dados_depois?.arquivo === "string" ? h.dados_depois.arquivo : null,
                reprov,
                typeof h.dados_depois?.observacao === "string" ? h.dados_depois.observacao : null,
              ].filter(Boolean);
              const Icone = info.icone;
              return (
                <li key={n} className={info.tom ?? ""}>
                  <span className="marcador">
                    <Icone />
                  </span>
                  <div className="corpo">
                    <div>
                      <b>{info.texto}</b>
                      {detalhe.length > 0 && `: ${detalhe.join(" — ")}`}
                    </div>
                    <div className="quando">
                      {h.usuario_nome} · {dataHora(h.ocorrido_em)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <Anexos solicitacaoId={s.id} aoAnexar={carregar} />
      </div>

      {painel === "aprovar" && <PainelAprovar s={s} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Aprovação registrada.")} />}
      {painel === "reprovar" && <PainelReprovar s={s} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Requisição reprovada.")} />}
      {painel === "expedir" && <PainelExpedir s={s} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Expedição registrada.")} />}
      {painel === "devolver" && <PainelDevolver s={s} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Devolução registrada.")} />}
      {painel === "cancelar" && (
        <PainelCancelar
          s={s}
          aoFechar={fechar}
          aoConcluir={(n) => concluir(n, s.status === "rascunho" ? "Rascunho descartado." : "Requisição cancelada.")}
        />
      )}
      {painel === "cancelar_pendente" && (
        <PainelCancelarPendente s={s} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Saldo pendente cancelado.")} />
      )}
      {typeof painel === "object" && painel && (
        <PainelEstornar s={s} movimentacaoId={painel.estornar} aoFechar={fechar} aoConcluir={(n) => concluir(n, "Movimentação estornada.")} />
      )}
    </>
  );
}

function Dado({ rotulo, children, largo }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "largo" : ""}>
      <span>{rotulo}</span>
      <div>{children}</div>
    </div>
  );
}

function Progresso({ i }: { i: Item }) {
  const base = Math.max(Number(i.qtd_aprovada), Number(i.qtd_expedida), 1);
  const pct = (v: number) => `${(Number(v) / base) * 100}%`;
  return (
    <div
      className="progresso"
      title={`Estoque ${qtd(i.qtd_estoque)} · Descarte ${qtd(i.qtd_descarte)} · Perda ${qtd(i.qtd_perda)} · Em loja ${qtd(i.qtd_em_loja)}`}
    >
      {Number(i.qtd_estoque) > 0 && <i className="p-estoque" style={{ width: pct(i.qtd_estoque) }} />}
      {Number(i.qtd_descarte) > 0 && <i className="p-descarte" style={{ width: pct(i.qtd_descarte) }} />}
      {Number(i.qtd_perda) > 0 && <i className="p-perda" style={{ width: pct(i.qtd_perda) }} />}
      {Number(i.qtd_em_loja) > 0 && <i className="p-loja" style={{ width: pct(i.qtd_em_loja) }} />}
    </div>
  );
}

const Legenda = () => (
  <div className="legenda" style={{ marginTop: 10 }}>
    <span>
      <i style={{ background: "var(--borda-forte)" }} />
      Em loja
    </span>
    <span>
      <i style={{ background: "var(--serie-3)" }} />
      Estoque
    </span>
    <span>
      <i style={{ background: "var(--serie-2)" }} />
      Descarte
    </span>
    <span>
      <i style={{ background: "var(--serie-1)" }} />
      Perda
    </span>
  </div>
);

function Itens({ s }: { s: Detalhe }) {
  const comMovimento = s.itens.some((i) => Number(i.qtd_expedida) > 0);
  return (
    <>
      <section className="cartao so-desktop" style={{ padding: "0 18px 14px" }}>
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th className="num">Solicitada</th>
                <th className="num">Aprovada</th>
                <th className="num">Expedida</th>
                <th className="num">Em loja</th>
                <th className="num">Estoque</th>
                <th className="num">Descarte</th>
                <th className="num">Perda</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {s.itens.map((i) => (
                <tr key={i.item_id}>
                  <td className="produto">
                    <strong>{i.descricao}</strong>
                    <small className="sutil bloco">
                      {i.sku} · {i.fornecedor_nome ?? "sem fornecedor"} · {moeda(i.custo_referencia)}/{i.unidade}
                    </small>
                    {comMovimento && (
                      <div style={{ marginTop: 6, maxWidth: 260 }}>
                        <Progresso i={i} />
                      </div>
                    )}
                  </td>
                  <td className="num">{qtd(i.quantidade_solicitada)}</td>
                  <td className="num">{qtd(i.qtd_aprovada)}</td>
                  <td className="num">{qtd(i.qtd_expedida)}</td>
                  <td className="num forte">{qtd(i.qtd_em_loja)}</td>
                  <td className="num">{qtd(i.qtd_estoque)}</td>
                  <td className="num">{qtd(i.qtd_descarte)}</td>
                  <td className="num">{qtd(i.qtd_perda)}</td>
                  <td>
                    <span className="selo">{STATUS_ITEM[i.status_item] ?? i.status_item}</span>
                    {i.dias_em_exposicao != null && Number(i.qtd_em_loja) > 0 && (
                      <small className="sutil bloco" style={{ marginTop: 4 }}>
                        {i.dias_em_exposicao} dias na loja
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comMovimento && <Legenda />}
      </section>
      <div className="lista-cartoes so-celular">
        {s.itens.map((i) => (
          <div key={i.item_id} className="item-cartao">
            <div className="topo-item">
              <strong>{i.descricao}</strong>
            </div>
            <div className="meta" style={{ marginBottom: 8 }}>
              <span>{i.sku}</span>
              <span className="selo">{STATUS_ITEM[i.status_item] ?? i.status_item}</span>
            </div>
            <div className="dados" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Dado rotulo="Solicitada">{qtd(i.quantidade_solicitada)}</Dado>
              <Dado rotulo="Aprovada">{qtd(i.qtd_aprovada)}</Dado>
              <Dado rotulo="Expedida">{qtd(i.qtd_expedida)}</Dado>
              <Dado rotulo="Em loja">
                <b>{qtd(i.qtd_em_loja)}</b>
              </Dado>
              <Dado rotulo="Estoque">{qtd(i.qtd_estoque)}</Dado>
              <Dado rotulo="Desc./Perda">
                {qtd(i.qtd_descarte)} / {qtd(i.qtd_perda)}
              </Dado>
            </div>
            {comMovimento && (
              <div style={{ marginTop: 10 }}>
                <Progresso i={i} />
              </div>
            )}
          </div>
        ))}
        {comMovimento && <Legenda />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

interface Anexo {
  id: number;
  nome_arquivo: string;
  tipo_conteudo: string;
  tamanho: number;
  descricao: string | null;
  criado_em: string;
  usuario_nome: string;
}

async function blobDoAnexo(id: number) {
  const r = await fetch(`/api/anexos/${id}`, { headers: { Authorization: `Bearer ${token.ler()}` } });
  if (!r.ok) throw new Error("Não foi possível abrir o anexo");
  return URL.createObjectURL(await r.blob());
}

function Miniatura({ a }: { a: Anexo }) {
  const [url, setUrl] = useState<string | null>(null);
  const imagem = a.tipo_conteudo.startsWith("image/") && a.tipo_conteudo !== "image/heic";
  useEffect(() => {
    if (!imagem) return;
    let u: string | null = null;
    blobDoAnexo(a.id)
      .then((x) => setUrl((u = x)))
      .catch(() => {});
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [a.id, imagem]);
  if (url) return <img src={url} alt="" />;
  return imagem ? <IconeImagem size={20} /> : <FileText size={20} />;
}

function Anexos({ solicitacaoId, aoAnexar }: { solicitacaoId: number; aoAnexar: () => void }) {
  const toast = useToast();
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [chaveInput, setChaveInput] = useState(0);

  const carregar = useCallback(() => {
    api<Anexo[]>(`/api/solicitacoes/${solicitacaoId}/anexos`).then(setAnexos);
  }, [solicitacaoId]);
  useEffect(carregar, [carregar]);

  const enviarArquivo = async (e: FormEvent) => {
    e.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    const form = new FormData();
    form.append("arquivo", arquivo);
    form.append("descricao", descricao);
    try {
      await api(`/api/solicitacoes/${solicitacaoId}/anexos`, { method: "POST", body: form });
      setArquivo(null);
      setDescricao("");
      setChaveInput((n) => n + 1);
      carregar();
      aoAnexar();
      toast({ tipo: "ok", texto: "Arquivo anexado." });
    } catch (err) {
      toast({ tipo: "erro", texto: (err as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (a: Anexo) => {
    try {
      window.open(await blobDoAnexo(a.id), "_blank");
    } catch (e) {
      toast({ tipo: "erro", texto: (e as Error).message });
    }
  };

  const tamanho = (b: number) =>
    b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;

  return (
    <section className="cartao">
      <div className="cartao-cabecalho">
        <div>
          <h2>Anexos</h2>
          <p>Fotos ou PDF (até 10 MB). No celular, dá para tirar a foto na hora.</p>
        </div>
      </div>
      {anexos && anexos.length > 0 && (
        <ul className="anexos">
          {anexos.map((a) => (
            <li key={a.id}>
              <button className="miniatura" onClick={() => abrir(a)} aria-label={`Abrir ${a.nome_arquivo}`}>
                <Miniatura a={a} />
              </button>
              <div className="info">
                <button className="link" onClick={() => abrir(a)}>
                  {a.descricao || a.nome_arquivo}
                </button>
                <span>
                  {a.usuario_nome} · {dataHora(a.criado_em)} · {tamanho(a.tamanho)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="anexar sem-impressao" onSubmit={enviarArquivo}>
        <input
          key={chaveInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
        <input placeholder="Descrição (ex.: comprovante de coleta)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <button className="primario" disabled={!arquivo || enviando}>
          <Upload size={16} /> {enviando ? "Enviando…" : "Anexar"}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Painéis de ação
// ---------------------------------------------------------------------------

interface PropsPainel {
  s: Detalhe;
  aoFechar: () => void;
  aoConcluir: (s: Detalhe) => void;
}

function useEnvio(aoConcluir: (s: Detalhe) => void) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const executar = async (url: string, corpo: unknown) => {
    setErro("");
    setEnviando(true);
    try {
      aoConcluir(await enviar<Detalhe>(url, "POST", corpo));
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };
  return { erro, setErro, enviando, executar };
}

function Rodape({
  enviando,
  rotulo,
  aoFechar,
  perigo,
  icone,
}: {
  enviando: boolean;
  rotulo: string;
  aoFechar: () => void;
  perigo?: boolean;
  icone?: ReactNode;
}) {
  return (
    <footer>
      <button type="button" onClick={aoFechar}>
        Voltar
      </button>
      <button className={perigo ? "perigo-cheio" : "primario"} disabled={enviando}>
        {icone} {enviando ? "Salvando…" : rotulo}
      </button>
    </footer>
  );
}

function SeletorMotivo({
  tipo,
  valor,
  aoMudar,
  rotulo = "Motivo *",
}: {
  tipo: string;
  valor: string;
  aoMudar: (v: string) => void;
  rotulo?: string;
}) {
  const motivos = useMotivos()(tipo);
  return (
    <label>
      {rotulo}
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Selecione…</option>
        {motivos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.descricao}
            {m.exige_observacao ? " (exige observação)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function PainelAprovar({ s, aoFechar, aoConcluir }: PropsPainel) {
  const etapa = s.status === "aguardando_aprovacao_comercial" ? "comercial" : "logística";
  const [quantidades, setQuantidades] = useState<Record<number, string>>(
    Object.fromEntries(s.itens.map((i) => [i.item_id, String(Number(i.qtd_aprovada))])),
  );
  const [observacao, setObservacao] = useState("");
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);
  const total = s.itens.reduce((t, i) => t + num(quantidades[i.item_id] ?? "0") * Number(i.custo_referencia), 0);

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const alteradas: Record<number, number> = {};
    for (const i of s.itens) {
      const q = num(quantidades[i.item_id]);
      if (q < 0 || q > Number(i.qtd_aprovada)) return setErro(`${i.sku}: quantidade deve estar entre 0 e ${qtd(i.qtd_aprovada)}`);
      if (q !== Number(i.qtd_aprovada)) alteradas[i.item_id] = q;
    }
    executar(`/api/solicitacoes/${s.id}/decisao`, { decisao: "aprovada", quantidades: alteradas, observacao: observacao || null });
  };

  return (
    <Modal titulo={`Aprovação ${etapa}`} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <p className="sutil">Ajuste se for aprovar menos que o solicitado. Use 0 para não atender um item.</p>
        <div className="itens-requisicao" style={{ marginTop: 0 }}>
          {s.itens.map((i) => (
            <div key={i.item_id} className="item-req">
              <div className="desc">
                <strong>{i.descricao}</strong>
                <small>
                  {i.sku} · solicitado {qtd(i.quantidade_solicitada)} {i.unidade}
                </small>
              </div>
              <input
                className="qtd"
                inputMode="decimal"
                aria-label={`Quantidade aprovada de ${i.sku}`}
                value={quantidades[i.item_id]}
                onChange={(e) => setQuantidades({ ...quantidades, [i.item_id]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <p>
          Total aprovado: <b>{moeda(total)}</b>
        </p>
        <label>
          Observação (opcional)
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Aprovar" icone={<ThumbsUp size={16} />} aoFechar={aoFechar} />
      </form>
    </Modal>
  );
}

function PainelReprovar({ s, aoFechar, aoConcluir }: PropsPainel) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    if (!motivo) return setErro("Informe o motivo da reprovação");
    executar(`/api/solicitacoes/${s.id}/decisao`, { decisao: "reprovada", motivo_id: Number(motivo), observacao: observacao || null });
  };
  return (
    <Modal titulo="Reprovar requisição" aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <SeletorMotivo tipo="reprovacao" valor={motivo} aoMudar={setMotivo} />
        <label>
          Observação
          <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Reprovar" icone={<ThumbsDown size={16} />} aoFechar={aoFechar} perigo />
      </form>
    </Modal>
  );
}

function PainelExpedir({ s, aoFechar, aoConcluir }: PropsPainel) {
  const pendentes = s.itens.filter((i) => Number(i.qtd_pendente_expedicao) > 0);
  const [chave] = useState(novaChave);
  const [quantidades, setQuantidades] = useState<Record<number, string>>(
    Object.fromEntries(pendentes.map((i) => [i.item_id, String(Number(i.qtd_pendente_expedicao))])),
  );
  const [observacao, setObservacao] = useState("");
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const itens = pendentes
      .map((i) => ({ item_id: i.item_id, quantidade: num(quantidades[i.item_id] ?? "0"), max: Number(i.qtd_pendente_expedicao), sku: i.sku }))
      .filter((i) => i.quantidade > 0);
    if (itens.length === 0) return setErro("Informe ao menos uma quantidade");
    const excedido = itens.find((i) => i.quantidade > i.max);
    if (excedido) return setErro(`${excedido.sku}: máximo de ${qtd(excedido.max)}`);
    executar(`/api/solicitacoes/${s.id}/expedir`, {
      chave,
      observacao: observacao || null,
      itens: itens.map(({ item_id, quantidade }) => ({ item_id, quantidade })),
    });
  };

  return (
    <Modal titulo="Registrar expedição" aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <p className="sutil">Informe o que está saindo agora. O que faltar continua pendente.</p>
        <div className="itens-requisicao" style={{ marginTop: 0 }}>
          {pendentes.map((i) => (
            <div key={i.item_id} className="item-req">
              <div className="desc">
                <strong>{i.descricao}</strong>
                <small>
                  {i.sku} · pendente {qtd(i.qtd_pendente_expedicao)} {i.unidade}
                </small>
              </div>
              <input
                className="qtd"
                inputMode="decimal"
                aria-label={`Expedir agora de ${i.sku}`}
                value={quantidades[i.item_id]}
                onChange={(e) => setQuantidades({ ...quantidades, [i.item_id]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <label>
          Observação (transportador, nota, etc.)
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Confirmar expedição" icone={<Truck size={16} />} aoFechar={aoFechar} />
      </form>
    </Modal>
  );
}

interface LinhaDevolucao {
  estoque: string;
  descarte: string;
  motivoDescarte: string;
  perda: string;
  motivoPerda: string;
  observacao: string;
}

function PainelDevolver({ s, aoFechar, aoConcluir }: PropsPainel) {
  const emLoja = s.itens.filter((i) => Number(i.qtd_em_loja) > 0);
  const [chave] = useState(novaChave);
  const motivos = useMotivos();
  const [linhas, setLinhas] = useState<Record<number, LinhaDevolucao>>(
    Object.fromEntries(
      emLoja.map((i) => [i.item_id, { estoque: "", descarte: "", motivoDescarte: "", perda: "", motivoPerda: "", observacao: "" }]),
    ),
  );
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);
  const mudar = (id: number, campo: keyof LinhaDevolucao, valor: string) =>
    setLinhas({ ...linhas, [id]: { ...linhas[id], [campo]: valor } });

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const lancamentos: unknown[] = [];
    for (const i of emLoja) {
      const l = linhas[i.item_id];
      const [qe, qd, qp] = [num(l.estoque), num(l.descarte), num(l.perda)];
      if (qe + qd + qp === 0) continue;
      if (qe + qd + qp > Number(i.qtd_em_loja)) return setErro(`${i.sku}: total maior que o em loja (${qtd(i.qtd_em_loja)})`);
      const obs = l.observacao.trim() || null;
      for (const [destino, q, motivo] of [
        ["estoque", qe, ""],
        ["descarte", qd, l.motivoDescarte],
        ["perda", qp, l.motivoPerda],
      ] as const) {
        if (q <= 0) continue;
        if (destino !== "estoque") {
          if (!motivo) return setErro(`${i.sku}: informe o motivo do ${destino}`);
          const m = motivos(destino).find((x) => x.id === Number(motivo));
          if (m?.exige_observacao && !obs) return setErro(`${i.sku}: o motivo "${m.descricao}" exige observação`);
        }
        lancamentos.push({ item_id: i.item_id, destino, quantidade: q, motivo_id: motivo ? Number(motivo) : null, observacao: obs });
      }
    }
    if (lancamentos.length === 0) return setErro("Informe ao menos uma quantidade");
    executar(`/api/solicitacoes/${s.id}/devolver`, { chave, lancamentos });
  };

  return (
    <Modal titulo="Registrar devolução" aoFechar={aoFechar} largo>
      <form className="formulario" onSubmit={salvar}>
        <p className="sutil">
          Distribua o que voltou: <b>Estoque</b> (pode ser usada de novo), <b>Descarte</b> (voltou sem condição) ou <b>Perda</b> (não
          voltou). Pode ser parcial.
        </p>
        {emLoja.map((i) => {
          const l = linhas[i.item_id];
          const restante = Number(i.qtd_em_loja) - num(l.estoque) - num(l.descarte) - num(l.perda);
          return (
            <fieldset key={i.item_id}>
              <legend>
                {i.sku} · {i.descricao}
              </legend>
              <div className="sutil" style={{ fontSize: 13 }}>
                Em loja: <b>{qtd(i.qtd_em_loja)}</b> {i.unidade}
                {restante !== Number(i.qtd_em_loja) && (
                  <span style={{ color: restante < 0 ? "var(--erro)" : undefined }}> · continuará na loja: {qtd(restante)}</span>
                )}
              </div>
              <div className="destinos">
                <label>
                  <span>
                    <i className="marca-cor" style={{ background: "var(--serie-3)" }} />
                    Estoque
                  </span>
                  <input className="qtd" inputMode="decimal" value={l.estoque} onChange={(e) => mudar(i.item_id, "estoque", e.target.value)} />
                </label>
                <label>
                  <span>
                    <i className="marca-cor" style={{ background: "var(--serie-2)" }} />
                    Descarte
                  </span>
                  <input className="qtd" inputMode="decimal" value={l.descarte} onChange={(e) => mudar(i.item_id, "descarte", e.target.value)} />
                </label>
                <label>
                  <span>
                    <i className="marca-cor" style={{ background: "var(--serie-1)" }} />
                    Perda
                  </span>
                  <input className="qtd" inputMode="decimal" value={l.perda} onChange={(e) => mudar(i.item_id, "perda", e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="link"
                style={{ alignSelf: "flex-start" }}
                onClick={() => setLinhas({ ...linhas, [i.item_id]: { ...l, estoque: String(Number(i.qtd_em_loja)), descarte: "", perda: "" } })}
              >
                <CheckCircle2 size={14} /> Tudo voltou para o estoque
              </button>
              {num(l.descarte) > 0 && (
                <SeletorMotivo
                  tipo="descarte"
                  rotulo="Motivo do descarte *"
                  valor={l.motivoDescarte}
                  aoMudar={(v) => mudar(i.item_id, "motivoDescarte", v)}
                />
              )}
              {num(l.perda) > 0 && (
                <SeletorMotivo tipo="perda" rotulo="Motivo da perda *" valor={l.motivoPerda} aoMudar={(v) => mudar(i.item_id, "motivoPerda", v)} />
              )}
              {num(l.descarte) + num(l.perda) > 0 && (
                <label>
                  Observação
                  <input value={l.observacao} onChange={(e) => mudar(i.item_id, "observacao", e.target.value)} />
                </label>
              )}
            </fieldset>
          );
        })}
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Confirmar devolução" icone={<Undo2 size={16} />} aoFechar={aoFechar} />
      </form>
    </Modal>
  );
}

function PainelCancelar({ s, aoFechar, aoConcluir }: PropsPainel) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);
  const rascunho = s.status === "rascunho";
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    if (!rascunho && !motivo) return setErro("Informe o motivo");
    executar(`/api/solicitacoes/${s.id}/cancelar`, { motivo_id: motivo ? Number(motivo) : null, observacao: observacao || null });
  };
  return (
    <Modal titulo={rascunho ? "Descartar rascunho" : "Cancelar requisição"} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <SeletorMotivo tipo="cancelamento" rotulo={rascunho ? "Motivo (opcional)" : "Motivo *"} valor={motivo} aoMudar={setMotivo} />
        <label>
          Observação
          <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape
          enviando={enviando}
          rotulo={rascunho ? "Descartar" : "Cancelar requisição"}
          icone={<Ban size={16} />}
          aoFechar={aoFechar}
          perigo
        />
      </form>
    </Modal>
  );
}

function PainelCancelarPendente({ s, aoFechar, aoConcluir }: PropsPainel) {
  const pendentes = s.itens.filter((i) => Number(i.qtd_pendente_expedicao) > 0);
  const [item, setItem] = useState(String(pendentes[0]?.item_id ?? ""));
  const [observacao, setObservacao] = useState("");
  const { erro, enviando, executar } = useEnvio(aoConcluir);
  return (
    <Modal titulo="Cancelar saldo pendente" aoFechar={aoFechar}>
      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault();
          executar(`/api/solicitacoes/${s.id}/itens/${item}/cancelar-pendente`, { observacao });
        }}
      >
        <p className="sutil">O que ainda não saiu deixa de ser pendente. O que já foi expedido continua na loja.</p>
        <label>
          Item
          <select value={item} onChange={(e) => setItem(e.target.value)}>
            {pendentes.map((i) => (
              <option key={i.item_id} value={i.item_id}>
                {i.sku} · {i.descricao} — pendente {qtd(i.qtd_pendente_expedicao)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motivo *
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            required
            minLength={3}
            placeholder="Ex.: sem disponibilidade no depósito"
          />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Cancelar saldo" aoFechar={aoFechar} perigo />
      </form>
    </Modal>
  );
}

function PainelEstornar({ s, movimentacaoId, aoFechar, aoConcluir }: PropsPainel & { movimentacaoId: number }) {
  const m = s.movimentacoes.find((x) => x.id === movimentacaoId)!;
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const { erro, setErro, enviando, executar } = useEnvio(aoConcluir);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    if (!motivo) return setErro("Informe o motivo");
    executar(`/api/movimentacoes/${movimentacaoId}/estornar`, { motivo_id: Number(motivo), observacao: observacao || null });
  };
  return (
    <Modal titulo="Estornar movimentação" aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <div className="aviso-caixa">
          {TIPOS_MOV[m.tipo]} de {qtd(m.quantidade)} — {m.sku}, em {dataHora(m.ocorrido_em)} por {m.usuario_nome}.
        </div>
        <p className="sutil">O lançamento original continua no histórico, marcado como estornado.</p>
        <SeletorMotivo tipo="estorno" valor={motivo} aoMudar={setMotivo} />
        <label>
          Observação
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Estornar" icone={<RotateCcw size={16} />} aoFechar={aoFechar} perigo />
      </form>
    </Modal>
  );
}
