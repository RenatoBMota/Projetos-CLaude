import sys
import os
import subprocess
import threading
import webbrowser
import time
import traceback

# Log de erros para arquivo (pythonw nao tem console)
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "suite_error.log")
def log(msg):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")

try:
    from PIL import Image, ImageDraw
    import pystray
except Exception as e:
    log(f"ERRO import: {e}\n{traceback.format_exc()}")
    sys.exit(1)

BASE = os.path.dirname(os.path.abspath(__file__))
HUB_PORT = 5000
WMS_PORT = 5001
SCV_PORT = 5002

processes = {}

def python_bin(venv_dir):
    return os.path.join(venv_dir, "Scripts", "python.exe")

def start_app(name, cwd, venv_dir, cmd, extra_env=None):
    try:
        env = os.environ.copy()
        if extra_env:
            env.update(extra_env)
        log_file = open(os.path.join(BASE, f"{name}.log"), "w", encoding="utf-8")
        proc = subprocess.Popen(
            [python_bin(venv_dir)] + cmd,
            cwd=cwd, env=env,
            stdout=log_file, stderr=log_file,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        processes[name] = proc
        log(f"{name} iniciado PID={proc.pid}")
    except Exception as e:
        log(f"ERRO ao iniciar {name}: {e}\n{traceback.format_exc()}")

def start_all():
    try:
        # WMS-RMA
        wms_dir = os.path.join(BASE, "wms-rma")
        wms_venv = os.path.join(wms_dir, ".venv")
        start_app("wms", wms_dir, wms_venv, ["run.py"], {"PORT": str(WMS_PORT)})

        # SCV
        scv_dir = os.path.join(BASE, "scv")
        scv_venv = os.path.join(scv_dir, ".venv")
        start_app("scv", scv_dir, scv_venv, ["app.py"], {"SCV_PORT": str(SCV_PORT)})

        # Hub
        hub_venv = os.path.join(BASE, ".venv")
        start_app("hub", BASE, hub_venv, ["hub.py"], {"HUB_PORT": str(HUB_PORT)})

        time.sleep(3)
        webbrowser.open(f"http://localhost:{HUB_PORT}")
        log("Browser aberto")
    except Exception as e:
        log(f"ERRO em start_all: {e}\n{traceback.format_exc()}")

def make_icon():
    img = Image.new("RGB", (64, 64), (20, 60, 120))
    draw = ImageDraw.Draw(img)
    # S estilizado
    draw.rectangle([14, 12, 50, 52], fill=(20, 60, 120))
    draw.rectangle([14, 12, 50, 24], fill=(255, 255, 255))
    draw.rectangle([14, 26, 50, 38], fill=(255, 255, 255))
    draw.rectangle([14, 40, 50, 52], fill=(255, 255, 255))
    draw.rectangle([14, 12, 26, 38], fill=(255, 255, 255))
    draw.rectangle([38, 26, 50, 52], fill=(255, 255, 255))
    return img

def on_hub(icon, item):
    webbrowser.open(f"http://localhost:{HUB_PORT}")

def on_wms(icon, item):
    webbrowser.open(f"http://localhost:{WMS_PORT}")

def on_scv(icon, item):
    webbrowser.open(f"http://localhost:{SCV_PORT}")

def on_quit(icon, item):
    log("Encerrando...")
    for name, proc in processes.items():
        try:
            proc.terminate()
            log(f"{name} encerrado")
        except Exception as e:
            log(f"Erro ao encerrar {name}: {e}")
    icon.stop()

def main():
    log("=== Suite Tray iniciando ===")
    try:
        threading.Thread(target=start_all, daemon=True).start()

        menu = pystray.Menu(
            pystray.MenuItem("Abrir Suite (Hub)", on_hub, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("WMS RMA  (porta 5001)", on_wms),
            pystray.MenuItem("SCV  (porta 5002)", on_scv),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Encerrar tudo", on_quit),
        )

        icon = pystray.Icon(
            name="Suite",
            icon=make_icon(),
            title="Suite de Apps",
            menu=menu,
        )
        log("Tray icon criado, iniciando loop...")
        icon.run()
    except Exception as e:
        log(f"ERRO FATAL: {e}\n{traceback.format_exc()}")

if __name__ == "__main__":
    main()
