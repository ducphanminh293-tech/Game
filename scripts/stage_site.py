#!/usr/bin/env python3
"""Stage only the public Fruit Bloom files for GitHub Pages."""

import argparse
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ENTRIES = ("index.html", "src", "assets", ".nojekyll")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_site",
                        help="New or empty output directory (default: _site)")
    args = parser.parse_args()
    output = args.output.resolve()

    # Never merge a deployment with project files or overwrite unknown contents.
    if output == ROOT or output in ROOT.parents:
        parser.error("The output cannot be the project root or one of its parents.")
    for name in PUBLIC_ENTRIES:
        source = ROOT / name
        if not source.exists():
            parser.error(f"Required public file or directory is missing: {name}")
        if source.is_symlink():
            parser.error(f"Public source cannot be a symlink: {name}")
        if output == source or source in output.parents or output in source.parents:
            parser.error(f"The output overlaps a public source: {name}")
        candidates = list(source.rglob("*")) if source.is_dir() else [source]
        if any(path.is_symlink() for path in candidates):
            parser.error(f"Public source contains a symlink: {name}")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error("The output must be a new or empty directory; choose another --output.")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for reference in re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html):
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc or reference.startswith("/"):
            parser.error(f"Page reference must be local and relative: {reference}")
        target = (ROOT / parsed.path).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            parser.error(f"Page reference is missing or outside the project: {reference}")
        if not any(target == ROOT / name or ROOT / name in target.parents
                   for name in PUBLIC_ENTRIES):
            parser.error(f"Page reference is outside the public file allowlist: {reference}")

    output.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_ENTRIES:
        source = ROOT / name
        if source.is_dir():
            shutil.copytree(source, output / name)
        else:
            shutil.copy2(source, output / name)
    count = sum(path.is_file() for path in output.rglob("*"))
    print(f"Staged {count} public files in {output}")


if __name__ == "__main__":
    main()
