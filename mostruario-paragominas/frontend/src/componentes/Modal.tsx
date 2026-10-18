import { ReactNode, useEffect } from "react";

export function Modal({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-label={titulo}>
        <header>
          <h2>{titulo}</h2>
          <button className="link" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
