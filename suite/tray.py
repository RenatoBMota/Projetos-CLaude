"""
Suite Tray - roda WMS-RMA e SCV em background com icone na bandeja.
Dependencias: pystray, Pillow (pip install pystray pillow)
"""
import sys
import os
import subprocess
import threading
import webbrowser
import time
from PIL import Image, ImageDraw
import pystray

BASE = os.path.dirname(os.path.abspath(__file__))
HUB_PORT = int(os.environ.get("HUB_PORT", 5000))
WMS_PORT = int(os.environ.get("WMS_PORT", 5001))
SCV_PORT = int(os.environ.get("SCV_PORT", 5002))

processes = {}

def python_bin(venv_dir):
    return os.path.join(venv_dir, "Scripts", "python.exe")

def setup_venv(venv_dir, req_file):
    if not os.path.exists(python_bin(venv_dir)):
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
        subprocess.run([python_bin(venv_dir), "-m", "pip", "install", "-q", "-r", req_file], check=True)

def start_processes():
    # WMS-RMA
    wms_dir = os.path.join(BASE, "wms-rma")
    wms_venv = os.path.join(wms_dir, ".venv")
    setup_venv(wms_venv, os.path.join(wms_dir, "requirements.txt"))
    env_wms = os.environ.copy()
    env_wms["PORT"] = str(WMS_PORT)
    processes["wms"] = subprocess.Popen(
        [python_bin(wms_venv), "run.py"],
        cwd=wms_dir, env=env_wms,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # SCV
    scv_dir = os.path.join(BASE, "scv")
    scv_venv = os.path.join(scv_dir, ".venv")
    setup_venv(scv_venv, os.path.join(scv_dir, "requirements.txt"))
    env_scv = os.environ.copy()
    env_scv["SCV_PORT"] = str(SCV_PORT)
    processes["scv"] = subprocess.Popen(
        [python_bin(scv_venv), "app.py"],
        cwd=scv_dir, env=env_scv,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # Hub
    hub_venv = os.path.join(BASE, ".venv")
    setup_venv(hub_venv, os.path.join(BASE, "requirements.txt"))
    env_hub = os.environ.copy()
    env_hub["HUB_PORT"] = str(HUB_PORT)
    processes["hub"] = subprocess.Popen(
        [python_bin(hub_venv), "hub.py"],
        cwd=BASE, env=env_hub,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )

    # Abre o hub no browser apos 3 segundos
    time.sleep(3)
    webbrowser.open(f"http://localhost:{HUB_PORT}")

def make_icon():
    """Cria um icone simples 64x64 com gradiente azul."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Fundo circulo azul escuro
    draw.ellipse([2, 2, 62, 62], fill=(30, 64, 120, 255))
    # Letra S branca
    draw.rectangle([20, 18, 44, 46], fill=(255, 255, 255, 220))
    draw.rectangle([22, 20, 42, 44], fill=(30, 64, 120, 255))
    draw.rectangle([20, 18, 44, 26], fill=(255, 255, 255, 220))
    draw.rectangle([20, 28, 44, 36], fill=(255, 255, 255, 220))
    draw.rectangle([20, 38, 44, 46], fill=(255, 255, 255, 220))
    return img

def on_open_hub(icon, item):
    webbrowser.open(f"http://localhost:{HUB_PORT}")

def on_open_wms(icon, item):
    webbrowser.open(f"http://localhost:{WMS_PORT}")

def on_open_scv(icon, item):
    webbrowser.open(f"http://localhost:{SCV_PORT}")

def on_quit(icon, item):
    for name, proc in processes.items():
        try:
            proc.terminate()
        except Exception:
            pass
    icon.stop()

def main():
    # Inicia os processos em background
    t = threading.Thread(target=start_processes, daemon=True)
    t.start()

    menu = pystray.Menu(
        pystray.MenuItem("Abrir Suite (Hub)", on_open_hub, default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem(f"WMS RMA  →  :5001", on_open_wms),
        pystray.MenuItem(f"SCV  →  :5002", on_open_scv),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Encerrar tudo", on_quit),
    )

    icon = pystray.Icon(
        name="Suite",
        icon=make_icon(),
        title="Suite de Apps",
        menu=menu,
    )
    icon.run()

if __name__ == "__main__":
    main()
