"""
RBM Logistics — Integração YMS ↔ Agendamento
=============================================
Este módulo contém as funções e rotas a adicionar ao app.py do YMS.

INSTALAÇÃO:
1. Copie as funções abaixo para o app.py do YMS
2. Adicione os novos defaults em _seed_settings()
3. Modifique api_checkin() e api_finish() conforme indicado

CONFIGURAÇÃO (via /configuracoes → categoria "integracao"):
  - integracao_api_key      : Chave que o Spring Boot envia no header X-YMS-API-Key
  - integracao_webhook_url  : URL do webhook Spring Boot, ex: http://localhost:8080/api/v1/integracao/yms/webhook
  - integracao_webhook_secret: Segredo enviado no header X-YMS-Webhook-Secret
  - integracao_enabled      : 1 = integração ativa
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

# ─── ADICIONAR EM _seed_settings() ────────────────────────────────────────────
# Cole estas linhas dentro da lista `defaults` no final de _seed_settings():

INTEGRATION_SETTINGS = [
    # Integração RBM Agendamento
    ('integracao_enabled',        '0',  'Integração RBM',       '1 = sincronizar com sistema de agendamento RBM', '', 'integracao'),
    ('integracao_api_key',        '',   'API Key YMS',          'Chave enviada pelo Spring Boot no header X-YMS-API-Key', '', 'integracao'),
    ('integracao_webhook_url',    '',   'Webhook URL (RBM)',     'URL do webhook Spring Boot, ex: http://localhost:8080/api/v1/integracao/yms/webhook', '', 'integracao'),
    ('integracao_webhook_secret', '',   'Webhook Secret (RBM)', 'Segredo enviado no header X-YMS-Webhook-Secret', '', 'integracao'),
]

# ─── NOVAS FUNÇÕES — adicionar após a função get_meta() ───────────────────────

def require_api_key(f):
    """Decorator: valida X-YMS-API-Key para endpoints de integração."""
    from functools import wraps
    @wraps(f)
    def dec(*a, **kw):
        expected = get_setting('integracao_api_key', '')
        if not expected:
            return jsonify({'error': 'Integração não configurada'}), 503
        received = request.headers.get('X-YMS-API-Key', '')
        if received != expected:
            return jsonify({'error': 'API Key inválida'}), 401
        return f(*a, **kw)
    return dec


def send_rbm_webhook(evento: str, vehicle: dict, schedule=None):
    """
    Envia evento ao webhook Spring Boot.

    Eventos:
      CHECK_IN   — veículo chegou ao pátio (status=waiting)
      FINALIZADO — operação concluída (status=finished)
    """
    if get_setting('integracao_enabled', '0') != '1':
        return

    webhook_url    = get_setting('integracao_webhook_url', '')
    webhook_secret = get_setting('integracao_webhook_secret', '')
    if not webhook_url:
        return

    # Extrai agendamento_id do campo notes (inserido pelo Spring Boot)
    notes    = vehicle.get('notes', '') or ''
    agendamento_id = None
    if 'ID: ' in notes:
        try:
            agendamento_id = notes.split('ID: ')[1].split(' ')[0].strip()
        except Exception:
            pass

    payload = {
        'evento':           evento,
        'placa':            vehicle.get('plate', ''),
        'fornecedor':       vehicle.get('supplier', ''),
        'nf':               vehicle.get('nf', ''),
        'operacao':         vehicle.get('operation_type', ''),
        'agendamento_id':   agendamento_id,
        'timestamp':        datetime.now().isoformat(),
    }
    if schedule:
        payload['schedule_id'] = schedule.get('id')

    try:
        data    = json.dumps(payload).encode('utf-8')
        headers = {
            'Content-Type':         'application/json',
            'X-YMS-Webhook-Secret': webhook_secret,
        }
        req = urllib.request.Request(webhook_url, data=data, headers=headers, method='POST')
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        # Webhook falhou — log mas não interrompe a operação
        print(f"⚠  RBM webhook '{evento}' falhou: {e}")


# ─── NOVAS ROTAS — adicionar após as rotas existentes ─────────────────────────

def register_integration_routes(app):
    """
    Registra as rotas de integração. Chame register_integration_routes(app)
    antes de if __name__ == '__main__'.
    """

    @app.route('/api/v1/integration/status', methods=['GET'])
    @require_api_key
    def api_integration_status():
        """Health check — Spring Boot verifica se o YMS está online."""
        return jsonify({
            'status':  'ok',
            'version': 'YMS RBM Logistics',
            'enabled': get_setting('integracao_enabled', '0') == '1',
        })

    @app.route('/api/v1/integration/units', methods=['GET'])
    @require_api_key
    def api_integration_units():
        """Retorna unidades disponíveis para mapeamento no Spring Boot."""
        rows = query("SELECT id, name, code, type, city FROM units ORDER BY name")
        return jsonify([dict(r) for r in rows])

    @app.route('/api/schedules-external', methods=['POST'])
    @require_api_key
    def api_create_schedule_external():
        """
        Cria agendamento a partir do Spring Boot.
        Aceita o mesmo payload de /api/schedules mas com X-YMS-API-Key.
        """
        d = request.json or {}
        sid = execute(
            "INSERT INTO schedules(scheduled_date,scheduled_time,supplier,nf,operation_type,unit_id,notes) "
            "VALUES(?,?,?,?,?,?,?)",
            (
                d['scheduled_date'],
                d.get('scheduled_time', '08:00'),
                d.get('supplier', ''),
                d.get('nf', ''),
                d.get('operation_type', 'supplier'),
                d['unit_id'],
                d.get('notes', ''),
            )
        )
        log_action('Agendamento externo (RBM)', '-', d.get('unit_id'), None,
                   f"Agendamento criado via API RBM: {d.get('supplier','')}")
        return jsonify({'id': sid})


# ─── MODIFICAÇÕES EM api_checkin() ────────────────────────────────────────────
# Adicione ANTES do return final de api_checkin():
#
#   sched_for_webhook = sched  # já existe no código
#   v_for_webhook = query("SELECT * FROM vehicles WHERE id=?", (vid,), one=True)
#   send_rbm_webhook('CHECK_IN', dict(v_for_webhook), sched_for_webhook)
#
# Exemplo: no final do api_checkin(), antes do return jsonify(...):
#
#   result = serialize_vehicle(query("SELECT * FROM vehicles WHERE id=?",(vid,),one=True))
#   send_rbm_webhook('CHECK_IN', dict(query("SELECT * FROM vehicles WHERE id=?",(vid,),one=True)), sched)
#   return jsonify(result)


# ─── MODIFICAÇÕES EM api_finish() ─────────────────────────────────────────────
# Adicione ANTES do return final de api_finish():
#
#   finished_v = query("SELECT * FROM vehicles WHERE id=?", (vid,), one=True)
#   send_rbm_webhook('FINALIZADO', dict(finished_v))
#   return jsonify(serialize_vehicle(finished_v))


# ─── EXEMPLO DE COMO APLICAR AS MUDANÇAS EM app.py ───────────────────────────
#
# 1. No topo, após os imports existentes:
#    from rbm_integration import send_rbm_webhook, require_api_key
#
# 2. No final de _seed_settings(), adicionar:
#    for key, value, label, description, unit, category in INTEGRATION_SETTINGS:
#        existing = query("SELECT key FROM settings WHERE key=?", (key,), one=True)
#        if not existing:
#            execute("INSERT INTO settings(key,value,label,description,unit,category) VALUES(?,?,?,?,?,?)",
#                    (key, value, label, description, unit, category))
#
# 3. Registrar as rotas antes de if __name__ == '__main__':
#    register_integration_routes(app)
