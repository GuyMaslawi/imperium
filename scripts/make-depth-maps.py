"""
Produces the depth maps that upgrade a portrait to the 2.5D tier.

Runs Depth Anything V2 over every character still in public/ and writes a
greyscale `<name>-depth.png` beside each one, which is exactly what
scripts/portrait-assets.mjs looks for. White is near, black is far — the
convention the shader in DepthParallax.tsx expects.

    <venv>/bin/python scripts/make-depth-maps.py [--force] [name ...]
    npm run assets        # then let the manifest see them

Needs torch + transformers + pillow. The model (~100MB for Small) is fetched
once and cached under ~/.cache/huggingface.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageFilter
from transformers import pipeline

ROOT = Path(__file__).resolve().parent.parent
DIRS = ["public/boss", "public/hero/classes"]
STILL_EXT = {".jpg", ".jpeg", ".png", ".webp"}

# Per-portrait focal plane, folded into the manifest by portrait-assets.mjs.
# Build data, not an asset — it never needs to be served.
FOCUS_FILE = ROOT / "scripts/portrait-depth-focus.json"

# Small is the right trade here: these maps drive a gentle parallax, not a
# reconstruction, and the extra fidelity of Large is invisible once the shader
# has smoothed it. Small also runs on CPU in seconds rather than minutes.
MODEL = "depth-anything/Depth-Anything-V2-Small-hf"


def stills():
    for d in DIRS:
        folder = ROOT / d
        if not folder.is_dir():
            continue
        for path in sorted(folder.iterdir()):
            if path.suffix.lower() in STILL_EXT and not path.stem.endswith("-depth"):
                yield path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="stems to process (default: all)")
    ap.add_argument("--force", action="store_true", help="redo existing maps")
    args = ap.parse_args()

    targets = [p for p in stills() if not args.names or p.stem in args.names]
    if not targets:
        print("no matching stills", file=sys.stderr)
        return 1

    todo = [p for p in targets if args.force or not (p.parent / f"{p.stem}-depth.png").exists()]
    if not todo:
        print(f"all {len(targets)} maps already exist — pass --force to redo")
        return 0

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"loading {MODEL} on {device} …")
    estimator = pipeline("depth-estimation", model=MODEL, device=device)

    focus = json.loads(FOCUS_FILE.read_text()) if FOCUS_FILE.exists() else {}

    for path in todo:
        image = Image.open(path).convert("RGB")
        depth = estimator(image)["depth"]

        arr = np.asarray(depth, dtype=np.float32)
        # Normalise per image: the model's raw scale is relative, and stretching
        # each portrait to the full 0–255 range is what keeps the parallax
        # strength consistent from one character to the next.
        lo, hi = float(arr.min()), float(arr.max())
        arr = (arr - lo) / (hi - lo) if hi > lo else np.zeros_like(arr)

        out = Image.fromarray((arr * 255).astype(np.uint8), mode="L")
        out = out.resize(image.size, Image.LANCZOS)
        # A touch of blur costs no visible depth but stops the shader from
        # sampling single-pixel steps, which would shimmer along silhouettes.
        out = out.filter(ImageFilter.GaussianBlur(radius=1.2))

        dest = path.parent / f"{path.stem}-depth.png"
        out.save(dest, optimize=True)

        # The focal plane is the median depth, so half the image swings toward
        # the viewer and half away. A fixed 0.5 would flatten any portrait whose
        # subject does not happen to sit mid-range — and these run 0.20 to 0.55,
        # so most of them would have slid as one plate instead of separating.
        key = f"/{dest.relative_to(ROOT / 'public').as_posix()}"
        focus[key] = round(float(np.median(arr)), 3)

        print(
            f"  {path.relative_to(ROOT)} → {dest.name}  "
            f"({dest.stat().st_size // 1024} KB, focus {focus[key]})"
        )

    FOCUS_FILE.write_text(json.dumps(dict(sorted(focus.items())), indent=2) + "\n")
    print(f"\ndone: {len(todo)} map(s). Now run: npm run assets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
