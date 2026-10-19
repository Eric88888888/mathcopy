from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(r"C:\DSH_projects")
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)

SIZE = 1024
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

# Rounded-square gradient body.
body = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gradient = Image.new("RGBA", (SIZE, SIZE))
top = (29, 78, 216)
bottom = (8, 145, 178)
for y in range(SIZE):
    t = y / (SIZE - 1)
    # ease the blend slightly toward the cyan end
    t = t ** 0.88
    color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
    ImageDraw.Draw(gradient).line([(0, y), (SIZE, y)], fill=color + (255,))

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((54, 54, SIZE - 54, SIZE - 54), radius=226, fill=255)
body.paste(gradient, (0, 0), mask)

# Subtle glass highlight at the top.
highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
hd = ImageDraw.Draw(highlight)
hd.rounded_rectangle((54, 54, SIZE - 54, SIZE - 54), radius=226, fill=(255, 255, 255, 18))
highlight = highlight.filter(ImageFilter.GaussianBlur(40))
body = Image.alpha_composite(body, Image.composite(highlight, Image.new("RGBA", (SIZE, SIZE)), mask))

draw = ImageDraw.Draw(body)

# Sigma glyph, drawn as a polygon for crisp edges at every icon size.
cx, cy = SIZE / 2, SIZE / 2
w, h = 430, 470
left = cx - w / 2
top_y = cy - h / 2
right = cx + w / 2
points = [
    (left, top_y),
    (right, top_y),
    (right, top_y + 92),
    (left + 178, top_y + 92),
    (left + 294, cy),
    (left + 178, top_y + h - 92),
    (right, top_y + h - 92),
    (right, top_y + h),
    (left, top_y + h),
    (left + 200, cy),
]
draw.polygon(points, fill=(248, 250, 252, 255))

# Soft drop shadow beneath the sigma.
shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
ImageDraw.Draw(shadow).polygon(
    [(x + 14, y + 20) for x, y in points], fill=(3, 10, 26, 100)
)
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
body = Image.alpha_composite(Image.alpha_composite(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), shadow), body)
draw = ImageDraw.Draw(body)

# Thin inner edge.
draw.rounded_rectangle((54, 54, SIZE - 54, SIZE - 54), radius=226, outline=(255, 255, 255, 60), width=5)

# Three tiny accent pixels in the top-right, echoing the site's colorful logo.
for x, y, color in [
    (792, 180, (251, 191, 36, 255)),
    (838, 224, (244, 114, 182, 255)),
    (792, 268, (52, 211, 153, 255)),
]:
    draw.rounded_rectangle((x, y, x + 34, y + 34), radius=9, fill=color)

img = Image.alpha_composite(img, body)
img.save(ASSETS / "app-icon.png")

# Preview on a dark canvas for visual inspection.
preview = Image.new("RGBA", (1100, 1100), (7, 11, 20, 255))
preview.alpha_composite(img, (38, 38))
preview.save(ROOT / "shots" / "icon-preview.png")

sizes = [256, 128, 96, 64, 48, 32, 24, 16]
icons = [img.resize((size, size), Image.LANCZOS) for size in sizes]
icons[0].save(ASSETS / "app.ico", format="ICO", sizes=[(s, s) for s in sizes], append_images=icons[1:])
print("wrote", ASSETS / "app.ico")
