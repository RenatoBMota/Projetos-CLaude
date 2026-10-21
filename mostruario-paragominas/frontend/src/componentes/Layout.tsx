import {
  BarChart3,
  ClipboardList,
  Bell,
  Download,
  Home,
  KeyRound,
  LogOut,
  Menu as IconeMenu,
  Monitor,
  Moon,
  Plus,
  Settings,
  Store,
  Sun,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { api } from "../api";
import { PERFIS_RELATORIOS, PERFIS_REQUISITANTE, temPerfil, useSessao } from "../sessao";
import { marcarIcone, notificar, useVersao } from "./atualizacao";
import { Modal } from "./Modal";
import { iniciais, useInstalar, useOnline, useTema, useToast } from "./ui";

interface Resumo {
  filas: Record<string, number>;
}

/**
 * Total de tarefas pendentes do usuário (aprovar, expedir). Recarrega sempre que
 * os dados mudam e avisa quando chega coisa nova.
 */
function usePendencias() {
  const [n, setN] = useState(0);
  const anterior = useRef<number | null>(null);
  const versao = useVersao();
  const toast = useToast();
  const navegar = useNavigate();
  useEffect(() => {
    api<Resumo>("/api/solicitacoes/resumo")
      .then((r) => {
        const total = (r.filas.comercial ?? 0) + (r.filas.logistica ?? 0) + (r.filas.expedicao ?? 0);
        const novas = anterior.current === null ? 0 : total - anterior.current;
        anterior.current = total;
        setN(total);
        if (novas > 0) {
          const texto = novas === 1 ? "Chegou 1 nova requisição para você." : `Chegaram ${novas} novas requisições para você.`;
          toast({ tipo: "info", texto, acao: { rotulo: "Ver", executar: () => navegar("/") } });
          if (document.visibilityState !== "visible") notificar("Mostruário — nova pendência", `${texto} Total esperando: ${total}.`);
        }
      })
      .catch(() => {});
  }, [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.title = n > 0 ? `(${n}) Mostruário Paragominas` : "Mostruário Paragominas";
    marcarIcone(n);
  }, [n]);
  return n;
}

/** Botão para permitir avisos do sistema (aparece só enquanto o usuário não decidiu). */
function useAvisos() {
  const suportado = "Notification" in window;
  const [permissao, setPermissao] = useState(suportado ? Notification.permission : "denied");
  const pedir = () => Notification.requestPermission().then(setPermissao);
  return { pendente: suportado && permissao === "default", pedir };
}

export function Layout() {
  const { usuario, sair } = useSessao();
  const [tema, alternarTema] = useTema();
  const instalar = useInstalar();
  const online = useOnline();
  const toast = useToast();
  const pendencias = usePendencias();
  const avisos = useAvisos();
  const [mais, setMais] = useState(false);
  const [dicaIos, setDicaIos] = useState(false);
  const local = useLocation();

  const {
    needRefresh: [novaVersao],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (novaVersao)
      toast({ tipo: "info", texto: "Nova versão disponível.", fixo: true, acao: { rotulo: "Atualizar", executar: () => updateServiceWorker(true) } });
  }, [novaVersao]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setMais(false), [local.pathname]);

  const relatorios = temPerfil(usuario, ...PERFIS_RELATORIOS);
  const admin = temPerfil(usuario, "admin");
  const requisitante = temPerfil(usuario, ...PERFIS_REQUISITANTE);
  const IconeTema = tema === "escuro" ? Moon : tema === "claro" ? Sun : Monitor;
  const rotuloTema = tema === "escuro" ? "Tema escuro" : tema === "claro" ? "Tema claro" : "Tema automático";

  const acaoInstalar = () => (instalar.ios ? setDicaIos(true) : instalar.instalar());

  return (
    <div className="app">
      <aside className="menu sem-impressao">
        <div className="marca">
          <img src="/icone.svg" alt="" />
          <div>
            <strong>Mostruário</strong>
            <small>Paragominas</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            <Home size={18} /> Início
          </NavLink>
          <NavLink to="/requisicoes">
            <ClipboardList size={18} /> Requisições
            {pendencias > 0 && <span className="contador">{pendencias}</span>}
          </NavLink>
          <NavLink to="/amostras">
            <Store size={18} /> Em exposição
          </NavLink>
          {(relatorios || admin) && <span className="grupo">Gestão</span>}
          {relatorios && (
            <NavLink to="/relatorios">
              <BarChart3 size={18} /> Relatórios
            </NavLink>
          )}
          {admin && (
            <NavLink to="/configuracao">
              <Settings size={18} /> Configuração
            </NavLink>
          )}
        </nav>
        <div className="menu-rodape">
          {avisos.pendente && (
            <button className="link" onClick={avisos.pedir} style={{ justifyContent: "flex-start" }}>
              <Bell size={16} /> Ativar avisos de pendências
            </button>
          )}
          {instalar.disponivel && (
            <button className="link" onClick={acaoInstalar} style={{ justifyContent: "flex-start" }}>
              <Download size={16} /> Instalar aplicativo
            </button>
          )}
          <div className="perfil-usuario">
            <span className="avatar">{iniciais(usuario?.nome)}</span>
            <div>
              <strong>{usuario?.nome}</strong>
              <span>{usuario?.email}</span>
            </div>
          </div>
          <div className="acoes-rodape">
            <button className="icone" onClick={alternarTema} title={rotuloTema} aria-label={rotuloTema}>
              <IconeTema size={18} />
            </button>
            <NavLink to="/minha-senha" className="botao icone" title="Trocar senha" aria-label="Trocar senha">
              <KeyRound size={18} />
            </NavLink>
            <span className="espaco" />
            <button className="icone" onClick={sair} title="Sair" aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="principal">
        <header className="topo-celular">
          <img src="/icone.svg" alt="" />
          <strong>Mostruário</strong>
          <span className="avatar">{iniciais(usuario?.nome)}</span>
        </header>
        {!online && (
          <div className="faixa-offline">
            <WifiOff size={16} /> Sem conexão — os dados podem estar desatualizados.
          </div>
        )}
        <main className="conteudo">
          <Outlet />
        </main>
      </div>

      <nav className="navbar-inferior sem-impressao">
        <NavLink to="/" end>
          <Home size={22} /> Início
        </NavLink>
        <NavLink to="/requisicoes" end>
          <ClipboardList size={22} /> Requisições
          {pendencias > 0 && <span className="contador">{pendencias}</span>}
        </NavLink>
        {requisitante && (
          <NavLink to="/requisicoes/nova" className="novo" aria-label="Nova requisição">
            <span className="bola-nova">
              <Plus size={24} />
            </span>
            Nova
          </NavLink>
        )}
        <NavLink to="/amostras">
          <Store size={22} /> Exposição
        </NavLink>
        <button onClick={() => setMais(true)}>
          <IconeMenu size={22} /> Mais
        </button>
      </nav>

      {mais && (
        <Modal titulo={usuario?.nome ?? "Menu"} aoFechar={() => setMais(false)}>
          <div className="folha-mais">
            {relatorios && (
              <NavLink to="/relatorios">
                <BarChart3 size={20} /> Relatórios
              </NavLink>
            )}
            {admin && (
              <NavLink to="/configuracao">
                <Settings size={20} /> Configuração
              </NavLink>
            )}
            <hr />
            {avisos.pendente && (
              <button onClick={avisos.pedir}>
                <Bell size={20} /> Ativar avisos de pendências
              </button>
            )}
            {instalar.disponivel && (
              <button onClick={acaoInstalar}>
                <Download size={20} /> Instalar aplicativo
              </button>
            )}
            <button onClick={alternarTema}>
              <IconeTema size={20} /> {rotuloTema}
            </button>
            <NavLink to="/minha-senha">
              <KeyRound size={20} /> Trocar senha
            </NavLink>
            <button onClick={sair}>
              <LogOut size={20} /> Sair
            </button>
          </div>
        </Modal>
      )}

      {dicaIos && (
        <Modal titulo="Instalar no iPhone / iPad" aoFechar={() => setDicaIos(false)}>
          <div className="formulario">
            <p>
              No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta para cima) e depois em{" "}
              <b>Adicionar à Tela de Início</b>.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
