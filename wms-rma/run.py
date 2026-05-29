import os
import sys
import threading
import webbrowser

# Garante que o diretório do projeto está no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

def abrir_browser(port):
    import time
    time.sleep(1.5)
    webbrowser.open(f'http://localhost:{port}')

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))

    print("\n" + "="*60)
    print("  WMS RMA Enterprise - Sistema de Gestão de Logística Reversa")
    print("="*60)
    print(f"  Acesse: http://localhost:{port}")
    print(f"  Login:  admin@wms.com / admin123")
    print("  Pressione Ctrl+C para encerrar")
    print("="*60 + "\n")

    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        t = threading.Thread(target=abrir_browser, args=(port,))
        t.daemon = True
        t.start()

    app.run(host='0.0.0.0', port=port, debug=False)
