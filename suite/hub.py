from flask import Flask
import os

app = Flask(__name__)

HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suite de Apps</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 2rem;
  }
  header { text-align: center; }
  header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.5px;
  }
  header p { color: #94a3b8; margin-top: 0.4rem; font-size: 0.95rem; }
  .cards {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 1.25rem;
    padding: 2rem 2.5rem;
    width: 280px;
    text-align: center;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    border-color: var(--accent);
  }
  .card .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
  .card h2 { font-size: 1.25rem; color: #f1f5f9; margin-bottom: 0.5rem; }
  .card p { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }
  .card .badge {
    display: inline-block;
    margin-top: 1.25rem;
    padding: 0.3rem 0.9rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
  }
  .wms { --accent: #3b82f6; }
  .scv { --accent: #10b981; }
  footer { color: #475569; font-size: 0.78rem; }
</style>
</head>
<body>
<header>
  <h1>Suite de Aplicações</h1>
  <p>Selecione o sistema que deseja acessar</p>
</header>
<div class="cards">
  <a class="card wms" href="http://localhost:5001" target="_blank">
    <span class="icon">📦</span>
    <h2>WMS RMA Enterprise</h2>
    <p>Gestão de Logística Reversa, Armazém, RMA, Triagem e Relatórios.</p>
    <span class="badge">Porta 5001</span>
  </a>
  <a class="card scv" href="http://localhost:5002" target="_blank">
    <span class="icon">📊</span>
    <h2>SCV</h2>
    <p>Sistema de Controle de Vendas, Estoque e Gestão de Filiais.</p>
    <span class="badge">Porta 5002</span>
  </a>
</div>
<footer>Hub rodando na porta 5000</footer>
</body>
</html>"""

@app.route("/")
def index():
    return HTML

if __name__ == "__main__":
    port = int(os.environ.get("HUB_PORT", 5000))
    print("\n" + "="*50)
    print("  Suite Hub")
    print(f"  Acesse: http://localhost:{port}")
    print("="*50 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
