import { NavLink, Outlet } from "react-router-dom";
import { temPerfil, useSessao } from "../sessao";

export function Layout() {
  const { usuario, sair } = useSessao();
  return (
    <div className="app">
      <aside className="menu">
        <div className="marca">
          Mostruário
          <small>Paragominas</small>
        </div>
        <nav>
          <NavLink to="/" end>
            Início
          </NavLink>
          <NavLink to="/requisicoes">Requisições</NavLink>
          <NavLink to="/amostras">Em exposição</NavLink>
          {temPerfil(usuario, "admin") && <NavLink to="/configuracao">Configuração</NavLink>}
        </nav>
        <div className="usuario">
          <strong>{usuario?.nome}</strong>
          <span>{usuario?.email}</span>
          <div className="acoes-usuario">
            <NavLink to="/minha-senha">Trocar senha</NavLink>
            <button className="link" onClick={sair}>
              Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
