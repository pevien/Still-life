#!/usr/bin/env python3
"""Chạy unit test của Still life trong Chrome headless. Chỉ dùng thư viện chuẩn của Python.

    python3 tests/run.py

- Tự mở server tĩnh ở một cổng trống, phục vụ thư mục gốc của app.
- Mở Chrome headless với hồ sơ tạm (không đụng Chrome của bạn), vào /tests/.
- Đọc kết quả qua Chrome DevTools Protocol, in ra, trả mã 1 nếu có test hỏng.
Đổi đường dẫn Chrome bằng biến môi trường CHROME nếu cần.
"""
import base64, functools, http.server, json, os, shutil, socket, struct, subprocess, sys, tempfile, threading, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME_PATHS = [
    os.environ.get("CHROME", ""),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
]


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(port):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class CDP:
    """WebSocket tối giản để gọi Chrome DevTools Protocol."""

    def __init__(self, url):
        hostport, path = url.split("://", 1)[1].split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.buf, self.id = buf.split(b"\r\n\r\n", 1)[1], 0

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.s.recv(1 << 20)
            if not chunk:
                raise EOFError("Chrome đóng kết nối")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _send(self, obj):
        data = json.dumps(obj).encode()
        hdr, n = bytearray([0x81]), len(data)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
        else:
            hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
        mask = os.urandom(4)
        self.s.sendall(bytes(hdr) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _recv(self):
        msg = b""
        while True:
            b1, b2 = self._read(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            msg += self._read(n)
            if b1 & 0x80:
                return json.loads(msg)

    def call(self, method, **params):
        self.id += 1
        self._send({"id": self.id, "method": method, "params": params})
        while True:
            m = self._recv()
            if m.get("id") == self.id:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m.get("result", {})


def main():
    chrome = next((p for p in CHROME_PATHS if p and os.path.exists(p)), None)
    if not chrome:
        sys.exit("Không tìm thấy Chrome. Đặt biến CHROME=/đường/dẫn/chrome rồi chạy lại.")
    http_port, dbg_port = free_port(), free_port()
    srv = serve(http_port)
    profile = tempfile.mkdtemp(prefix="still-life-test-")
    proc = subprocess.Popen([chrome, "--headless=new", f"--remote-debugging-port={dbg_port}", f"--user-data-dir={profile}",
                             "--no-first-run", "--no-default-browser-check", "--window-size=500,915", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws_url = None
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{dbg_port}/json"))
                ws_url = next(t["webSocketDebuggerUrl"] for t in tabs if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.1)
        if not ws_url:
            sys.exit("Chrome không mở được cổng DevTools.")
        cdp = CDP(ws_url)
        cdp.call("Page.navigate", url=f"http://127.0.0.1:{http_port}/tests/")
        results = None
        deadline = time.time() + 60
        while time.time() < deadline:
            r = cdp.call("Runtime.evaluate", expression="JSON.stringify(window.__results || null)", returnByValue=True)
            val = r.get("result", {}).get("value")
            if val and val != "null":
                results = json.loads(val)
                break
            time.sleep(0.3)
        if results is None:
            sys.exit("Hết giờ chờ kết quả test (60 giây).")
    finally:
        proc.terminate()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            proc.kill()
        srv.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

    group, fails = None, [r for r in results if not r["ok"]]
    for r in results:
        if r["group"] != group:
            group = r["group"]
            print(f"\n{group}")
        print(f"  {'✓' if r['ok'] else '✗'} {r['name']}")
        if not r["ok"]:
            print("      " + r["err"].replace("\n", "\n      "))
    print(f"\n{len(results) - len(fails)}/{len(results)} test qua" + (f", {len(fails)} hỏng" if fails else ""))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
