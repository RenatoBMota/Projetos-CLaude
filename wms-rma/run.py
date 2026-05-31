import os
import sys

# Garante que o diretório do projeto está no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    try:
        from app import create_app
    except Exception as e:
        print("\n[ERRO] Falha ao importar a aplicação:")
        print(f"  {e}")
        print("\nVerifique se todas as dependências estão instaladas:")
        print("  python -m pip install -r requirements.txt")
        input("\nPressione Enter para sair...")
        sys.exit(1)

    try:
        app = create_app()
    except Exception as e:
        print("\n[ERRO] Falha ao inicializar a aplicação:")
        print(f"  {e}")
        import traceback
        traceback.print_exc()
        input("\nPressione Enter para sair...")
        sys.exit(1)

    port = int(os.environ.get('PORT', 5000))

    print("\n" + "="*60)
    print("  WMS RMA Enterprise - Sistema de Gestão de Logística Reversa")
    print("="*60)
    print(f"  Acesse: http://localhost:{port}")
    print(f"  Login:  admin@wms.com / admin123")
    print("  Pressione Ctrl+C para encerrar")
    print("="*60 + "\n")

    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except OSError as e:
        if 'Address already in use' in str(e) or 'WinError 10048' in str(e):
            print(f"\n[ERRO] A porta {port} já está em uso.")
            print("  Encerre o outro processo ou defina outra porta:")
            print(f"  set PORT=5001 && python run.py   (Windows)")
            print(f"  PORT=5001 python run.py          (Linux/Mac)")
        else:
            print(f"\n[ERRO] Falha ao iniciar servidor: {e}")
        input("\nPressione Enter para sair...")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nServidor encerrado.")

if __name__ == '__main__':
    main()
