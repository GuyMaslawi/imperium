# Portrait art tiers

Every character still in `public/` renders through `LivingPortrait`, which picks
the richest tier the art on disk supports. Producing art is the entire job — no
code changes, no lists to update.

```
npm run assets    # rescan public/ and regenerate the manifest
```

`prebuild` runs this too, so a deploy can never ship a manifest that disagrees
with the files beside it.

## The three tiers

| Tier | Needs | What it buys |
|---|---|---|
| **0 — still** | `<name>.jpg` | Breathe-and-drift zoom, pointer lean, embers, halo. Always on. |
| **1 — depth** | `+ <name>-depth.png` | Real 2.5D: the figure separates from its background as the pointer moves, **and breathes on its own** — see below. All 14 portraits have this. |
| **2 — clip** | `+ <name>.webm` (and/or `.mp4`) | Full motion — the portrait actually animates. None yet. |

Tiers stack downward. A portrait with a clip still falls back to the depth map
when the visitor is on a metered connection, and to the still when they have
asked for reduced motion. Nothing ever 404s: the manifest only names files the
build actually found.

Only portraits marked `rich` take tiers 1 and 2 — currently the hero paperdoll,
the city-boss banner, and the selected card in the signup class picker. Small
avatars (sidebar, empire profile, fight reports) stay on tier 0 deliberately;
a 56px frame does not repay a WebGL context or a video download.

## Depth maps (tier 1) — done

All 14 exist. `scripts/make-depth-maps.py` runs Depth Anything V2 over every
still and writes the map beside it, so this is only worth re-reading when new
character art lands:

```sh
python3 -m venv .depthenv
.depthenv/bin/pip install torch transformers pillow numpy
.depthenv/bin/python scripts/make-depth-maps.py          # only missing maps
.depthenv/bin/python scripts/make-depth-maps.py --force  # redo everything
npm run assets
```

It skips stills that already have a map, runs on the GPU via MPS, and takes a
few seconds per portrait. ComfyUI works equally well by hand — **Load Image →
Depth Anything V2 → Save Image**, output greyscale with **white = near**, saved
as `<name>-depth.png` beside the still. PNG, not JPEG: block artifacts in a
depth map show up as ripples along silhouettes.

### The focal plane

The script also records each map's **median depth** into
`scripts/portrait-depth-focus.json`, which `npm run assets` folds into the
manifest as `focus`. That is the depth the shader pins; everything nearer swings
one way and everything further the other.

This matters more than it sounds. These maps' medians run from 0.20 (`varkos`,
`guardian`) to 0.55 (`warlord`) — with a fixed 0.5 the low ones would have had
almost every pixel on the same side of the focal plane, so the portrait would
slide as one plate instead of separating. A hand-authored map with no measured
focus just falls back to 0.5.

If a portrait's parallax pushes the *background* toward you instead of the
figure, that map came out inverted — either flip it, or pass a negative
`depthStrength` for that portrait.

### The figure's own motion

The depth map doubles as a free matte, so the shader can move the *subject*
without touching the scene behind it: the figure swells and contracts on a
~4.6s breath, and a sway that builds toward the foot of the frame stirs cloaks
without nodding heads. No segmentation pass, no video, no extra bytes.

Tuned by `life` on `LivingPortrait` (default 1 ≈ 1.4% swell, 0.8% sway); `0`
holds the figure still. Because only near pixels move, the silhouette samples
from just outside itself, so too large a push drags a halo of background in
with it. Frame diffs stayed clean out to `life={2.5}`, which is the practical
ceiling.

Verified by rendering two frames half a breath apart with the camera drift
parked, then diffing them against the depth map: figure pixels changed **11.9×**
more than background pixels. If you change the shader, re-run that measurement
rather than eyeballing it — the amplitudes are small enough that a bug here
looks like "nothing happened".

## Producing clips (tier 2)

Image-to-video (WAN, LTX-Video, SVD) — 2–4 seconds, seamless loop. Keep the
camera locked and animate only the subject: eyes, breath, cloak, smoke, embers.
A moving camera fights the frame's own drift and reads as a wobble.

Encode small. These are decoration, not content:

```sh
# VP9/webm — the primary
ffmpeg -i in.mp4 -c:v libvpx-vp9 -crf 40 -b:v 0 -an -vf "scale=640:-2" out.webm

# H.264/mp4 — the fallback for older Safari
ffmpeg -i in.mp4 -c:v libx264 -crf 30 -preset slow -an -pix_fmt yuv420p \
  -vf "scale=640:-2" out.mp4
```

`-an` matters: the clips are muted anyway, and an audio track is dead weight.

**Budget.** Aim for **≤ 500 KB per clip**. All 14 at that size is ~7 MB, which
on Vercel's free tier is a real number if the boss banner is on a page players
reload constantly. Ship the four hero classes first — a player sees their own
class on every visit to `/game/hero`, while any given boss is one of ten.

The poster is always the still, so a clip that is slow to arrive costs nothing
visually; the portrait just stays on tier 1 or 0 until it is ready.
