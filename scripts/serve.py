#!/usr/bin/env python3
"""Serve the source prototype for local development and browser validation."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DevelopmentHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", default=4173, type=int)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    handler = partial(DevelopmentHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Fruit Bloom source server: {args.host}:{server.server_port}", flush=True)
    print(f"Serving {ROOT}; press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
