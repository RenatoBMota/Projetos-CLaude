import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { moeda, qtd } from "../formato";
import { temPerfil, useSessao } from "../sessao";
import { FILAS } from "./Requisicoes";

interface Resumo {
  filas: Record<string, number>;
  em_exposicao: { quantidade: number; valor: number };
}

export function Inicio() {
  const { usuario } = useSessao();
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    api<Resumo>("/api/solicitacoes/resumo").then(setResumo);
  }, []);

  return (
    <>
      <div className="titulo">
        <h1>Olá, {usuario?.nome.split(" ")[0]}</h1>
        {temPerfil(usuario, "requisitante") && (
          <Link className="botao primario" to="/requisicoes/nova">
            Nova requisição
          </Link>
        )}
      </div>

      <div className="indicadores">
        {resumo &&
          Object.entries(resumo.filas).map(([fila, n]) => (
            <Link key={fila} to={`/requisicoes?fila=${fila}`} className={`cartao indicador ${n > 0 ? "destaque" : ""}`}>
              <span>{FILAS[fila]?.rotulo}</span>
              <b>{n}</b>
              <small>{n === 1 ? "requisição" : "requisições"}</small>
            </Link>
          ))}
        {resumo && (
          <Link to="/amostras" className="cartao indicador">
            <span>Em exposição nas lojas</span>
            <b>{moeda(resumo.em_exposicao.valor)}</b>
            <small>{qtd(resumo.em_exposicao.quantidade)} unidades</small>
          </Link>
        )}
      </div>

      {temPerfil(usuario, "admin") && (
        <div className="cartao">
          <p>
            Para começar, em <Link to="/configuracao">Configuração</Link>: cadastre filiais, fornecedores e produtos (ou importe a
            planilha do ERP) e crie os usuários com seus perfis.
          </p>
        </div>
      )}
    </>
  );
}
