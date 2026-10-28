#!/usr/bin/env python3
"""Shared browser server helpers and compatibility entry point for the full playthrough."""
import argparse
from contextlib import contextmanager
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def application_url(standalone=None):
    # This cloud browser blocks file:// navigation by managed policy. Serve the
    # exact exported document once over HTTP, then forbid every subresource.
    exported = None
    if standalone:
        exported = Path(standalone).resolve()
        check(exported.is_file(), f'Standalone export does not exist: {exported}')
        check(exported.is_relative_to(ROOT), 'Standalone file must be inside this project')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    server = subprocess.Popen(
        [sys.executable, str(ROOT / 'scripts/serve.py'), str(port)],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    url = f'http://127.0.0.1:{port}'
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError('Development server exited before readiness')
            try:
                with urlopen(url, timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(.05)
        else:
            raise RuntimeError('Development server did not become ready')
        yield url + ('/' + exported.relative_to(ROOT).as_posix() if exported else '')
    finally:
        server.terminate()
        server.wait(timeout=5)


def check(condition, message):
    if not condition:
        raise AssertionError(message)



if __name__ == '__main__':
    from playthrough import run
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone', type=Path)
    args = parser.parse_args()
    with application_url(args.standalone) as url:
        run(url, standalone=bool(args.standalone))
