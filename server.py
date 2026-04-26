import http.server
import mimetypes
import os
import sys
from urllib.parse import urlsplit

if __name__ == "__main__":
    print("ERROR: server.py is deprecated for this project.")
    print("Use: npm install && npm run dev")
    raise SystemExit(1)

ROOT = os.path.join(os.path.dirname(__file__), "www")
ASSETS_DIR = os.path.join(ROOT, "assets")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000


def _sniff_mime(data):
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    if b"ftypavif" in data[:32]:
        return "image/avif"
    if b"ftypisom" in data[:32] or b"ftypmp4" in data[:32]:
        return "video/mp4"
    if data.lstrip().startswith(b"<svg") or b"<svg" in data[:512]:
        return "image/svg+xml"
    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _serve_asset(self, asset_id):
        path = os.path.join(ASSETS_DIR, asset_id)
        if not os.path.exists(path) or os.path.isdir(path):
            self.send_error(404, "Asset not found")
            return
        with open(path, "rb") as f:
            data = f.read()
        mime = _sniff_mime(data) or mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path.startswith("/assets/"):
            return self._serve_asset(parsed.path.split("/assets/", 1)[1])
        return super().do_GET()

    def translate_path(self, path):
        p = super().translate_path(path)
        if os.path.isdir(p):
            for name in ("index.html", "index.htm"):
                idx = os.path.join(p, name)
                if os.path.exists(idx):
                    return idx
        return p

    def log_message(self, fmt, *args):
        print(f"  {args[0]}  {args[1]}")


# (legacy) kept for reference, but blocked above
