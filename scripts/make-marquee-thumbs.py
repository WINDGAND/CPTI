# -*- coding: utf-8 -*-
"""
首页跑马灯专用缩略图生成脚本

源图：public/images/cpti/{TYPE}.png（1024x1024）
产物：public/images/cpti/thumbs/{TYPE}.webp / .png（256x256）

256px 覆盖桌面端最大显示高度 120px 的 2x 视网膜需求；
跑马灯展示位为正方形（桌面）或 4:5 居中裁剪（移动端 object-cover），
因此缩略图保持正方形，裁剪交给 CSS，与现有展示逻辑一致。

用法：python scripts/make-marquee-thumbs.py
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "public", "images", "cpti")
OUT_DIR = os.path.join(SRC_DIR, "thumbs")

TYPE_CODES = [
    "SROD", "SROA", "SRFD", "SRFA",
    "SPOD", "SPOA", "SPFD", "SPFA",
    "IROD", "IROA", "IRFD", "IRFA",
    "IPOD", "IPOA", "IPFD", "IPFA",
]

THUMB_SIZE = 256
WEBP_QUALITY = 80


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    total_webp = 0
    total_png = 0

    for code in TYPE_CODES:
        src_path = os.path.join(SRC_DIR, code + ".png")
        if not os.path.exists(src_path):
            print("[skip] %s 源图缺失" % code)
            continue

        with Image.open(src_path) as im:
            im = im.convert("RGB")
            thumb = im.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)

            webp_path = os.path.join(OUT_DIR, code + ".webp")
            png_path = os.path.join(OUT_DIR, code + ".png")
            thumb.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
            thumb.save(png_path, "PNG", optimize=True)

        webp_kb = os.path.getsize(webp_path) / 1024.0
        png_kb = os.path.getsize(png_path) / 1024.0
        total_webp += webp_kb
        total_png += png_kb
        print("[ok] %s  webp %.1fKB  png %.1fKB" % (code, webp_kb, png_kb))

    print("-" * 48)
    print("webp 总计 %.1fKB | png 总计 %.1fKB" % (total_webp, total_png))


if __name__ == "__main__":
    sys.exit(main())
