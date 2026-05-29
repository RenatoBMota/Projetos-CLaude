import os
from flask import Flask, render_template
from app.extensions import db, login_manager


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # ── Configuração base ─────────────────────────────────────────────────────
    instance_path = app.instance_path
    os.makedirs(instance_path, exist_ok=True)
    os.makedirs(os.path.join(app.root_path, 'static', 'uploads'), exist_ok=True)

    app.config.update(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'wms-rma-enterprise-secret-2024'),
        SQLALCHEMY_DATABASE_URI=f'sqlite:///{os.path.join(instance_path, "wms_rma.db")}',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB
        UPLOAD_FOLDER=os.path.join(app.root_path, 'static', 'uploads'),
        WTF_CSRF_ENABLED=True,
    )

    # ── Extensões ─────────────────────────────────────────────────────────────
    db.init_app(app)
    login_manager.init_app(app)

    from app.models import Usuario

    @login_manager.user_loader
    def load_user(uid):
        return Usuario.query.get(int(uid))

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes.auth         import bp as auth_bp
    from app.routes.dashboard    import bp as dashboard_bp
    from app.routes.rma          import bp as rma_bp
    from app.routes.triagem      import bp as triagem_bp
    from app.routes.armazem      import bp as armazem_bp
    from app.routes.produtos      import bp as produtos_bp
    from app.routes.sla          import bp as sla_bp
    from app.routes.relatorios   import bp as relatorios_bp
    from app.routes.usuarios     import bp as usuarios_bp
    from app.routes.configuracoes import bp as config_bp
    from app.routes.lote          import bp as lote_bp
    from app.routes.auditoria     import bp as auditoria_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(rma_bp)
    app.register_blueprint(triagem_bp)
    app.register_blueprint(armazem_bp)
    app.register_blueprint(produtos_bp)
    app.register_blueprint(sla_bp)
    app.register_blueprint(relatorios_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(lote_bp)
    app.register_blueprint(auditoria_bp)

    # ── Controle de acesso por perfil ─────────────────────────────────────────
    from app.utils import BLUEPRINT_ROLES
    from flask_login import current_user as cu

    @app.before_request
    def check_blueprint_access():
        from flask import request as req, abort
        from flask_login import current_user as u
        bp_name = req.blueprints.get(list(req.blueprints.keys())[-1]).name \
                  if req.blueprints else ''
        if bp_name == 'auth' or not bp_name:
            return
        if not u.is_authenticated:
            return  # login_required handles redirect
        allowed = BLUEPRINT_ROLES.get(bp_name)
        if allowed is not None and u.role not in allowed:
            abort(403)

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    # ── Context processors ────────────────────────────────────────────────────
    from app.models import Configuracao, RMA, PrazoSLA, EstadoRMA
    from datetime import datetime

    @app.context_processor
    def inject_globals():
        cfg = {}
        try:
            cfg = Configuracao.get_all_dict()
        except Exception:
            pass
        return dict(
            app_cfg=cfg,
            app_nome=cfg.get('app_nome', 'WMS RMA'),
            app_logo=cfg.get('app_logo', ''),
            cor_primaria=cfg.get('app_cor_primaria', '#2563eb'),
            cor_sidebar=cfg.get('app_cor_sidebar', '#1e293b'),
            now=datetime.utcnow(),
        )

    @app.template_filter('moeda')
    def moeda_filter(v):
        from app.utils import formatar_moeda
        return formatar_moeda(v)

    @app.template_filter('data')
    def data_filter(v):
        from app.utils import formatar_data
        return formatar_data(v)

    @app.template_filter('datahora')
    def datahora_filter(v):
        from app.utils import formatar_datetime
        return formatar_datetime(v)

    # ── Banco e seed ──────────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        from app.seed import seed_banco
        seed_banco()

    return app
