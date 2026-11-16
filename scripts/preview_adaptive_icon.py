"""Renders how the Android adaptive icon looks under circle and squircle masks."""
from PIL import Image, ImageDraw
import sys

res = sys.argv[1]
bg = Image.open(f"{res}/mipmap-xxxhdpi/ic_launcher_background.png").convert("RGBA")
fg = Image.open(f"{res}/mipmap-xxxhdpi/ic_launcher_foreground.png").convert("RGBA")
legacy = Image.open(f"{res}/mipmap-xxxhdpi/ic_launcher.png").convert("RGBA")
size = 432
layer = Image.new("RGBA", (size, size))
# Mirror the 16.7% inset from mipmap-anydpi-v26/ic_launcher.xml.
inner = round(size * (1 - 2 * 0.167))
off = (size - inner) // 2
layer.alpha_composite(bg.resize((inner, inner)), (off, off))
layer.alpha_composite(fg.resize((inner, inner)), (off, off))
view = layer.crop((off, off, off + inner, off + inner))
out = Image.new("RGBA", (inner * 3 + 80, inner + 40), (240, 240, 240, 255))
for i, shape in enumerate(["circle", "squircle"]):
    m = Image.new("L", (inner, inner), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse((0, 0, inner - 1, inner - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, inner - 1, inner - 1), inner // 4, fill=255)
    out.paste(view, (20 + i * (inner + 20), 20), m)
out.alpha_composite(legacy.resize((inner, inner)), (20 + 2 * (inner + 20), 20))
out.save(sys.argv[2])
