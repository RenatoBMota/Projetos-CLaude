import { Link } from "react-router-dom";
import { temPerfil, useSessao } from "../sessao";

export function Inicio() {
  const { usuario } = useSessao();
  return (
    <>
      <h1>Olá, {usuario?.nome.split(" ")[0]}</h1>
      <div className="cartao">
        <p>O módulo de requisições, aprovações, expedição e devolução é a próxima etapa do projeto.</p>
        {temPerfil(usuario, "admin") && (
          <p>
            Comece pela <Link to="/configuracao">Configuração</Link>: cadastre filiais, fornecedores e produtos (ou importe a
            planilha do ERP) e crie os usuários com seus perfis.
          </p>
        )}
      </div>
    </>
  );
}
