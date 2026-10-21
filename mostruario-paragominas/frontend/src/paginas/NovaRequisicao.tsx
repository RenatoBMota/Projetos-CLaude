import { CheckCircle2, Minus, PackagePlus, Plus, Save, Search, Send, Trash2, UserRound } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, enviar, Pagina } from "../api";
import { Cabecalho, Vazio, useToast } from "../componentes/ui";
import { moeda, qtd, useFiliais } from "../formato";
import { temPerfil, useSessao } from "../sessao";

interface Produto {
  id: number;
  sku: string;
  descricao: string;
  unidade: string;
  custo_referencia: number;
  fornecedor_nome: string | null;
  area_peca_m2?: number | null;
  pecas_caixa?: number | null;
}

/** Produto com medida da peça: a requisição é feita em peças e convertida em m². */
const porPeca = (p: Produto) => Number(p.area_peca_m2) > 0;
const m2DaLinha = (l: { produto: Produto; quantidade: string }) =>
  porPeca(l.produto) ? Math.round(num(l.quantidade) * Number(l.produto.area_peca_m2) * 1000) / 1000 : num(l.quantidade);

interface Linha {
  produto: Produto;
  quantidade: string;
}

const num = (s: string) => Number(String(s).replace(",", ".")) || 0;

export function NovaRequisicao() {
  const { id } = useParams();
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const toast = useToast();
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
  const [sugestoes, setSugestoes] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campoBusca = useRef<HTMLInputElement>(null);
  // Conta compartilhada da loja: quem pede informa o próprio nome
  const geral = temPerfil(usuario, "requisitante_geral");
  const [solicitante, setSolicitante] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [nomesUsados, setNomesUsados] = useState<{ nome: string; empresa: string | null }[]>([]);
  const [enviada, setEnviada] = useState<{ id: number; protocolo: string; nome: string } | null>(null);

  useEffect(() => {
    if (!geral) return;
    const t = setTimeout(
      () =>
        api<{ nome: string; empresa: string | null }[]>(`/api/solicitacoes/solicitantes?busca=${encodeURIComponent(solicitante)}`)
          .then(setNomesUsados)
          .catch(() => {}),
      200,
    );
    return () => clearTimeout(t);
  }, [geral, solicitante]);

  const escolherNome = (nome: string) => {
    setSolicitante(nome);
    const conhecido = nomesUsados.find((n) => n.nome.toLowerCase() === nome.trim().toLowerCase());
    if (conhecido?.empresa && !empresa) setEmpresa(conhecido.empresa);
  };

  // Edição de rascunho
  useEffect(() => {
    if (!id) return;
    api<{
      filial_id: number;
      prioridade: number;
      finalidade: string | null;
      justificativa: string | null;
      solicitante_nome: string | null;
      solicitante_empresa: string | null;
      itens: {
        produto_id: number;
        sku: string;
        descricao: string;
        unidade: string;
        custo_referencia: number;
        fornecedor_nome: string | null;
        quantidade_solicitada: number;
        quantidade_pecas: number | null;
        area_peca_m2: number | null;
        pecas_caixa: number | null;
      }[];
    }>(`/api/solicitacoes/${id}`).then((s) => {
      setFilialId(String(s.filial_id));
      setPrioridade(String(s.prioridade));
      setFinalidade(s.finalidade ?? "");
      setJustificativa(s.justificativa ?? "");
      setSolicitante(s.solicitante_nome ?? "");
      setEmpresa(s.solicitante_empresa ?? "");
      setLinhas(
        s.itens.map((i) => ({
          produto: {
            id: i.produto_id,
            sku: i.sku,
            descricao: i.descricao,
            unidade: i.unidade,
            custo_referencia: i.custo_referencia,
            fornecedor_nome: i.fornecedor_nome,
            area_peca_m2: i.area_peca_m2,
            pecas_caixa: i.pecas_caixa,
          },
          quantidade: String(Number(i.quantidade_pecas ?? i.quantidade_solicitada)),
        })),
      );
    });
  }, [id]);

  // Uma filial só: já vem escolhida
  useEffect(() => {
    if (!filialId && filiais.length === 1) setFilialId(String(filiais[0].id));
  }, [filiais.length, filialId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (busca.trim().length < 2) {
      setSugestoes(null);
      return;
    }
    const t = setTimeout(() => {
      const q = new URLSearchParams({ busca, ativos: "true", limite: "15" });
      api<Pagina<Produto>>(`/api/cadastros/produtos?${q}`).then((r) => setSugestoes(r.itens));
    }, 200);
    return () => clearTimeout(t);
  }, [busca]);

  const adicionar = (p: Produto) => {
    if (linhas.some((l) => l.produto.id === p.id)) {
      setLinhas(linhas.map((l) => (l.produto.id === p.id ? { ...l, quantidade: String(num(l.quantidade) + 1) } : l)));
    } else {
      setLinhas([...linhas, { produto: p, quantidade: "1" }]);
    }
    setBusca("");
    setSugestoes(null);
    // Vai direto para a quantidade do produto incluído
    setTimeout(() => {
      const campos = document.querySelectorAll<HTMLInputElement>(".item-req .passo-qtd input");
      const alvo = campos[linhas.some((l) => l.produto.id === p.id) ? linhas.findIndex((l) => l.produto.id === p.id) : campos.length - 1];
      alvo?.focus();
      alvo?.select();
    }, 0);
  };

  /** Enter na quantidade: volta para a busca para incluir o próximo produto. */
  const proximoProduto = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    campoBusca.current?.focus();
  };

  const mudarQtd = (n: number, valor: string) => setLinhas(linhas.map((l, i) => (i === n ? { ...l, quantidade: valor } : l)));
  const total = linhas.reduce((t, l) => t + m2DaLinha(l) * Number(l.produto.custo_referencia), 0);
  const totalM2 = linhas.reduce((t, l) => t + m2DaLinha(l), 0);
  const totalPecas = linhas.reduce((t, l) => t + (porPeca(l.produto) ? num(l.quantidade) : 0), 0);

  const salvar = async (enviarParaAprovacao: boolean, e?: FormEvent) => {
    e?.preventDefault();
    setErro("");
    if (geral && solicitante.trim().length < 2) return setErro("Informe o seu nome em “Quem está pedindo”.");
    if (!filialId) return setErro("Escolha a filial.");
    if (linhas.length === 0) return setErro("Adicione pelo menos um produto.");
    if (linhas.some((l) => num(l.quantidade) <= 0)) return setErro("Todas as quantidades devem ser maiores que zero.");
    setSalvando(true);
    const corpo = {
      filial_id: Number(filialId),
      prioridade: Number(prioridade),
      finalidade: finalidade || null,
      justificativa: justificativa || null,
      enviar: enviarParaAprovacao,
      solicitante_nome: geral ? solicitante : null,
      solicitante_empresa: geral ? empresa || null : null,
      itens: linhas.map((l) =>
        porPeca(l.produto) ? { produto_id: l.produto.id, pecas: num(l.quantidade) } : { produto_id: l.produto.id, quantidade: num(l.quantidade) },
      ),
    };
    try {
      const s = id
        ? await enviar<{ id: number; protocolo: string }>(`/api/solicitacoes/${id}`, "PUT", corpo)
        : await enviar<{ id: number; protocolo: string }>("/api/solicitacoes", "POST", corpo);
      const recomeca = geral && !id && enviarParaAprovacao;
      if (!recomeca)
        toast({
          tipo: "ok",
          texto: enviarParaAprovacao ? `Requisição ${s.protocolo} enviada para aprovação.` : `Rascunho ${s.protocolo} salvo.`,
        });
      if (recomeca) {
        // Computador da loja: limpa tudo para o próximo promotor
        setEnviada({ id: s.id, protocolo: s.protocolo, nome: solicitante.trim() });
        setSolicitante("");
        setEmpresa("");
        setFinalidade("");
        setJustificativa("");
        setPrioridade("2");
        setLinhas([]);
        setSalvando(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      navegar(`/requisicoes/${s.id}`);
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  };

  return (
    <>
      <Cabecalho
        titulo={id ? "Editar rascunho" : "Nova requisição"}
        subtitulo={
          geral
            ? "Computador da loja: cada promotor informa o próprio nome."
            : "Escolha os produtos e as quantidades para o mostruário."
        }
        voltar={{ para: id ? `/requisicoes/${id}` : "/requisicoes", rotulo: id ? "Requisição" : "Requisições" }}
      />
      {enviada && (
        <div className="sucesso" style={{ marginBottom: 16, alignItems: "center" }}>
          <CheckCircle2 size={20} />
          <span style={{ flex: 1 }}>
            Requisição <b>{enviada.protocolo}</b> de <b>{enviada.nome}</b> enviada para aprovação. Pronto para o próximo pedido.
          </span>
          <Link to={`/requisicoes/${enviada.id}`}>Ver requisição</Link>
        </div>
      )}
      {/* Enter não envia a requisição: o envio é só pelos botões */}
      <form onSubmit={(e) => e.preventDefault()}>
        {geral && (
          <section className="cartao formulario">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserRound size={18} /> Quem está pedindo
            </h2>
            <div className="linha">
              <label>
                Seu nome *
                <input
                  list="nomes-usados"
                  value={solicitante}
                  onChange={(e) => escolherNome(e.target.value)}
                  placeholder="Nome e sobrenome"
                  autoComplete="off"
                  required
                />
                <datalist id="nomes-usados">
                  {nomesUsados.map((n) => (
                    <option key={n.nome} value={n.nome}>
                      {n.empresa ?? ""}
                    </option>
                  ))}
                </datalist>
              </label>
              <label>
                Empresa / marca (opcional)
                <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Portobello" />
              </label>
            </div>
          </section>
        )}
        <section className="cartao formulario">
          <h2>Dados da requisição</h2>
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
            Justificativa (opcional)
            <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </label>
        </section>

        <section className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <h2>Produtos</h2>
              <p>Busque pelo SKU ou parte da descrição e toque para adicionar.</p>
            </div>
          </div>
          <div className="autocompletar">
            <div className="campo-icone">
              <Search size={16} />
              <input
                ref={campoBusca}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex.: porcelanato 60x60, POR-6060…"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (sugestoes?.length) adicionar(sugestoes[0]);
                }}
              />
            </div>
            {sugestoes && (
              <ul>
                {sugestoes.length === 0 && (
                  <li className="sutil" style={{ padding: 10 }}>
                    Nenhum produto ativo encontrado.
                  </li>
                )}
                {sugestoes.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => adicionar(p)}>
                      <b>
                        {p.sku} · {p.descricao}
                      </b>
                      <small>
                        {p.fornecedor_nome ?? "sem fornecedor"} · {moeda(p.custo_referencia)}/{p.unidade}
                        {porPeca(p) && p.pecas_caixa ? ` · caixa com ${p.pecas_caixa} peças` : ""}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {linhas.length === 0 ? (
            <Vazio icone={PackagePlus} titulo="Nenhum produto adicionado" texto="Use a busca acima para incluir os itens." />
          ) : (
            <div className="itens-requisicao">
              {linhas.map((l, n) => (
                <div key={l.produto.id} className="item-req">
                  <div className="desc">
                    <strong>{l.produto.descricao}</strong>
                    <small>
                      {l.produto.sku} · {l.produto.fornecedor_nome ?? "sem fornecedor"} · {moeda(l.produto.custo_referencia)}/
                      {l.produto.unidade}
                    </small>
                  </div>
                  <div className="passo-qtd" aria-label={`Quantidade de ${l.produto.sku}`}>
                    <button type="button" onClick={() => mudarQtd(n, String(Math.max(1, num(l.quantidade) - 1)))} aria-label="Diminuir">
                      <Minus size={16} />
                    </button>
                    <input
                      inputMode={porPeca(l.produto) ? "numeric" : "decimal"}
                      value={l.quantidade}
                      onChange={(e) => mudarQtd(n, e.target.value)}
                      onKeyDown={proximoProduto}
                    />
                    <button type="button" onClick={() => mudarQtd(n, String(num(l.quantidade) + 1))} aria-label="Aumentar">
                      <Plus size={16} />
                    </button>
                  </div>
                  {porPeca(l.produto) ? (
                    <span className="conversao">
                      <b>peças</b>
                      <small>
                        = {qtd(m2DaLinha(l))} m²
                        {l.produto.pecas_caixa ? ` · caixa: ${l.produto.pecas_caixa} pç` : ""}
                      </small>
                    </span>
                  ) : (
                    <span className="sutil" style={{ fontSize: 12.5, minWidth: 24 }}>
                      {l.produto.unidade}
                    </span>
                  )}
                  <span className="subtotal">{moeda(m2DaLinha(l) * Number(l.produto.custo_referencia))}</span>
                  <button
                    type="button"
                    className="icone"
                    onClick={() => setLinhas(linhas.filter((_, i) => i !== n))}
                    aria-label={`Remover ${l.produto.sku}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {erro && (
          <div className="erro" style={{ marginTop: 16 }}>
            {erro}
          </div>
        )}

        <div className="resumo-fixo">
          <div className="total">
            <span>
              {linhas.length} {linhas.length === 1 ? "produto" : "produtos"}
              {totalPecas > 0 && ` · ${qtd(totalPecas)} peças`} · {qtd(totalM2)} m²
            </span>
            <strong>{moeda(total)}</strong>
          </div>
          <div className="botoes">
            <button type="button" disabled={salvando} onClick={() => salvar(false)}>
              <Save size={16} /> Salvar rascunho
            </button>
            <button type="button" className="primario" disabled={salvando} onClick={() => salvar(true)}>
              <Send size={16} /> Enviar para aprovação
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
