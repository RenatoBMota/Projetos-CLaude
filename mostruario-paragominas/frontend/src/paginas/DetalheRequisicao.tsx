import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, enviar } from "../api";
import { Modal } from "../componentes/Modal";
import { data, dataHora, moeda, novaChave, PRIORIDADES, qtd, STATUS, STATUS_ITEM, TIPOS_MOV, useMotivos } from "../formato";
import { SeloStatus } from "./Requisicoes";

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

const ACOES_HISTORICO: Record<string, string> = {
  criar: "Criou a requisição",
  alterar: "Alterou o rascunho",
  enviar: "Enviou para aprovação",
  cancelar: "Cancelou a requisição",
  aprovada_comercial: "Aprovação comercial",
  reprovada_comercial: "Reprovação comercial",
  aprovada_logistica: "Aprovação logística",
  reprovada_logistica: "Reprovação logística",
  cancelar_pendente: "Cancelou saldo pendente de expedição",
  estornar: "Estornou movimentação",
  status: "Status alterado",
};

export function DetalheRequisicao() {
  const { id } = useParams();
  const [s, setS] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState("");
  const [painel, setPainel] = useState<Painel | null>(null);
  const navegar = useNavigate();

  const carregar = useCallback(() => {
    api<Detalhe>(`/api/solicitacoes/${id}`)
      .then(setS)
      .catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);

  if (erro) return <div className="erro">{erro}</div>;
  if (!s) return <p className="sutil">Carregando…</p>;

  const pode = (a: string) => s.acoes.includes(a);
  const concluir = (novo: Detalhe) => {
    setS(novo);
    setPainel(null);
  };
  const acaoSimples = async (url: string) => {
    try {
      concluir(await enviar<Detalhe>(url, "POST", {}));
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  return (
    <>
      <div className="titulo">
        <div>
          <Link to="/requisicoes" className="sutil">
            ← Requisições
          </Link>
          <h1>
            {s.protocolo} <SeloStatus status={s.status} />
          </h1>
        </div>
        <div className="botoes">
          {pode("editar") && <button onClick={() => navegar(`/requisicoes/${s.id}/editar`)}>Editar</button>}
          {pode("enviar") && (
            <button className="primario" onClick={() => acaoSimples(`/api/solicitacoes/${s.id}/enviar`)}>
              Enviar para aprovação
            </button>
          )}
          {pode("aprovar") && (
            <>
              <button className="perigo" onClick={() => setPainel("reprovar")}>
                Reprovar
              </button>
              <button className="primario" onClick={() => setPainel("aprovar")}>
                Aprovar
              </button>
            </>
          )}
          {pode("expedir") && (
            <button className="primario" onClick={() => setPainel("expedir")}>
              Registrar expedição
            </button>
          )}
          {pode("devolver") && (
            <button className="primario" onClick={() => setPainel("devolver")}>
              Registrar devolução
            </button>
          )}
          {pode("cancelar_pendente") && <button onClick={() => setPainel("cancelar_pendente")}>Cancelar saldo pendente</button>}
          {pode("cancelar") && (
            <button className="perigo" onClick={() => setPainel("cancelar")}>
              Cancelar requisição
            </button>
          )}
        </div>
      </div>

      <section className="cartao dados">
        <Dado rotulo="Filial">{s.filial_nome}</Dado>
        <Dado rotulo="Requisitante">{s.requisitante_nome}</Dado>
        <Dado rotulo="Criada em">{data(s.criado_em)}</Dado>
        <Dado rotulo="Enviada em">{data(s.enviado_em)}</Dado>
        <Dado rotulo="Prioridade">{PRIORIDADES[s.prioridade]}</Dado>
        <Dado rotulo="Valor solicitado">{moeda(s.valor_solicitado)}</Dado>
        <Dado rotulo="Valor em loja">{moeda(s.valor_em_loja)}</Dado>
        {s.encerrado_em && <Dado rotulo="Encerrada em">{data(s.encerrado_em)}</Dado>}
        {s.finalidade && <Dado rotulo="Finalidade" largo>{s.finalidade}</Dado>}
        {s.justificativa && <Dado rotulo="Justificativa" largo>{s.justificativa}</Dado>}
        {s.status === "cancelada" && (
          <Dado rotulo="Motivo do cancelamento" largo>
            {[s.motivo_descricao, s.observacao].filter(Boolean).join(" — ") || "—"}
          </Dado>
        )}
      </section>

      <h2 className="secao">Itens</h2>
      <section className="cartao">
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th className="num">Solicitada</th>
                <th className="num">Aprovada</th>
                <th className="num">Expedida</th>
                <th className="num">Em loja</th>
                <th className="num">Estoque</th>
                <th className="num">Descarte</th>
                <th className="num">Perda</th>
                <th className="num">Dias</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {s.itens.map((i) => (
                <tr key={i.item_id}>
                  <td className="nowrap">{i.sku}</td>
                  <td className="produto">
                    {i.descricao}
                    <small className="sutil bloco">
                      {i.fornecedor_nome ?? "sem fornecedor"} · {moeda(i.custo_referencia)}/{i.unidade}
                    </small>
                  </td>
                  <td className="num">{qtd(i.quantidade_solicitada)}</td>
                  <td className="num">{qtd(i.qtd_aprovada)}</td>
                  <td className="num">{qtd(i.qtd_expedida)}</td>
                  <td className="num forte">{qtd(i.qtd_em_loja)}</td>
                  <td className="num">{qtd(i.qtd_estoque)}</td>
                  <td className="num">{qtd(i.qtd_descarte)}</td>
                  <td className="num">{qtd(i.qtd_perda)}</td>
                  <td className="num">{i.dias_em_exposicao ?? "—"}</td>
                  <td>
                    <span className="selo">{STATUS_ITEM[i.status_item] ?? i.status_item}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {s.aprovacoes.length > 0 && (
        <>
          <h2 className="secao">Aprovações</h2>
          <section className="cartao">
            <ul className="linha-tempo">
              {s.aprovacoes.map((a) => (
                <li key={a.id} className={a.decisao === "aprovada" ? "ok" : "ruim"}>
                  <b>
                    {a.etapa === "comercial" ? "Comercial" : "Logística"}: {a.decisao === "aprovada" ? "aprovada" : "reprovada"}
                  </b>{" "}
                  por {a.aprovador_nome} em {dataHora(a.decidido_em)}
                  {(a.motivo_descricao || a.observacao) && (
                    <div className="sutil">{[a.motivo_descricao, a.observacao].filter(Boolean).join(" — ")}</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {s.movimentacoes.length > 0 && (
        <>
          <h2 className="secao">Movimentações</h2>
          <section className="cartao">
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
                      <td>
                        {TIPOS_MOV[m.tipo] ?? m.tipo}
                        {m.estorno_de_id && <small className="sutil"> (#{m.estorno_de_id})</small>}
                        {m.estornada && <span className="selo ruim">Estornada</span>}
                      </td>
                      <td>{m.sku}</td>
                      <td className="num">{qtd(m.quantidade)}</td>
                      <td className="num">{moeda(Number(m.quantidade) * Number(m.custo_unitario))}</td>
                      <td>{m.usuario_nome}</td>
                      <td>{[m.motivo_descricao, m.observacao].filter(Boolean).join(" — ") || "—"}</td>
                      <td className="acoes">
                        {pode("estornar") && !m.estornada && m.tipo !== "estorno" && (
                          <button className="link" onClick={() => setPainel({ estornar: m.id })}>
                            Estornar
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

      <h2 className="secao">Histórico</h2>
      <section className="cartao">
        <ul className="linha-tempo">
          {s.historico.map((h, n) => (
            <li key={n}>
              <b>{ACOES_HISTORICO[h.acao] ?? h.acao}</b>
              {h.acao === "status" && h.dados_depois?.status ? `: ${STATUS[String(h.dados_depois.status)]?.rotulo}` : ""} —{" "}
              {h.usuario_nome} em {dataHora(h.ocorrido_em)}
              {typeof h.dados_depois?.observacao === "string" && <div className="sutil">{h.dados_depois.observacao}</div>}
            </li>
          ))}
        </ul>
      </section>

      {painel === "aprovar" && <PainelAprovar s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {painel === "reprovar" && <PainelReprovar s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {painel === "expedir" && <PainelExpedir s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {painel === "devolver" && <PainelDevolver s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {painel === "cancelar" && <PainelCancelar s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {painel === "cancelar_pendente" && <PainelCancelarPendente s={s} aoFechar={() => setPainel(null)} aoConcluir={concluir} />}
      {typeof painel === "object" && painel && (
        <PainelEstornar s={s} movimentacaoId={painel.estornar} aoFechar={() => setPainel(null)} aoConcluir={concluir} />
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

// ---------------------------------------------------------------------------
// Painéis de ação
// ---------------------------------------------------------------------------

interface PropsPainel {
  s: Detalhe;
  aoFechar: () => void;
  aoConcluir: (s: Detalhe) => void;
}

const num = (v: string) => Number(v.replace(",", ".")) || 0;

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

function Rodape({ enviando, rotulo, aoFechar, perigo }: { enviando: boolean; rotulo: string; aoFechar: () => void; perigo?: boolean }) {
  return (
    <footer>
      <button type="button" onClick={aoFechar}>
        Voltar
      </button>
      <button className={perigo ? "perigo" : "primario"} disabled={enviando}>
        {enviando ? "Salvando…" : rotulo}
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
        <p className="sutil">Ajuste a quantidade se for aprovar menos que o solicitado. Use 0 para não atender um item.</p>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Solicitada</th>
              <th className="num">Aprovar</th>
            </tr>
          </thead>
          <tbody>
            {s.itens.map((i) => (
              <tr key={i.item_id}>
                <td>
                  <b>{i.sku}</b> {i.descricao}
                </td>
                <td className="num">{qtd(i.quantidade_solicitada)}</td>
                <td className="num">
                  <input
                    className="qtd"
                    inputMode="decimal"
                    value={quantidades[i.item_id]}
                    onChange={(e) => setQuantidades({ ...quantidades, [i.item_id]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label>
          Observação
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Aprovar" aoFechar={aoFechar} />
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
        <Rodape enviando={enviando} rotulo="Reprovar" aoFechar={aoFechar} perigo />
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
        <p className="sutil">Informe o que saiu para a loja. A expedição pode ser parcial; o restante continua pendente.</p>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Pendente</th>
              <th className="num">Expedir agora</th>
            </tr>
          </thead>
          <tbody>
            {pendentes.map((i) => (
              <tr key={i.item_id}>
                <td>
                  <b>{i.sku}</b> {i.descricao}
                </td>
                <td className="num">
                  {qtd(i.qtd_pendente_expedicao)} {i.unidade}
                </td>
                <td className="num">
                  <input
                    className="qtd"
                    inputMode="decimal"
                    value={quantidades[i.item_id]}
                    onChange={(e) => setQuantidades({ ...quantidades, [i.item_id]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label>
          Observação (transportador, nota, etc.)
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Confirmar expedição" aoFechar={aoFechar} />
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
          Classifique cada quantidade: <b>Estoque</b> (voltou em condição de uso), <b>Descarte</b> (voltou sem condição) ou{" "}
          <b>Perda</b> (não voltou). Pode ser parcial.
        </p>
        {emLoja.map((i) => {
          const l = linhas[i.item_id];
          return (
            <fieldset key={i.item_id}>
              <legend>
                {i.sku} · {i.descricao} — em loja: {qtd(i.qtd_em_loja)} {i.unidade}
              </legend>
              <div className="destinos">
                <label>
                  Estoque
                  <input className="qtd" inputMode="decimal" value={l.estoque} onChange={(e) => mudar(i.item_id, "estoque", e.target.value)} />
                </label>
                <label>
                  Descarte
                  <input className="qtd" inputMode="decimal" value={l.descarte} onChange={(e) => mudar(i.item_id, "descarte", e.target.value)} />
                </label>
                <label>
                  Perda
                  <input className="qtd" inputMode="decimal" value={l.perda} onChange={(e) => mudar(i.item_id, "perda", e.target.value)} />
                </label>
              </div>
              {num(l.descarte) > 0 && (
                <SeletorMotivo tipo="descarte" rotulo="Motivo do descarte *" valor={l.motivoDescarte} aoMudar={(v) => mudar(i.item_id, "motivoDescarte", v)} />
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
        <Rodape enviando={enviando} rotulo="Confirmar devolução" aoFechar={aoFechar} />
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
    <Modal titulo="Cancelar requisição" aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <SeletorMotivo tipo="cancelamento" rotulo={rascunho ? "Motivo" : "Motivo *"} valor={motivo} aoMudar={setMotivo} />
        <label>
          Observação
          <textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Cancelar requisição" aoFechar={aoFechar} perigo />
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
        <p className="sutil">O saldo que ainda não saiu deixa de ser pendente. O que já foi expedido continua em loja.</p>
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
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} required minLength={3} placeholder="Ex.: sem disponibilidade no depósito" />
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
        <p>
          {TIPOS_MOV[m.tipo]} de <b>{qtd(m.quantidade)}</b> — {m.sku}, em {dataHora(m.ocorrido_em)} por {m.usuario_nome}.
        </p>
        <p className="sutil">O lançamento original continua no histórico, marcado como estornado.</p>
        <SeletorMotivo tipo="estorno" valor={motivo} aoMudar={setMotivo} />
        <label>
          Observação
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>
        {erro && <div className="erro">{erro}</div>}
        <Rodape enviando={enviando} rotulo="Estornar" aoFechar={aoFechar} perigo />
      </form>
    </Modal>
  );
}
