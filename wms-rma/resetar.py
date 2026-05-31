"""
resetar.py — Apaga todos os dados e recria o banco apenas com o login admin.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'wms_rma.db')


def confirmar():
    print()
    print("=" * 60)
    print("  ATENCAO: esta acao apaga TODOS os dados do sistema.")
    print("  Fornecedores, produtos, RMAs, usuarios -- tudo sera")
    print("  removido. So o login do Administrador sera mantido.")
    print("=" * 60)
    resp = input("\n  Digite CONFIRMAR para continuar: ").strip()
    return resp == "CONFIRMAR"


def resetar():
    # 1. Apaga o banco
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("  [OK] Banco de dados removido.")
    else:
        print("  [INFO] Banco nao existia, sera criado do zero.")

    # 2. Carrega o app (create_app recria as tabelas e roda seed_banco)
    try:
        from app import create_app
        from app.extensions import db
        from app.models import (
            Usuario, Roles,
            RMA, HistoricoRMA, Documento, PrazoSLA, PoliticaSLA,
            Produto, Fornecedor, LoteDevolucao,
            Inventario, ItemInventario, EmailAlerta,
        )
    except Exception as e:
        print(f"\n  [ERRO] Falha ao importar o app: {e}")
        print("  Verifique se as dependencias estao instaladas.")
        return False

    app = create_app()  # cria tabelas + roda seed (dados de exemplo)

    with app.app_context():
        # 3. Apaga dados de negócio na ordem correta (respeita FKs)
        ItemInventario.query.delete()
        Inventario.query.delete()
        HistoricoRMA.query.delete()
        Documento.query.delete()
        PrazoSLA.query.delete()
        RMA.query.delete()
        PoliticaSLA.query.delete()
        LoteDevolucao.query.delete()
        Produto.query.delete()
        Fornecedor.query.delete()
        EmailAlerta.query.delete()
        # Remove todos os usuários exceto o admin
        Usuario.query.filter(Usuario.email != 'admin@wms.com').delete()
        # Preserva a estrutura do armazém, apenas libera todos os endereços
        from app.models import Apartamento
        Apartamento.query.update({'ocupado': False})
        db.session.commit()
        print("  [OK] Dados removidos. Estrutura do armazem preservada.")
        n_apts = Apartamento.query.count()
        if n_apts:
            print(f"  [OK] {n_apts} enderecos liberados (ocupado = False).")

        # 4. Garante que o admin existe e com a senha certa
        admin = Usuario.query.filter_by(email='admin@wms.com').first()
        if not admin:
            admin = Usuario(
                nome='Administrador',
                email='admin@wms.com',
                role=Roles.ADMIN,
                departamento='TI',
                matricula='ADM-001',
                ativo=True,
            )
            db.session.add(admin)

        admin.set_senha('admin123')
        db.session.commit()

        print(f"\n  [OK] Administrador:")
        print(f"       E-mail : admin@wms.com")
        print(f"       Senha  : admin123")

    return True


if __name__ == '__main__':
    if not confirmar():
        print("\n  Operacao cancelada.")
    else:
        print("\n  Iniciando reset...")
        ok = resetar()
        print()
        if ok:
            print("=" * 60)
            print("  Reset concluido! Sistema limpo.")
            print("  Inicie com: python run.py")
            print("=" * 60)
        else:
            print("  Reset falhou. Verifique os erros acima.")

    input("\nPressione Enter para sair...")
