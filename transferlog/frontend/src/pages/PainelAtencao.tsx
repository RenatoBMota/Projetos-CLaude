import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { nomeUnidade, type Transferencia } from "../api/types";
import { formatarDataHora } from "../utils/formatar";

interface DadosAtencao {
  atrasadas: Transferencia[];
  emRisco: Transferencia[];
  paradas: Transferencia[];
}

function TabelaAtencao({ titulo, subtitulo, itens }: { titulo: string; subtitulo: string; itens: Transferencia[] }) {
  return (
    <div className="card">
      <h2>{titulo} ({itens.length})</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>{subtitulo}</p>
      {itens.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhuma transferência aqui — tudo em dia.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>NF</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Status</th>
              <th>Prazo previsto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((t) => (
              <tr key={t.id}>
                <td>{t.numeroPedido}</td>
                <td>{t.numeroNF}</td>
                <td>{nomeUnidade(t.origem)}</td>
                <td>{nomeUnidade(t.destino)}</td>
                <td><StatusBadge status={t.status} itens={t.itens} /></td>
                <td>{formatarDataHora(t.prazoPrevisto)}</td>
                <td><Link to={`/transferencias/${t.id}`}>Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function PainelAtencao() {
  const [dados, setDados] = useState<DadosAtencao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<DadosAtencao>("/transferencias/atencao").then(setDados).catch((err) => setErro(err.message));
  }, []);

  if (erro) return <div className="error-box">{erro}</div>;
  if (!dados) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Painel de Atenção</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Transferências em aberto que precisam de atenção agora — sem precisar montar filtro no dashboard.
      </p>
      <TabelaAtencao
        titulo="Atrasadas"
        subtitulo="O prazo previsto já passou."
        itens={dados.atrasadas}
      />
      <TabelaAtencao
        titulo="Quase atrasando"
        subtitulo="Prazo previsto vence nas próximas 6 horas."
        itens={dados.emRisco}
      />
      <TabelaAtencao
        titulo="Paradas há muito tempo"
        subtitulo="Mais de 24h na mesma etapa, sem estar necessariamente atrasada ainda."
        itens={dados.paradas}
      />
    </div>
  );
}
