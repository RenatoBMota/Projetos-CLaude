import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, FileUp, Pencil, Plus, Search } from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api, baixar, enviar, Pagina } from "../api";
import { Modal } from "../componentes/Modal";

type Registro = Record<string, unknown> & { id: number; ativo: boolean };

interface Campo {
  nome: string;
  rotulo: string;
  tipo?: "texto" | "numero" | "bool" | "select" | "fornecedor";
  obrigatorio?: boolean;
  opcoes?: { valor: string; rotulo: string }[];
  padrao?: unknown;
  naTabela?: boolean;
  exibir?: (r: Registro) => string;
}

interface Config {
  entidade: string;
  titulo: string;
  singular: string;
  feminino?: boolean;
  campos: Campo[];
}

const TIPOS_MOTIVO = [
  { valor: "descarte", rotulo: "Descarte" },
  { valor: "perda", rotulo: "Perda" },
  { valor: "reprovacao", rotulo: "Reprovação" },
  { valor: "cancelamento", rotulo: "Cancelamento" },
  { valor: "estorno", rotulo: "Estorno" },
];

const moeda = (v: unknown) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const CADASTROS: Config[] = [
  {
    entidade: "produtos",
    titulo: "Produtos",
    singular: "produto",
    campos: [
      { nome: "sku", rotulo: "SKU", obrigatorio: true, naTabela: true },
      { nome: "descricao", rotulo: "Descrição", obrigatorio: true, naTabela: true },
      { nome: "marca", rotulo: "Marca", naTabela: true },
      { nome: "linha", rotulo: "Linha" },
      { nome: "formato", rotulo: "Formato", naTabela: true },
      { nome: "unidade", rotulo: "Unidade", padrao: "PC" },
      {
        nome: "fornecedor_id",
        rotulo: "Fornecedor",
        tipo: "fornecedor",
        naTabela: true,
        exibir: (r) => String(r.fornecedor_nome ?? "—"),
      },
      { nome: "custo_referencia", rotulo: "Custo de referência (R$)", tipo: "numero", padrao: 0, naTabela: true, exibir: (r) => moeda(r.custo_referencia) },
    ],
  },
  {
    entidade: "fornecedores",
    titulo: "Fornecedores",
    singular: "fornecedor",
    campos: [
      { nome: "codigo", rotulo: "Código", obrigatorio: true, naTabela: true },
      { nome: "razao_social", rotulo: "Razão social", obrigatorio: true, naTabela: true },
      { nome: "cnpj", rotulo: "CNPJ", naTabela: true },
      { nome: "contato", rotulo: "Contato", naTabela: true },
    ],
  },
  {
    entidade: "filiais",
    titulo: "Filiais",
    singular: "filial",
    feminino: true,
    campos: [
      { nome: "codigo", rotulo: "Código", obrigatorio: true, naTabela: true },
      { nome: "nome", rotulo: "Nome", obrigatorio: true, naTabela: true },
      { nome: "cnpj", rotulo: "CNPJ", naTabela: true },
    ],
  },
  {
    entidade: "motivos",
    titulo: "Motivos",
    singular: "motivo",
    campos: [
      {
        nome: "tipo",
        rotulo: "Tipo",
        tipo: "select",
        opcoes: TIPOS_MOTIVO,
        padrao: "descarte",
        obrigatorio: true,
        naTabela: true,
        exibir: (r) => TIPOS_MOTIVO.find((t) => t.valor === r.tipo)?.rotulo ?? String(r.tipo),
      },
      { nome: "descricao", rotulo: "Descrição", obrigatorio: true, naTabela: true },
      {
        nome: "exige_observacao",
        rotulo: "Exige observação",
        tipo: "bool",
        padrao: false,
        naTabela: true,
        exibir: (r) => (r.exige_observacao ? "Sim" : "Não"),
      },
    ],
  },
];

export function Cadastros() {
  return (
    <>
      <nav className="subabas">
        {CADASTROS.map((c) => (
          <NavLink key={c.entidade} to={c.entidade}>
            {c.titulo}
          </NavLink>
        ))}
      </nav>
      <Routes>
        {CADASTROS.map((c) => (
          <Route key={c.entidade} path={c.entidade} element={<TabelaCadastro key={c.entidade} config={c} />} />
        ))}
        <Route path="*" element={<Navigate to="produtos" replace />} />
      </Routes>
    </>
  );
}

const POR_PAGINA = 50;

function TabelaCadastro({ config }: { config: Config }) {
  const [dados, setDados] = useState<Pagina<Registro> | null>(null);
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Registro | "novo" | null>(null);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    const q = new URLSearchParams({ busca, pagina: String(pagina), limite: String(POR_PAGINA) });
    if (!inativos) q.set("ativos", "true");
    api<Pagina<Registro>>(`/api/cadastros/${config.entidade}?${q}`)
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, [config.entidade, busca, inativos, pagina]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  const colunas = config.campos.filter((c) => c.naTabela);
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / POR_PAGINA)) : 1;

  return (
    <section className="cartao">
      <div className="barra">
        <div className="campo-icone busca">
          <Search size={16} />
          <input
            placeholder={`Buscar ${config.titulo.toLowerCase()}`}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} />
          Mostrar inativos
        </label>
        <span className="espaco" />
        {config.entidade === "produtos" && (
          <button onClick={() => setImportando(true)}>
            <FileUp size={16} /> Importar planilha
          </button>
        )}
        <button className="primario" onClick={() => setEditando("novo")}>
          <Plus size={16} /> {config.feminino ? "Nova" : "Novo"} {config.singular}
        </button>
      </div>
      {erro && <div className="erro">{erro}</div>}
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              {colunas.map((c) => (
                <th key={c.nome}>{c.rotulo}</th>
              ))}
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dados?.itens.map((r) => (
              <tr key={r.id} className={r.ativo ? "" : "inativo"}>
                {colunas.map((c) => (
                  <td key={c.nome} className={c.tipo === "numero" ? "num" : ""}>
                    {c.exibir ? c.exibir(r) : String(r[c.nome] ?? "—")}
                  </td>
                ))}
                <td>
                  <span className={`selo ${r.ativo ? "ok" : ""}`}>{r.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td className="acoes">
                  <button className="link" onClick={() => setEditando(r)}>
                    <Pencil size={14} /> Editar
                  </button>
                </td>
              </tr>
            ))}
            {dados && dados.itens.length === 0 && (
              <tr>
                <td colSpan={colunas.length + 2} className="vazio">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {dados && (
        <div className="paginacao">
          <span>{dados.total} registro(s)</span>
          <span className="espaco" />
          <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
            Anterior
          </button>
          <span>
            {pagina} / {paginas}
          </span>
          <button disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
            Próxima
          </button>
        </div>
      )}
      {editando && (
        <FormularioCadastro
          config={config}
          registro={editando === "novo" ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
      {importando && (
        <ImportarProdutos
          aoFechar={() => {
            setImportando(false);
            carregar();
          }}
        />
      )}
    </section>
  );
}

function useFornecedores() {
  const [lista, setLista] = useState<{ id: number; codigo: string; razao_social: string }[]>([]);
  useEffect(() => {
    api<Pagina<{ id: number; codigo: string; razao_social: string }>>("/api/cadastros/fornecedores?ativos=true&limite=500").then(
      (r) => setLista(r.itens),
    );
  }, []);
  return lista;
}

function FormularioCadastro({
  config,
  registro,
  aoFechar,
  aoSalvar,
}: {
  config: Config;
  registro: Registro | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const inicial: Record<string, unknown> = { ativo: true };
  for (const c of config.campos) inicial[c.nome] = registro ? registro[c.nome] : c.padrao ?? "";
  if (registro) inicial.ativo = registro.ativo;
  const [valores, setValores] = useState(inicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const precisaFornecedores = config.campos.some((c) => c.tipo === "fornecedor");
  const fornecedores = useFornecedores();

  const mudar = (nome: string, valor: unknown) => setValores((v) => ({ ...v, [nome]: valor }));

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const corpo: Record<string, unknown> = { ativo: valores.ativo };
    for (const c of config.campos) {
      const v = valores[c.nome];
      if (c.tipo === "fornecedor") corpo[c.nome] = v ? Number(v) : null;
      else if (c.tipo === "numero") corpo[c.nome] = v === "" ? 0 : String(v).replace(",", ".");
      else corpo[c.nome] = v === "" ? null : v;
    }
    try {
      if (registro) await enviar(`/api/cadastros/${config.entidade}/${registro.id}`, "PUT", corpo);
      else await enviar(`/api/cadastros/${config.entidade}`, "POST", corpo);
      aoSalvar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={`${registro ? "Editar" : config.feminino ? "Nova" : "Novo"} ${config.singular}`} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        {config.campos.map((c) => {
          const v = valores[c.nome];
          if (c.tipo === "bool")
            return (
              <label key={c.nome} className="check">
                <input type="checkbox" checked={!!v} onChange={(e) => mudar(c.nome, e.target.checked)} />
                {c.rotulo}
              </label>
            );
          return (
            <label key={c.nome}>
              {c.rotulo}
              {c.obrigatorio && " *"}
              {c.tipo === "select" ? (
                <select value={String(v)} onChange={(e) => mudar(c.nome, e.target.value)}>
                  {c.opcoes!.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              ) : c.tipo === "fornecedor" && precisaFornecedores ? (
                <select value={v ? String(v) : ""} onChange={(e) => mudar(c.nome, e.target.value)}>
                  <option value="">— sem fornecedor —</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.codigo} · {f.razao_social}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={v == null ? "" : String(v)}
                  inputMode={c.tipo === "numero" ? "decimal" : undefined}
                  required={c.obrigatorio}
                  onChange={(e) => mudar(c.nome, e.target.value)}
                />
              )}
            </label>
          );
        })}
        <label className="check">
          <input type="checkbox" checked={!!valores.ativo} onChange={(e) => mudar("ativo", e.target.checked)} />
          Ativo
        </label>
        {erro && <div className="erro">{erro}</div>}
        <footer>
          <button type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primario" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

interface ResultadoImportacao {
  importado: boolean;
  inseridos?: number;
  atualizados?: number;
  fornecedores_criados?: number;
  erros: { linha: number; mensagem: string }[];
}

function ImportarProdutos({ aoFechar }: { aoFechar: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const importar = async () => {
    if (!arquivo) return;
    setErro("");
    setResultado(null);
    setEnviando(true);
    const form = new FormData();
    form.append("arquivo", arquivo);
    try {
      setResultado(await api<ResultadoImportacao>("/api/cadastros/produtos/importar", { method: "POST", body: form }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Importar produtos" aoFechar={aoFechar}>
      <div className="formulario">
        <p className="sutil">
          Envie a planilha exportada do ERP (.xlsx ou .csv). Colunas obrigatórias: <b>sku</b> e <b>descricao</b>. Opcionais:
          marca, linha, formato, unidade, fornecedor_codigo, fornecedor_nome e custo. Produtos já cadastrados são
          atualizados pelo SKU. Se houver qualquer erro, nada é gravado.
        </p>
        <button type="button" className="link" onClick={() => baixar("/api/cadastros/produtos/modelo", "modelo_produtos.xlsx")}>
          <Download size={14} /> Baixar planilha modelo
        </button>
        <input
          ref={entrada}
          type="file"
          accept=".xlsx,.csv"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setArquivo(e.target.files?.[0] ?? null);
            setResultado(null);
          }}
        />
        {erro && <div className="erro">{erro}</div>}
        {resultado?.importado && (
          <div className="sucesso">
            Importação concluída: {resultado.inseridos} novo(s), {resultado.atualizados} atualizado(s)
            {resultado.fornecedores_criados ? `, ${resultado.fornecedores_criados} fornecedor(es) criado(s)` : ""}.
          </div>
        )}
        {resultado && !resultado.importado && (
          <div className="erro">
            Nada foi importado. Corrija a planilha:
            <ul>
              {resultado.erros.slice(0, 50).map((e) => (
                <li key={e.linha + e.mensagem}>
                  Linha {e.linha}: {e.mensagem}
                </li>
              ))}
            </ul>
            {resultado.erros.length > 50 && <p>… e mais {resultado.erros.length - 50} erro(s).</p>}
          </div>
        )}
        <footer>
          <button type="button" onClick={aoFechar}>
            Fechar
          </button>
          <button className="primario" disabled={!arquivo || enviando} onClick={importar}>
            {enviando ? "Importando…" : "Importar"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
