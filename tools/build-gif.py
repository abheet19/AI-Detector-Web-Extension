#!/usr/bin/env python3
"""build-gif.py — assemble the PNG frames from record-demo.mjs into the README GIF.

Usage:  python tools/build-gif.py [framesDir] [outGif]

Two things keep the file small enough for a README (<4MB) without visible loss:

  * one shared 256-colour palette quantised from a sample of frames, so GIF
    inter-frame compression can actually diff successive frames, and
  * dithering OFF. Floyd-Steinberg dither sprays per-pixel noise across the flat
    dark rose UI, which defeats that compression completely (measured on a
    sibling project: 7.99MB dithered vs 2.64MB undithered, same frames).

Requires Pillow (>= 10). ffmpeg is not needed.
"""
import sys
import pathlib
from PIL import Image

FRAMES = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "frames")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "docs/demo/ai-detector-demo.gif")
TARGET_WIDTH = 912       # README hero width
FPS = 8

paths = sorted(FRAMES.glob("f*.png"))
if not paths:
    sys.exit(f"no frames in {FRAMES}")

frames = []
for p in paths:
    im = Image.open(p).convert("RGB")
    h = round(im.height * TARGET_WIDTH / im.width)
    frames.append(im.resize((TARGET_WIDTH, h), Image.LANCZOS))

# Build one palette from a spread of frames so colours never shift mid-clip.
sample = frames[:: max(1, len(frames) // 24)]
strip = Image.new("RGB", (frames[0].width, frames[0].height * len(sample)))
for i, f in enumerate(sample):
    strip.paste(f, (0, i * frames[0].height))
palette = strip.quantize(colors=256, method=Image.MEDIANCUT)

# dither=Image.Dither.NONE is the whole trick — see the module docstring.
quantised = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]

# Every captured frame is nominally FPS-spaced, but record-demo.mjs still holds
# on a result by writing several identical screenshots in a row. Pillow's GIF
# `optimize` pass merges consecutive byte-identical frames on its own — it will
# sum an unbounded run of duplicates into one long-duration frame regardless of
# what we ask for, so the cap has to be enforced explicitly, here, by capping
# how many duplicate frames are allowed to survive into the encoded GIF.
FRAME_MS = round(1000 / FPS)
MAX_HOLD_MS = 1500
MAX_RUN = max(1, MAX_HOLD_MS // FRAME_MS)  # consecutive identical frames allowed

deduped = []
run_bytes = None
run_len = 0
for f in quantised:
    b = f.tobytes()
    if b == run_bytes:
        run_len += 1
        if run_len > MAX_RUN:
            continue  # drop the surplus — the hold is already at the cap
    else:
        run_bytes = b
        run_len = 1
    deduped.append(f)
quantised = deduped
durations = [FRAME_MS] * len(quantised)

OUT.parent.mkdir(parents=True, exist_ok=True)
quantised[0].save(
    OUT,
    save_all=True,
    append_images=quantised[1:],
    duration=durations,
    loop=0,
    optimize=True,
    disposal=1,
)

size = OUT.stat().st_size
print(f"{OUT}  {quantised[0].width}x{quantised[0].height}  "
      f"{len(quantised)} frames @ {FPS}fps  {size/1_048_576:.2f} MB")
if size > 4 * 1_048_576:
    print("WARNING: over the ~4MB README budget — drop frames or TARGET_WIDTH.")
