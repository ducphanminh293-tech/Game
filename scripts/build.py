#!/usr/bin/env python3
"""Export Fruit Bloom as a portable HTML document and a download ZIP."""

import argparse
import base64
from html import unescape
import json
import mimetypes
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
# Scene and puzzle artwork are generated from the inline SVG source modules.
# Keep this explicit list limited to images actually used by the active game;
# historical concept PNGs stay in the repository but are not shipped in exports.
REQUIRED_ASSETS = ()
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
    assets = {name: data_uri(ROOT / "assets" / name) for name in REQUIRED_ASSETS}
    encoded = json.dumps(assets, ensure_ascii=True, separators=(",", ":")).replace("</", "<\\/")
    injection = f"<script>window.FB_ASSETS={encoded};</script>\n"
    html = html.replace("</head>", injection + "</head>", 1)
    if "window.FB_ASSETS=" not in html:
        raise ValueError("index.html requires a closing </head> tag for asset injection.")
    return html, len(assets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release", action="store_true", help="Also refresh the GitHub PC download in downloads/")
    args = parser.parse_args()
    html, asset_count = bundle_html()
    DIST.mkdir(parents=True, exist_ok=True)
    output = DIST / "Fruit-Bloom-PC.html"
    output.write_text(html, encoding="utf-8")
    instructions = """FRUIT BLOOM — PLAYABLE PC EDITION

Extract this ZIP, then double-click Fruit-Bloom-PC.html to open it in a desktop
browser. No Internet connection, installation, or local server is needed.
English is the default; use VI / EN to change language.

1. Click a basket above ripe rice or an apple tree to collect your first harvest.
2. Choose Play. Drag adjacent fruit, or click two neighbours, to match 3 in a
   row or column. Completing the goals earns materials and opens the next level.
3. Choose Build, select an item, then click a clear tile in your village.
   Construction spends the displayed materials. Select an item to move or upgrade it.
4. Choose Orders to trade your harvest for coins and building materials.

Drag the landscape to pan; use the mouse wheel or zoom buttons to look closer.
Production continues to its next ready harvest while you are away. Village,
resources and completed levels save in this browser when storage is available.
The exported HTML contains all artwork and Vietnamese fonts. Progress is local
to the browser; there is no account, cloud synchronization or real-money shop.

FRUIT BLOOM — BẢN XEM TRƯỚC TRÊN PC

Giải nén ZIP, rồi mở Fruit-Bloom-PC.html bằng trình duyệt trên máy tính.
Không cần cài đặt hay kết nối mạng. Mặc định tiếng Anh; bấm VI / EN để đổi.
Kéo khu vườn, dùng nút thu phóng và bấm công trình để khám phá.

1. Bấm giỏ phía trên ruộng chín hoặc cây táo để thu hoạch.
2. Bấm Chơi. Kéo hoặc bấm hai trái liền kề để đổi chỗ, ghép từ 3 trái theo
   hàng ngang hoặc dọc. Thắng màn để nhận vật liệu và mở màn tiếp theo.
3. Bấm Xây dựng, chọn vật dụng rồi bấm ô trống trong làng. Xây dựng tiêu hao
   vật liệu được hiển thị. Chọn vật đã đặt để di chuyển hoặc nâng cấp.
4. Bấm Đơn hàng để đổi nông sản lấy xu và vật liệu.

Cây trồng tiếp tục lớn đến lần thu hoạch tiếp theo khi bạn rời game.
Làng, tài nguyên và tiến trình màn chơi được lưu trong trình duyệt nếu cho phép.
Bản HTML chứa sẵn hình ảnh và font tiếng Việt. Tiến trình lưu trên máy này;
chưa có tài khoản, đồng bộ đám mây hoặc cửa hàng dùng tiền thật.
"""
    archive = DIST / "Fruit-Bloom-PC.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, body in ((output.name, html), ("READ-ME.txt", instructions)):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(info, body.encode("utf-8"))
    print(f"Built {output.name}: {output.stat().st_size:,} bytes; {asset_count} embedded artwork assets")
    print(f"Built {archive.name}: {archive.stat().st_size:,} bytes")
    if args.release:
        destination = ROOT / "downloads"
        destination.mkdir(exist_ok=True)
        shutil.copy2(archive, destination / archive.name)
        print(f"Refreshed downloads/{archive.name}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(f"Build failed: {error}")
