import { useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Unidade } from "../api/types";

interface NfeItem {
  codigoInterno: string;
  descricao: string;
  quantidade: number;
}

interface ResumoResponse {
  nfe: {
    numeroNF: string;
    numeroPedido: string;
    valorTotal: number;
    qtdVolumes: number;
    pesoBruto: number;
    itens: NfeItem[];
  };
  origem: Unidade;
  destino: Unidade;
  prazoPrevisto: string;
  qtdSku: number;
  qtdItensTotal: number;
  arquivoPath: string;
}

export function UploadNota() {
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
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

  async function criarTransferencia() {
    if (!resumo) return;
    setErro(null);
    setCarregando(true);
    try {
      const transferencia = await api.post<{ id: string }>("/transferencias", {
        arquivoPath: resumo.arquivoPath,
      });
      navigate(`/transferencias/${transferencia.id}`);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível criar a transferência");
    } finally {
      setCarregando(false);
    }
  }

  if (resumo) {
    return (
      <div>
        <h1>Resumo da NF</h1>
        {erro && <div className="error-box">{erro}</div>}
        <div className="card">
          <div className="form-row">
            <div className="field"><label>NF</label><strong>{resumo.nfe.numeroNF}</strong></div>
            <div className="field"><label>Pedido</label><strong>{resumo.nfe.numeroPedido}</strong></div>
            <div className="field"><label>Origem</label><strong>{resumo.origem.nome}</strong></div>
            <div className="field"><label>Destino</label><strong>{resumo.destino.nome}</strong></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Valor</label><strong>{resumo.nfe.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
            <div className="field"><label>Volumes</label><strong>{resumo.nfe.qtdVolumes}</strong></div>
            <div className="field"><label>Peso</label><strong>{resumo.nfe.pesoBruto} kg</strong></div>
            <div className="field"><label>SKUs</label><strong>{resumo.qtdSku}</strong></div>
            <div className="field"><label>Itens totais</label><strong>{resumo.qtdItensTotal}</strong></div>
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
              <tr><th>Código</th><th>Descrição</th><th>Qtd</th></tr>
            </thead>
            <tbody>
              {resumo.nfe.itens.map((item) => (
                <tr key={item.codigoInterno}>
                  <td>{item.codigoInterno}</td>
                  <td>{item.descricao}</td>
                  <td>{item.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions">
          <button className="primary" disabled={carregando} onClick={criarTransferencia}>
            {carregando ? "Criando..." : "Criar Transferência"}
          </button>
          <button onClick={() => setResumo(null)}>Cancelar</button>
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
        <p>Arraste o XML da NF-e aqui</p>
        <p style={{ margin: "12px 0" }}>ou</p>
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setArquivo(file);
            if (file) lerNf(file);
          }}
        />
        {arquivo && <p style={{ marginTop: 12 }}>{arquivo.name}</p>}
      </div>
      {carregando && <p style={{ marginTop: 12 }}>Lendo NF...</p>}
    </div>
  );
}
