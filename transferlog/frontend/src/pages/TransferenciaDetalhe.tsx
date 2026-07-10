import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError, baixarArquivo } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { nomeUnidade, type Transferencia, type TipoDivergencia, type TipoEvento } from "../api/types";
import { formatarData, formatarDataHora, formatarMoeda } from "../utils/formatar";

const LABEL_EVENTO: Record<TipoEvento, string> = {
  UPLOAD: "Nota enviada / transferência criada",
  SEPARACAO: "Separação concluída",
  CARREGAMENTO: "Carregamento confirmado",
  RECEBIMENTO: "Recebimento confirmado",
  CONFERENCIA: "Conferência registrada",
  CANCELAMENTO: "Cancelada",
};

interface ConferenciaLinha {
  itemId: string;
  quantidadeConferida: number;
  divergenciaTipo?: TipoDivergencia;
  divergenciaQtd?: number;
  divergenciaObs?: string;
}

export function TransferenciaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [transferencia, setTransferencia] = useState<Transferencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [baixandoDanfe, setBaixandoDanfe] = useState(false);

  async function baixarDanfe() {
    if (!id) return;
    setErro(null);
    setBaixandoDanfe(true);
    try {
      await baixarArquivo(`/transferencias/${id}/danfe`, `DANFE-${transferencia?.numeroNF}.pdf`);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível baixar a DANFE");
    } finally {
      setBaixandoDanfe(false);
    }
  }

  async function recarregar() {
    if (!id) return;
    const dados = await api.get<Transferencia>(`/transferencias/${id}`);
    setTransferencia(dados);
  }

  useEffect(() => {
    recarregar().catch((err) => setErro(err.message));
  }, [id]);

  async function acao<T>(fn: () => Promise<T>) {
    setErro(null);
    setCarregando(true);
    try {
      await fn();
      await recarregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao executar ação");
    } finally {
      setCarregando(false);
    }
  }

  if (erro && !transferencia) return <div className="error-box">{erro}</div>;
  if (!transferencia) return <p>Carregando...</p>;

  const t = transferencia;

  return (
    <div>
      <h1 style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span>
          NF {t.numeroNF} — Pedido {t.numeroPedido} <StatusBadge status={t.status} itens={t.itens} />
          {t.numeroBonus && <span className="badge neutral" style={{ marginLeft: 8 }}>Bônus nº {t.numeroBonus}</span>}
        </span>
        <button disabled={baixandoDanfe} onClick={baixarDanfe} style={{ fontSize: 14 }}>
          {baixandoDanfe ? "Gerando DANFE..." : "Baixar DANFE"}
        </button>
      </h1>
      {erro && <div className="error-box">{erro}</div>}

      <div className="card">
        <div className="form-row">
          <div className="field"><label>Origem</label><strong>{nomeUnidade(t.origem)}</strong></div>
          <div className="field"><label>Destino</label><strong>{nomeUnidade(t.destino)}</strong></div>
          <div className="field"><label>Série</label><strong>{t.serie}</strong></div>
          <div className="field"><label>Data do pedido</label><strong>{formatarDataHora(t.dataPedido)}</strong></div>
          <div className="field"><label>Prazo previsto</label><strong>{formatarDataHora(t.prazoPrevisto)}</strong></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Valor</label><strong>{formatarMoeda(t.valorTotal)}</strong></div>
          <div className="field"><label>Volumes</label><strong>{t.qtdVolumes}</strong></div>
          <div className="field"><label>Peso (kg)</label><strong>{t.pesoBruto}</strong></div>
          <div className="field"><label>SKUs</label><strong>{t.qtdSku}</strong></div>
          <div className="field"><label>Itens totais</label><strong>{t.qtdItensTotal}</strong></div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Data de emissão da NF</label>
            <strong>{t.dataEmissaoConfiavel ? formatarDataHora(t.dataEmissao) : formatarData(t.dataEmissao)}</strong>
          </div>
          <div className="field"><label>Enviado ao sistema em</label><strong>{formatarDataHora(t.createdAt)}</strong></div>
        </div>
        {(t.transportadora || t.veiculo || t.motorista) && (
          <div className="form-row">
            <div className="field"><label>Transportadora</label><strong>{t.transportadora ?? "—"}</strong></div>
            <div className="field"><label>Veículo</label><strong>{t.veiculo ?? "—"}</strong></div>
            <div className="field"><label>Motorista</label><strong>{t.motorista ?? "—"}</strong></div>
          </div>
        )}
        {t.otif && t.otif.otif !== null && (
          <p>
            OTIF:{" "}
            <span className={`badge ${t.otif.otif ? "ok" : "danger"}`}>
              {t.otif.otif ? "Sim" : "Não"}
            </span>{" "}
            (On Time: {t.otif.onTime ? "sim" : "não"}, In Full: {t.otif.inFull ? "sim" : "não"})
          </p>
        )}
      </div>

      <div className="card">
        <h2>Produtos</h2>
        <ItensTabela transferencia={t} />
      </div>

      <div className="card">
        <h2>Histórico</h2>
        {t.eventos.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nenhum evento registrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Data e hora</th><th>Etapa</th><th>Usuário</th><th>Observação</th></tr>
            </thead>
            <tbody>
              {t.eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{formatarDataHora(evento.dataHora)}</td>
                  <td>{LABEL_EVENTO[evento.tipo]}</td>
                  <td>{evento.usuario.nome}</td>
                  <td>{evento.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(t.status === "PENDENTE_SEPARACAO" || t.status === "EM_SEPARACAO") && (
        <SeparacaoBloco transferencia={t} carregando={carregando} acao={acao} />
      )}

      {t.status === "CARREGADO" && (
        <CarregamentoBloco transferenciaId={t.id} carregando={carregando} acao={acao} />
      )}

      {t.status === "EM_TRANSITO" && (
        <div className="card">
          <h2>Em trânsito</h2>
          <button
            className="primary"
            disabled={carregando}
            onClick={() => acao(() => api.post(`/transferencias/${t.id}/confirmar-recebimento`))}
          >
            Confirmar recebimento
          </button>
        </div>
      )}

      {t.status === "RECEBIDO" && (
        <ConferenciaBloco transferencia={t} carregando={carregando} acao={acao} />
      )}

      {(t.status === "CONFERIDO_OK" || t.status === "CONFERIDO_DIVERGENTE") && (
        <div className="card">
          <h2>{t.status === "CONFERIDO_OK" ? "Recebido OK" : "Recebido com divergência"}</h2>
          <button
            className="primary"
            disabled={carregando}
            onClick={() => acao(() => api.post(`/transferencias/${t.id}/finalizar`))}
          >
            Finalizar transferência
          </button>
        </div>
      )}
    </div>
  );
}

function ItensTabela({ transferencia }: { transferencia: Transferencia }) {
  return (
    <table>
      <thead>
        <tr><th>Código</th><th>Descrição</th><th>Qtd NF</th><th>Conferido</th><th>Divergência</th></tr>
      </thead>
      <tbody>
        {transferencia.itens.map((item) => (
          <tr key={item.id}>
            <td>{item.codigoInterno}</td>
            <td>{item.descricao}</td>
            <td>{item.quantidade}</td>
            <td>{item.quantidadeConferida ?? "—"}</td>
            <td>
              {item.divergenciaTipo
                ? `${item.divergenciaTipo}${item.divergenciaQtd ? ` (${item.divergenciaQtd})` : ""}`
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SeparacaoBloco({
  transferencia,
  carregando,
  acao,
}: {
  transferencia: Transferencia;
  carregando: boolean;
  acao: <T>(fn: () => Promise<T>) => Promise<void>;
}) {
  const todosSeparados = transferencia.itens.every((i) => i.separado);

  return (
    <div className="card">
      <h2>Separação</h2>
      <table>
        <thead>
          <tr><th></th><th>Código</th><th>Descrição</th><th>Qtd</th></tr>
        </thead>
        <tbody>
          {transferencia.itens.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={item.separado}
                  disabled={carregando}
                  onChange={(e) =>
                    acao(() =>
                      api.patch(`/transferencias/${transferencia.id}/itens/${item.id}/separar`, {
                        separado: e.target.checked,
                      }),
                    )
                  }
                />
              </td>
              <td>{item.codigoInterno}</td>
              <td>{item.descricao}</td>
              <td>{item.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="primary"
        style={{ marginTop: 12 }}
        disabled={!todosSeparados || carregando}
        onClick={() => acao(() => api.post(`/transferencias/${transferencia.id}/concluir-separacao`))}
      >
        Separação concluída
      </button>
    </div>
  );
}

function CarregamentoBloco({
  transferenciaId,
  carregando,
  acao,
}: {
  transferenciaId: string;
  carregando: boolean;
  acao: <T>(fn: () => Promise<T>) => Promise<void>;
}) {
  const [transportadora, setTransportadora] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [motorista, setMotorista] = useState("");

  return (
    <div className="card">
      <h2>Carregamento</h2>
      <div className="form-row">
        <div className="field">
          <label>Transportadora</label>
          <input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
        </div>
        <div className="field">
          <label>Veículo</label>
          <input value={veiculo} onChange={(e) => setVeiculo(e.target.value)} />
        </div>
        <div className="field">
          <label>Motorista</label>
          <input value={motorista} onChange={(e) => setMotorista(e.target.value)} />
        </div>
      </div>
      <button
        className="primary"
        disabled={carregando}
        onClick={() =>
          acao(() =>
            api.post(`/transferencias/${transferenciaId}/carregar`, { transportadora, veiculo, motorista }),
          )
        }
      >
        Marcar como Carregado
      </button>
    </div>
  );
}

function ConferenciaBloco({
  transferencia,
  carregando,
  acao,
}: {
  transferencia: Transferencia;
  carregando: boolean;
  acao: <T>(fn: () => Promise<T>) => Promise<void>;
}) {
  const [linhas, setLinhas] = useState<Record<string, ConferenciaLinha>>(() =>
    Object.fromEntries(
      transferencia.itens.map((item) => [
        item.id,
        { itemId: item.id, quantidadeConferida: item.quantidade },
      ]),
    ),
  );
  const [numeroBonus, setNumeroBonus] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  function atualizar(itemId: string, patch: Partial<ConferenciaLinha>) {
    setLinhas((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  async function enviar() {
    if (!/^\d+$/.test(numeroBonus)) {
      setErroLocal("Informe o número do Bônus (apenas números) antes de registrar a conferência.");
      return;
    }
    setErroLocal(null);
    const itens = Object.values(linhas).map((linha) => ({
      itemId: linha.itemId,
      quantidadeConferida: linha.quantidadeConferida,
      ...(linha.divergenciaTipo
        ? {
            divergenciaTipo: linha.divergenciaTipo,
            divergenciaQtd: linha.divergenciaQtd,
            divergenciaObs: linha.divergenciaObs,
          }
        : {}),
    }));
    await acao(() => api.post(`/transferencias/${transferencia.id}/conferencia`, { itens, numeroBonus }));
  }

  return (
    <div className="card">
      <h2>Recebimento / Conferência</h2>
      {erroLocal && <div className="error-box">{erroLocal}</div>}
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Número do Bônus *</label>
        <input
          inputMode="numeric"
          value={numeroBonus}
          onChange={(e) => setNumeroBonus(e.target.value.replace(/\D/g, ""))}
          placeholder="Somente números"
        />
      </div>
      <p>SKUs na NF: {transferencia.qtdSku}</p>
      <table>
        <thead>
          <tr><th>Descrição</th><th>Qtd NF</th><th>Conferido</th><th>Erro</th><th>Qtd divergente</th><th>Observação</th></tr>
        </thead>
        <tbody>
          {transferencia.itens.map((item) => {
            const linha = linhas[item.id];
            return (
              <tr key={item.id}>
                <td>{item.descricao}</td>
                <td>{item.quantidade}</td>
                <td>
                  <input
                    type="number"
                    style={{ width: 70 }}
                    value={linha.quantidadeConferida}
                    onChange={(e) => atualizar(item.id, { quantidadeConferida: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <select
                    value={linha.divergenciaTipo ?? ""}
                    onChange={(e) =>
                      atualizar(item.id, {
                        divergenciaTipo: (e.target.value || undefined) as TipoDivergencia | undefined,
                      })
                    }
                  >
                    <option value="">Sem erro</option>
                    <option value="FALTOU">Faltou</option>
                    <option value="SOBROU">Sobrou</option>
                    <option value="QUEBRADO">Quebrado</option>
                    <option value="PRODUTO_ERRADO">Produto errado</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    style={{ width: 70 }}
                    disabled={!linha.divergenciaTipo}
                    value={linha.divergenciaQtd ?? ""}
                    onChange={(e) => atualizar(item.id, { divergenciaQtd: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    disabled={!linha.divergenciaTipo}
                    value={linha.divergenciaObs ?? ""}
                    onChange={(e) => atualizar(item.id, { divergenciaObs: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        className="primary"
        style={{ marginTop: 12 }}
        disabled={carregando || !/^\d+$/.test(numeroBonus)}
        onClick={enviar}
      >
        Registrar conferência
      </button>
    </div>
  );
}
