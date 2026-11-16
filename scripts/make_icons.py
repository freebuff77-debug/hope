"""Builds every app icon / splash image from the Maalun logo.

Usage: uv run --with pillow python scripts/make_icons.py <logo.png>
The source has a black backdrop around a rounded blue square; we crop to the
square, cut the corners to transparency, and lay it on the brand gradient.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TOP, BOTTOM = (0x05, 0x6D, 0xFD), (0x01, 0x24, 0xAE)  # sampled from the logo


def rounded_mask(size: int, radius: int, scale: int = 4) -> Image.Image:
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius * scale, fill=255)
    return big.resize((size, size), Image.LANCZOS)


def dark_pixels(img: Image.Image, mask: Image.Image) -> int:
    n = 0
    px, mk = img.load(), mask.load()
    w, h = img.size
    band = w // 4
    for y in list(range(band)) + list(range(h - band, h)):
        for x in list(range(band)) + list(range(w - band, w)):
            if mk[x, y] > 128:
                r, g, b = px[x, y][:3]
                if r < 40 and g < 40 and b < 70:
                    n += 1
    return n


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (0.35 * x + 0.65 * y) / size  # mostly vertical, slight diagonal like the logo
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    return img


def main(src: str) -> None:
    im = Image.open(src).convert("RGB")
    # Bounds of the blue square measured by scripts/inspect_logo.py.
    left, top, right, bottom = 72, 69, 1182, 1185
    side = min(right - left, bottom - top)
    square = im.crop((left, top, left + side, top + side))
    # Smallest corner radius that leaves no black backdrop inside the mask.
    radius = next(r for r in range(120, 360, 4) if dark_pixels(square, rounded_mask(side, r)) < 20)
    radius += 6
    print("side", side, "radius", radius)
    logo = square.convert("RGBA")
    logo.putalpha(rounded_mask(side, radius))

    def logo_at(px: int) -> Image.Image:
        return logo.resize((px, px), Image.LANCZOS)

    def on_canvas(size: int, logo_px: int, bg: Image.Image | None) -> Image.Image:
        canvas = bg.copy().convert("RGBA") if bg else Image.new("RGBA", (size, size), (0, 0, 0, 0))
        off = (size - logo_px) // 2
        canvas.alpha_composite(logo_at(logo_px), (off, off))
        return canvas

    assets, public = ROOT / "assets", ROOT / "public"
    assets.mkdir(exist_ok=True)
    # Android: legacy icon is the logo itself. @capacitor/assets insets the
    # adaptive layers to the visible 72dp zone, so the foreground can be large;
    # 92% keeps the wordmark inside even a circular launcher mask.
    logo_at(1024).save(assets / "icon-only.png")
    on_canvas(1024, 942, None).save(assets / "icon-foreground.png")
    gradient(1024).save(assets / "icon-background.png")
    splash_bg = gradient(2732)
    on_canvas(2732, 900, splash_bg).convert("RGB").save(assets / "splash.png")
    on_canvas(2732, 900, splash_bg).convert("RGB").save(assets / "splash-dark.png")

    # PWA / web
    for s in (192, 512):
        logo_at(s).save(public / f"icon-{s}.png")
    on_canvas(512, 410, gradient(512)).convert("RGB").save(public / "icon-maskable-512.png")
    logo_at(180).save(public / "apple-touch-icon.png")
    logo_at(64).save(public / "favicon.png")
    logo_at(160).save(public / "logo.png")


if __name__ == "__main__":
    main(sys.argv[1])
