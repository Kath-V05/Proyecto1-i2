#!/usr/bin/env python3
"""
KittyTasks Local Development Server
Run this script to serve the app locally.
Usage: python server.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys
import mimetypes

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Ensure .js files are served with the correct MIME type for ES modules
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Serve the SPA and handle client-side routing."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]

        # Remap /manifest.json → /public/manifest.json
        if path == '/manifest.json':
            self.path = '/public/manifest.json'
            return super().do_GET()

        # Remap /icons/* → /public/icons/*
        if path.startswith('/icons/'):
            self.path = '/public' + path
            return super().do_GET()

        full_path = os.path.join(DIRECTORY, path.lstrip('/'))

        # For SPA routes (non-asset paths), serve index.html
        if not os.path.exists(full_path) or os.path.isdir(full_path):
            if (not path.startswith('/src/')
                    and not path.startswith('/public/')
                    and '.' not in os.path.basename(path)):
                self.path = '/index.html'

        return super().do_GET()

    def log_message(self, format, *args):
        print(f"\033[36m[KittyTasks]\033[0m {self.address_string()} - {format % args}")


# ThreadingMixIn allows the server to handle multiple concurrent requests.
# Without this, all 15+ parallel ES module imports from the browser are
# refused because TCPServer is single-threaded by default.
class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True   # Must be a class attr, not instance attr
    daemon_threads = True        # Threads die when main thread dies


def main():
    os.chdir(DIRECTORY)

    with ThreadedTCPServer(("", PORT), SPAHandler) as httpd:
        print(f"\n\033[35m🐱 KittyTasks Dev Server\033[0m")
        print(f"\033[32m[OK] Corriendo en: http://localhost:{PORT}\033[0m")
        print(f"\033[90mPresiona Ctrl+C para detener\033[0m\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\033[31m🛑 Servidor detenido\033[0m")
            sys.exit(0)


if __name__ == "__main__":
    main()
