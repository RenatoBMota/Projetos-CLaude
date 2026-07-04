import { useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Unidade } from "../api/types";

interface NfeItemEditavel {
  codigoInterno: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
}

interface ResumoResponse {
  nfe: {
    numeroNF: string;
    serie: string;
    numeroPedido: string;
    emitenteCnpj: string;
    destinatarioCnpj: string;
    dataEmissao: string;
    valorTotal: number;
    qtdVolumes: number;
    pesoBruto: number;
    itens: NfeItemEditavel[];
  };
  origem: Unidade;
  destino: Unidade;
  prazoPrevisto: string;
  qtdSku: number;
  qtdItensTotal: number;
  arquivoPath: string;
  fonte: "XML" | "PDF_OCR";
}

export function UploadNota() {
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [campos, setCampos] = useState({ numeroNF: "", serie: "", numeroPedido: "", valorTotal: 0, qtdVolumes: 0, pesoBruto: 0 });
  const [itens, setItens] = useState<NfeItemEditavel[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function lerNf(file: File) {
    setErro(null);
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const dados = await api.upload<ResumoResponse>("/transferencias/resumo", formData);
      setResumo(dados);
      setCampos({
        numeroNF: dados.nfe.numeroNF,
        serie: dados.nfe.serie,
        numeroPedido: dados.nfe.numeroPedido,
        valorTotal: dados.nfe.valorTotal,
        qtdVolumes: dados.nfe.qtdVolumes,
        pesoBruto: dados.nfe.pesoBruto,
      });
      setItens(dados.nfe.itens);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível ler o arquivo");
    } finally {
      setCarregando(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setArquivo(file);
      lerNf(file);
    }
  }

  function atualizarItem(index: number, patch: Partial<NfeItemEditavel>) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function criarTransferencia() {
    if (!resumo) return;
    setErro(null);
    setCarregando(true);
    try {
      const transferencia = await api.post<{ id: string }>("/transferencias", {
        arquivoPath: resumo.arquivoPath,
        numeroNF: campos.numeroNF,
        serie: campos.serie,
        numeroPedido: campos.numeroPedido,
        emitenteCnpj: resumo.nfe.emitenteCnpj,
        destinatarioCnpj: resumo.nfe.destinatarioCnpj,
        dataEmissao: resumo.nfe.dataEmissao,
        valorTotal: campos.valorTotal,
        qtdVolumes: campos.qtdVolumes,
        pesoBruto: campos.pesoBruto,
        itens,
      });
      navigate(`/transferencias/${transferencia.id}`);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível criar a transferência");
    } finally {
      setCarregando(false);
    }
  }

  if (resumo) {
    const isOcr = resumo.fonte === "PDF_OCR";
    return (
      <div>
        <h1>Resumo da NF</h1>
        {erro && <div className="error-box">{erro}</div>}
        {isOcr && (
          <div className="error-box" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
            Dados extraídos de PDF por OCR — menos confiável que o XML. Revise e corrija os campos
            abaixo antes de confirmar.
          </div>
        )}
        <div className="card">
          <div className="form-row">
            <div className="field">
              <label>NF</label>
              <input value={campos.numeroNF} onChange={(e) => setCampos((c) => ({ ...c, numeroNF: e.target.value }))} />
            </div>
            <div className="field">
              <label>Série</label>
              <input value={campos.serie} onChange={(e) => setCampos((c) => ({ ...c, serie: e.target.value }))} />
            </div>
            <div className="field">
              <label>Pedido</label>
              <input value={campos.numeroPedido} onChange={(e) => setCampos((c) => ({ ...c, numeroPedido: e.target.value }))} />
            </div>
            <div className="field"><label>Origem</label><strong>{resumo.origem.nome}</strong></div>
            <div className="field"><label>Destino</label><strong>{resumo.destino.nome}</strong></div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Valor</label>
              <input
                type="number"
                step="0.01"
                value={campos.valorTotal}
                onChange={(e) => setCampos((c) => ({ ...c, valorTotal: Number(e.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Volumes</label>
              <input
                type="number"
                value={campos.qtdVolumes}
                onChange={(e) => setCampos((c) => ({ ...c, qtdVolumes: Number(e.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                value={campos.pesoBruto}
                onChange={(e) => setCampos((c) => ({ ...c, pesoBruto: Number(e.target.value) }))}
              />
            </div>
            <div className="field"><label>SKUs</label><strong>{itens.length}</strong></div>
            <div className="field"><label>Itens totais</label><strong>{itens.reduce((a, i) => a + i.quantidade, 0)}</strong></div>
          </div>
          <div className="field">
            <label>Prazo previsto (SLA da rota)</label>
            <strong>{new Date(resumo.prazoPrevisto).toLocaleString("pt-BR")}</strong>
          </div>
        </div>
        <div className="card">
          <h2>Produtos</h2>
          <table>
            <thead>
              <tr><th>Código</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>Qtd</th></tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={index}>
                  <td><input style={{ width: 90 }} value={item.codigoInterno} onChange={(e) => atualizarItem(index, { codigoInterno: e.target.value })} /></td>
                  <td><input style={{ width: 220 }} value={item.descricao} onChange={(e) => atualizarItem(index, { descricao: e.target.value })} /></td>
                  <td><input style={{ width: 90 }} value={item.ncm} onChange={(e) => atualizarItem(index, { ncm: e.target.value })} /></td>
                  <td><input style={{ width: 70 }} value={item.cfop} onChange={(e) => atualizarItem(index, { cfop: e.target.value })} /></td>
                  <td><input style={{ width: 70 }} type="number" value={item.quantidade} onChange={(e) => atualizarItem(index, { quantidade: Number(e.target.value) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions">
          <button className="primary" disabled={carregando} onClick={criarTransferencia}>
            {carregando ? "Criando..." : "Criar Transferência"}
          </button>
          <button onClick={() => { setResumo(null); setArquivo(null); }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Upload de Nota</h1>
      {erro && <div className="error-box">{erro}</div>}
      <div
        className={`dropzone ${dragOver ? "dragover" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <p>Arraste o XML ou PDF da NF-e aqui</p>
        <p style={{ margin: "12px 0" }}>ou</p>
        <input
          type="file"
          accept=".xml,.pdf,text/xml,application/xml,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setArquivo(file);
            if (file) lerNf(file);
          }}
        />
        {arquivo && <p style={{ marginTop: 12 }}>{arquivo.name}</p>}
      </div>
      {carregando && <p style={{ marginTop: 12 }}>Lendo NF... (PDFs podem levar alguns segundos, pois usam OCR)</p>}
    </div>
  );
}
