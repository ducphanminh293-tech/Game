#!/usr/bin/env python3
"""Export Fruit Bloom as a portable HTML document and a download ZIP."""

import base64
from html import unescape
import json
import mimetypes
from pathlib import Path
import re
from urllib.parse import urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
IMAGE_EXTENSIONS = {".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif", ".avif"}
REQUIRED_ASSETS = (
    "garden.png", "hall.png", "orchard.png", "kitchen.png", "workshop.png",
    "mira.png", "jasper.png", "rowan.png",
)
ATTR = re.compile(r'''([\w-]+)\s*=\s*(["'])(.*?)\2''', re.DOTALL)


def attributes(tag):
    return {name.lower(): unescape(value) for name, _, value in ATTR.findall(tag)}


def local_path(url, parent=None):
    parent = ROOT if parent is None else parent
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return None
    path = (ROOT / parsed.path.lstrip("/")) if parsed.path.startswith("/") else parent / parsed.path
    resolved = path.resolve()
    if not resolved.is_relative_to(ROOT):
        raise ValueError(f"Refusing to bundle a file outside the project: {url}")
    return resolved


def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def embed_css_urls(css, stylesheet):
    def replace(match):
        raw = match.group(1).strip().strip("\"'")
        if not raw or raw.startswith(("data:", "#")):
            return match.group(0)
        path = local_path(raw, stylesheet.parent)
        if path is None:
            raise ValueError(f"External CSS dependency would prevent offline use: {raw}")
        return f'url("{data_uri(path)}")'
    return re.sub(r"url\(([^)]+)\)", replace, css)


def bundle_html():
    missing = [name for name in REQUIRED_ASSETS if not (ROOT / "assets" / name).is_file()]
    if missing:
        raise FileNotFoundError(
            "Missing required artwork in assets/: " + ", ".join(missing)
            + ". Export cancelled; existing dist artifacts were not updated."
        )
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def replace_link(match):
        tag = match.group(0)
        attrs = attributes(tag)
        href = attrs.get("href")
        if not href:
            return tag
        if attrs.get("rel") == "stylesheet":
            path = local_path(href)
            if path is None:
                raise ValueError(f"External stylesheet would prevent offline use: {href}")
            css = embed_css_urls(path.read_text(encoding="utf-8"), path)
            return f"<style>\n{css}\n</style>"
        if attrs.get("rel") in {"icon", "shortcut icon"}:
            path = local_path(href)
            if path is not None:
                return tag.replace(href, data_uri(path))
        return tag

    html = re.sub(r"<link\b[^>]*>", replace_link, html, flags=re.IGNORECASE)

    def replace_script(match):
        opening, content = match.group(1), match.group(2)
        attrs = attributes(opening)
        src = attrs.get("src")
        if not src:
            return match.group(0)
        path = local_path(src)
        if path is None:
            raise ValueError(f"External script would prevent offline use: {src}")
        if attrs.get("type") == "module":
            raise ValueError("This exporter expects classic scripts; bundle modules first.")
        code = path.read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>\n{code}\n</script>"

    def replace_image(match):
        tag = match.group(0)
        src = attributes(tag).get("src")
        if not src or src.startswith("data:"):
            return tag
        path = local_path(src)
        if path is None:
            raise ValueError(f"External image would prevent offline use: {src}")
        return tag.replace(src, data_uri(path))

    html = re.sub(r"<img\b[^>]*>", replace_image, html, flags=re.IGNORECASE)
    # Process HTML image tags before inlining code: JS templates may contain
    # dynamic <img> strings that the application resolves through FB_ASSETS.
    html = re.sub(r"(<script\b[^>]*>)(.*?)</script\s*>", replace_script, html,
                  flags=re.IGNORECASE | re.DOTALL)
    assets = {}
    for path in sorted((ROOT / "assets").rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if path.name.lower().startswith(("style", "reference")):
            continue
        assets[path.relative_to(ROOT / "assets").as_posix()] = data_uri(path)
    encoded = json.dumps(assets, ensure_ascii=True, separators=(",", ":")).replace("</", "<\\/")
    injection = f"<script>window.FB_ASSETS={encoded};</script>\n"
    html = html.replace("</head>", injection + "</head>", 1)
    if "window.FB_ASSETS=" not in html:
        raise ValueError("index.html requires a closing </head> tag for asset injection.")
    return html, len(assets)


def main():
    html, asset_count = bundle_html()
    DIST.mkdir(parents=True, exist_ok=True)
    output = DIST / "Fruit-Bloom-PC.html"
    output.write_text(html, encoding="utf-8")
    instructions = """FRUIT BLOOM — PC PREVIEW

Extract this ZIP, then double-click Fruit-Bloom-PC.html to open it in a desktop
browser. No Internet connection, installation, or local server is needed.
English is the default; use VI / EN to change language. Explore by clicking
buildings and navigation buttons, dragging the garden, and using zoom controls.
This is a UI prototype: assignment changes are demo state. Fruit-shooting,
production, reward claims, and actual recruitment are not implemented.

FRUIT BLOOM — BẢN XEM TRƯỚC TRÊN PC

Giải nén ZIP, rồi mở Fruit-Bloom-PC.html bằng trình duyệt trên máy tính.
Không cần cài đặt hay kết nối mạng. Mặc định tiếng Anh; bấm VI / EN để đổi.
Kéo khu vườn, dùng nút thu phóng và bấm công trình để khám phá.
Đây là bản giao diện demo; chưa có gameplay bắn trái cây, sản xuất theo thời
gian, nhận thưởng hoặc quay gacha thật.
"""
    archive = DIST / "Fruit-Bloom-PC.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, body in ((output.name, html), ("READ-ME.txt", instructions)):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(info, body.encode("utf-8"))
    print(f"Built {output.name}: {output.stat().st_size:,} bytes; {asset_count} embedded artwork assets")
    print(f"Built {archive.name}: {archive.stat().st_size:,} bytes")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(f"Build failed: {error}")
