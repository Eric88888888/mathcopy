from __future__ import annotations

import ctypes
import json
import logging
import os
import sys
import threading
import time
from ctypes import wintypes
from pathlib import Path

import webview

APP_NAME = "MathCopy"
APP_TITLE = "数学符号复制器 · MathCopy"
APP_VERSION = "1.0.0"
WINDOW_MIN = (980, 660)

logger = logging.getLogger("mathcopy")


def resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parent


def data_dir() -> Path:
    base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
    path = Path(base) / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def setup_logging() -> None:
    try:
        handler = logging.FileHandler(data_dir() / "app.log", encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    except OSError:
        pass


def show_error(message: str) -> None:
    logger.error(message)
    try:
        ctypes.windll.user32.MessageBoxW(None, message, "MathCopy 启动失败", 0x10)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Windows clipboard
# ---------------------------------------------------------------------------
user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

CF_UNICODETEXT = 13
GMEM_MOVEABLE = 0x0002

user32.OpenClipboard.argtypes = [wintypes.HWND]
user32.OpenClipboard.restype = wintypes.BOOL
user32.EmptyClipboard.argtypes = []
user32.EmptyClipboard.restype = wintypes.BOOL
user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
user32.SetClipboardData.restype = wintypes.HANDLE
user32.CloseClipboard.argtypes = []
user32.CloseClipboard.restype = wintypes.BOOL
user32.SetWindowPos.argtypes = [
    wintypes.HWND,
    wintypes.HWND,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_int,
    wintypes.UINT,
]
user32.SetWindowPos.restype = wintypes.BOOL
user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
user32.GetWindowLongW.restype = ctypes.c_long
user32.SetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_long]
user32.SetWindowLongW.restype = ctypes.c_long
user32.ReleaseCapture.argtypes = []
user32.ReleaseCapture.restype = wintypes.BOOL
user32.SendMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
user32.SendMessageW.restype = ctypes.c_ssize_t

WM_NCLBUTTONDOWN = 0x00A1
HT_CODES = {
    "left": 10,
    "right": 11,
    "top": 12,
    "top_left": 13,
    "top_right": 14,
    "bottom": 15,
    "bottom_left": 16,
    "bottom_right": 17,
}
GWL_STYLE = -16
WS_THICKFRAME = 0x00040000
WS_MINIMIZEBOX = 0x00020000
WS_MAXIMIZEBOX = 0x00010000
WS_SYSMENU = 0x00080000

kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel32.GlobalAlloc.restype = wintypes.HANDLE
kernel32.GlobalLock.argtypes = [wintypes.HANDLE]
kernel32.GlobalLock.restype = ctypes.c_void_p
kernel32.GlobalUnlock.argtypes = [wintypes.HANDLE]
kernel32.GlobalUnlock.restype = wintypes.BOOL
kernel32.GlobalFree.argtypes = [wintypes.HANDLE]
kernel32.GlobalFree.restype = wintypes.HANDLE

_clipboard_lock = threading.Lock()


def set_clipboard_text(text: str) -> bool:
    if not isinstance(text, str) or len(text) > 200_000:
        return False
    payload = text.encode("utf-16-le") + b"\x00\x00"
    with _clipboard_lock:
        opened = False
        for _ in range(10):
            if user32.OpenClipboard(None):
                opened = True
                break
            time.sleep(0.02)
        if not opened:
            logger.warning("Could not open clipboard")
            return False
        try:
            if not user32.EmptyClipboard():
                return False
            handle = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(payload))
            if not handle:
                return False
            pointer = kernel32.GlobalLock(handle)
            if not pointer:
                kernel32.GlobalFree(handle)
                return False
            try:
                ctypes.memmove(pointer, payload, len(payload))
            finally:
                kernel32.GlobalUnlock(handle)
            if not user32.SetClipboardData(CF_UNICODETEXT, handle):
                kernel32.GlobalFree(handle)
                return False
            # Ownership of the global memory block passes to the clipboard.
            return True
        except OSError:
            logger.exception("Clipboard write failed")
            return False
        finally:
            user32.CloseClipboard()


# ---------------------------------------------------------------------------
# JS bridge
# ---------------------------------------------------------------------------
class Api:
    def __init__(self) -> None:
        self._state_path = data_dir() / "state.json"
        self._state_lock = threading.Lock()
        self._window = None

    def copy_text(self, text: str) -> bool:
        return set_clipboard_text(text)

    def window_minimize(self) -> bool:
        if self._window:
            self._window.minimize()
            return True
        return False

    def window_maximize(self) -> bool:
        if not self._window:
            return False
        try:
            maximized = int(self._window.native.WindowState) == 2
            if maximized:
                self._window.restore()
            else:
                self._window.maximize()
            return not maximized
        except Exception:
            logger.exception("Could not toggle maximize")
            return False

    def window_is_maximized(self) -> bool:
        if not self._window:
            return False
        try:
            return int(self._window.native.WindowState) == 2
        except Exception:
            return False

    def window_close(self) -> bool:
        if self._window:
            self._window.destroy()
            return True
        return False

    def begin_resize(self, edge: str) -> bool:
        if not self._window or edge not in HT_CODES:
            return False
        try:
            hwnd = wintypes.HWND(int(self._window.native.Handle.ToInt32()))
            user32.ReleaseCapture()
            user32.SendMessageW(hwnd, WM_NCLBUTTONDOWN, HT_CODES[edge], 0)
            return True
        except Exception:
            logger.exception("Could not start native resize")
            return False

    def load_state(self) -> dict:
        with self._state_lock:
            try:
                raw = json.loads(self._state_path.read_text(encoding="utf-8"))
                return raw if isinstance(raw, dict) else {}
            except FileNotFoundError:
                return {}
            except (OSError, ValueError):
                logger.exception("Could not read state file")
                return {}

    def save_state(self, state) -> bool:
        if not isinstance(state, dict):
            return False
        clean = self._clean_state(state)
        with self._state_lock:
            try:
                temporary = self._state_path.with_suffix(".tmp")
                temporary.write_text(
                    json.dumps(clean, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8",
                )
                os.replace(temporary, self._state_path)
                return True
            except OSError:
                logger.exception("Could not save state file")
                return False

    @staticmethod
    def _clean_state(state: dict) -> dict:
        favorites = []
        for key in state.get("favorites", [])[:500]:
            if isinstance(key, str) and len(key) <= 300 and key not in favorites:
                favorites.append(key)

        recent = []
        for entry in state.get("recent", [])[:24]:
            if not isinstance(entry, dict):
                continue
            key = entry.get("key")
            char = entry.get("char")
            if not isinstance(key, str) or not isinstance(char, str):
                continue
            recent.append(
                {
                    "key": key[:300],
                    "char": char[:24],
                    "name": str(entry.get("name", ""))[:200],
                    "categoryName": str(entry.get("categoryName", ""))[:100],
                    "latex": str(entry.get("latex", ""))[:200],
                    "ts": int(entry.get("ts") or 0),
                }
            )

        try:
            copied = max(0, int(state.get("copiedCount", 0)))
        except (TypeError, ValueError):
            copied = 0
        try:
            updated = max(0, int(state.get("updatedAt", 0)))
        except (TypeError, ValueError):
            updated = 0

        return {
            "favorites": favorites,
            "recent": recent,
            "copiedCount": copied,
            "updatedAt": updated,
        }


# ---------------------------------------------------------------------------
# Window chrome
# ---------------------------------------------------------------------------
def prepare_borderless_window(window) -> None:
    """Add native resize edges to the frameless window and match the DWM border."""
    try:
        hwnd_value = int(window.native.Handle.ToInt32())
        hwnd = wintypes.HWND(hwnd_value)
        style = user32.GetWindowLongW(hwnd, GWL_STYLE)
        style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU
        user32.SetWindowLongW(hwnd, GWL_STYLE, style)
        user32.SetWindowPos(hwnd, None, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020)
        try:
            dwmapi = ctypes.WinDLL("dwmapi")
            dwmapi.DwmSetWindowAttribute.argtypes = [
                wintypes.HWND,
                wintypes.DWORD,
                ctypes.c_void_p,
                wintypes.DWORD,
            ]
            dwmapi.DwmSetWindowAttribute.restype = ctypes.c_long
            border = ctypes.c_uint(0x00140B07)
            dwmapi.DwmSetWindowAttribute(hwnd, 34, ctypes.byref(border), ctypes.sizeof(border))
            corner = ctypes.c_int(2)
            dwmapi.DwmSetWindowAttribute(hwnd, 33, ctypes.byref(corner), ctypes.sizeof(corner))
        except Exception:
            pass
        logger.info("Prepared borderless window (style=0x%08X)", style)
    except Exception:
        logger.exception("Could not prepare borderless window")


def window_geometry() -> tuple[int, int, int | None, int | None]:
    width, height = 1480, 940
    x = y = None
    try:
        screen = webview.screens[0]
        available_w = max(WINDOW_MIN[0], int(screen.width) - 80)
        available_h = max(WINDOW_MIN[1], int(screen.height) - 110)
        width = min(width, available_w)
        height = min(height, available_h)
        x = int(screen.x + (screen.width - width) / 2)
        y = int(screen.y + (screen.height - height) / 2)
    except Exception:
        pass
    return width, height, x, y


def main() -> None:
    setup_logging()
    logger.info("Starting MathCopy %s (frozen=%s)", APP_VERSION, getattr(sys, "frozen", False))

    base = resource_dir()
    index = base / "web" / "index.html"
    icon = base / "assets" / "app.ico"
    if not index.is_file():
        show_error(f"找不到界面文件：\n{index}\n\n请重新安装 MathCopy。")
        return

    api = Api()
    webview.settings["DRAG_REGION_DIRECT_TARGET_ONLY"] = True
    width, height, x, y = window_geometry()
    window = webview.create_window(
        APP_TITLE,
        url=str(index),
        js_api=api,
        width=width,
        height=height,
        x=x,
        y=y,
        min_size=WINDOW_MIN,
        resizable=True,
        background_color="#070b14",
        confirm_close=False,
        text_select=True,
        zoomable=False,
        frameless=True,
        easy_drag=True,
        shadow=True,
    )
    if window is None:
        show_error("无法创建应用窗口。")
        return
    api._window = window

    def on_start() -> None:
        time.sleep(0.35)
        prepare_borderless_window(window)

    try:
        webview.start(
            on_start,
            http_server=True,
            private_mode=False,
            storage_path=str(data_dir() / "webview"),
            icon=str(icon) if icon.is_file() else None,
            gui="edgechromium",
            debug=False,
        )
    except Exception as error:
        logger.exception("Fatal error")
        show_error(f"MathCopy 无法启动：\n{error}\n\n请确认系统已安装 Microsoft Edge WebView2 运行时。")


if __name__ == "__main__":
    main()
