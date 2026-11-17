# usage: python sheet.py <dir> <prefix> <frames,...> <out_prefix>  -> 6x2 contact sheets with frame labels
import sys
from PIL import Image, ImageDraw
d, pre, frames, outp = sys.argv[1], sys.argv[2], sys.argv[3].split(","), sys.argv[4]
ims = []
for f in frames:
    try: im = Image.open(f"{d}/{pre}{f}.jpg").resize((270, 480))
    except FileNotFoundError: continue
    dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 60, 16], fill="black"); dr.text((3, 2), f, fill="yellow"); ims.append(im)
for n in range(0, len(ims), 12):
    ch = ims[n:n + 12]; sh = Image.new("RGB", (6 * 274, 2 * 484), "black")
    for i, im in enumerate(ch): sh.paste(im, ((i % 6) * 274, (i // 6) * 484))
    sh.save(f"{outp}{n // 12}.jpg", quality=85)
print((len(ims) + 11) // 12, "sheets")
