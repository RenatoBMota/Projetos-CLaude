"""
Suite Tray - icone na bandeja do sistema usando pywin32 (sem Pillow).
Compativel com Python 3.14+.
"""
import sys, os, base64, subprocess, threading, webbrowser, time, traceback

LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "suite_error.log")
def log(msg):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")

try:
    import win32gui, win32con, win32api
except Exception as e:
    log(f"ERRO import pywin32: {e}\n{traceback.format_exc()}")
    sys.exit(1)

BASE     = os.path.dirname(os.path.abspath(__file__))
HUB_PORT = 5000
WMS_PORT = 5001
SCV_PORT = 5002

processes = {}

ICO_B64 = (
    "AAABAAEAICAAAAEAGACoDAAAFgAAACgAAAAgAAAAQAAAAAEAGAAAAAAAgAwAAAAAAAAAAAAAAAAA"
    "AAAAAAAUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/"
    "//////////////////////////////////////////////////////////////8UQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////////////////"
    "//////////////////////////////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////////////////////////////////////////"
    "//////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHj///////////////////////////////////////////////////////////////8UQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHj///////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHj///////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHj///////////////////////////////////////////////////////////////8UQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////////"
    "//////////////////////////////////////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////////////////////////////////"
    "//////////////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHj///////////////////////////////////////////////////////////////8U"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////"
    "//8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj///////////////8UQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHj/////////////////////////////////////////////////////////////"
    "//8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////"
    "//////////////////////////////////////////////////////8UQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHj/////////////////////////////////"
    "//////////////////////////////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHj/////////////////////////////////////////////////////////"
    "//////8UQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgU"
    "QHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgUQHgA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAA=="
)

def get_ico_path():
    """Grava o ICO num path sem espacos/acentos (temp dir)."""
    ico_path = os.path.join(os.environ.get("TEMP", os.getcwd()), "suite_app.ico")
    with open(ico_path, "wb") as f:
        f.write(base64.b64decode(ICO_B64))
    return ico_path

WM_TRAY    = win32con.WM_USER + 20
NIM_ADD    = 0
NIM_DELETE = 2
NIF_MESSAGE = 1
NIF_ICON    = 2
NIF_TIP     = 4

MENU_HUB   = 1001
MENU_WMS   = 1002
MENU_SCV   = 1003
MENU_QUIT  = 1009

def python_bin(venv_dir):
    return os.path.join(venv_dir, "Scripts", "python.exe")

def ensure_deps(venv_dir, req_file):
    pip = os.path.join(venv_dir, "Scripts", "pip.exe")
    if not os.path.exists(python_bin(venv_dir)):
        log(f"Criando venv {venv_dir}")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True,
                       creationflags=subprocess.CREATE_NO_WINDOW)
    log(f"pip install {req_file}")
    subprocess.run([pip, "install", "-q", "-r", req_file], check=True,
                   creationflags=subprocess.CREATE_NO_WINDOW)

def start_app(name, cwd, venv_dir, cmd, extra_env=None):
    try:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        if extra_env:
            env.update(extra_env)
        lf = open(os.path.join(BASE, f"{name}.log"), "w", encoding="utf-8")
        proc = subprocess.Popen(
            [python_bin(venv_dir)] + cmd, cwd=cwd, env=env,
            stdout=lf, stderr=lf, creationflags=subprocess.CREATE_NO_WINDOW
        )
        processes[name] = proc
        log(f"{name} iniciado PID={proc.pid}")
    except Exception as e:
        log(f"ERRO {name}: {e}\n{traceback.format_exc()}")

def start_all():
    try:
        wms_dir  = os.path.join(BASE, "wms-rma")
        wms_venv = os.path.join(wms_dir, ".venv")
        ensure_deps(wms_venv, os.path.join(wms_dir, "requirements.txt"))
        start_app("wms", wms_dir, wms_venv, ["run.py"], {"PORT": str(WMS_PORT)})

        scv_dir  = os.path.join(BASE, "scv")
        scv_venv = os.path.join(scv_dir, ".venv")
        ensure_deps(scv_venv, os.path.join(scv_dir, "requirements.txt"))
        start_app("scv", scv_dir, scv_venv, ["app.py"], {"SCV_PORT": str(SCV_PORT)})

        hub_venv = os.path.join(BASE, ".venv")
        start_app("hub", BASE, hub_venv, ["hub.py"], {"HUB_PORT": str(HUB_PORT)})

        time.sleep(4)
        webbrowser.open(f"http://localhost:{HUB_PORT}")
        log("Browser aberto")
    except Exception as e:
        log(f"ERRO start_all: {e}\n{traceback.format_exc()}")

def show_menu(hwnd):
    menu = win32gui.CreatePopupMenu()
    win32gui.AppendMenu(menu, win32con.MF_STRING,    MENU_HUB,  "Abrir Suite (Hub)")
    win32gui.AppendMenu(menu, win32con.MF_SEPARATOR, 0, "")
    win32gui.AppendMenu(menu, win32con.MF_STRING,    MENU_WMS,  f"WMS RMA  porta {WMS_PORT}")
    win32gui.AppendMenu(menu, win32con.MF_STRING,    MENU_SCV,  f"SCV  porta {SCV_PORT}")
    win32gui.AppendMenu(menu, win32con.MF_SEPARATOR, 0, "")
    win32gui.AppendMenu(menu, win32con.MF_STRING,    MENU_QUIT, "Encerrar tudo")
    pos = win32gui.GetCursorPos()
    win32gui.SetForegroundWindow(hwnd)
    win32gui.TrackPopupMenu(menu, win32con.TPM_LEFTALIGN, pos[0], pos[1], 0, hwnd, None)
    win32gui.PostMessage(hwnd, win32con.WM_NULL, 0, 0)
    win32gui.DestroyMenu(menu)

_nid = None

def add_tray(hwnd, hicon):
    global _nid
    _nid = (hwnd, 0, NIF_MESSAGE | NIF_ICON | NIF_TIP, WM_TRAY, hicon, "Suite de Apps")
    win32gui.Shell_NotifyIcon(NIM_ADD, _nid)

def remove_tray(hwnd):
    global _nid
    if _nid:
        try:
            win32gui.Shell_NotifyIcon(NIM_DELETE, _nid)
        except Exception:
            pass
        _nid = None

def wnd_proc(hwnd, msg, wparam, lparam):
    if msg == WM_TRAY:
        if lparam == win32con.WM_RBUTTONUP:
            show_menu(hwnd)
        elif lparam == win32con.WM_LBUTTONDBLCLK:
            webbrowser.open(f"http://localhost:{HUB_PORT}")
    elif msg == win32con.WM_COMMAND:
        cmd = wparam & 0xFFFF
        if   cmd == MENU_HUB:  webbrowser.open(f"http://localhost:{HUB_PORT}")
        elif cmd == MENU_WMS:  webbrowser.open(f"http://localhost:{WMS_PORT}")
        elif cmd == MENU_SCV:  webbrowser.open(f"http://localhost:{SCV_PORT}")
        elif cmd == MENU_QUIT:
            remove_tray(hwnd)
            for p in processes.values():
                try: p.terminate()
                except: pass
            win32gui.PostQuitMessage(0)
    elif msg == win32con.WM_DESTROY:
        remove_tray(hwnd)
        win32gui.PostQuitMessage(0)
    else:
        return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)
    return 0

def main():
    log("=== Suite Tray iniciando (pywin32) ===")
    try:
        threading.Thread(target=start_all, daemon=True).start()

        ico_path = get_ico_path()
        log(f"ICO path: {ico_path}")

        hicon = win32gui.LoadImage(
            0, ico_path, win32con.IMAGE_ICON,
            0, 0, win32con.LR_LOADFROMFILE | win32con.LR_DEFAULTSIZE
        )
        log(f"hicon={hicon}")

        wc = win32gui.WNDCLASS()
        wc.hInstance    = win32api.GetModuleHandle(None)
        wc.lpszClassName = "SuiteTrayWnd"
        wc.lpfnWndProc  = wnd_proc
        win32gui.RegisterClass(wc)

        hwnd = win32gui.CreateWindow(
            "SuiteTrayWnd", "Suite Tray",
            0, 0, 0, 0, 0, 0, 0,
            win32api.GetModuleHandle(None), None
        )
        log(f"hwnd={hwnd}")

        add_tray(hwnd, hicon)
        log("Tray OK - loop de mensagens iniciado")
        win32gui.PumpMessages()
    except Exception as e:
        log(f"ERRO FATAL: {e}\n{traceback.format_exc()}")

if __name__ == "__main__":
    main()
