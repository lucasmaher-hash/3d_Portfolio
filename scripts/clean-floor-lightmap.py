# Smooths the LED glow along every edge of the gallery floor's lightmap.
# The LED strips sit right at the floor edges (outer perimeter, inner ring, the five
# podium wells). The bake put their glow onto the floor as a bright band a few texels
# wide, but lumpy: blobs and gaps along the edge that render as cyan splotches where
# the floor meets a wall or a podium (Lucas, 2026-10-24). No rebake: inside a band
# along the floor island's boundary each texel is replaced by the average of the band
# texels at the SAME distance from the edge within a few cm along it. The glow's
# falloff away from the edge is kept, only the lumps along the edge go. Fades back to
# the untouched bake over the band's inner part.
#
#   python3 scripts/clean-floor-lightmap.py <bake>/web-maps/floor.png
# Reads the untouched encoded bake (the encoder's own output, never the cleaned file in
# public/), writes maps/floor.png. Without an argument it falls back to ORIGINAL_REV in git.
import json, subprocess, sys, io
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_REV = 'c42ce82'                      # last commit that wrote the bake's floor.png
MAP = 'public/gallery-baked-assets/maps/floor.png'
RANGE = json.loads((ROOT / 'public/gallery-baked-assets/scene.json').read_text())['lightmaps']['floor']['range']
BAND = 12          # texels (~2.4 cm each) from the edge that get smoothed
FADE = 4           # last texels of the band blend back into the bake
SIGMA = 7          # along-edge smoothing, texels
SS = 4             # supersampling for the island mask

if len(sys.argv) > 1:
    raw = Path(sys.argv[1]).read_bytes()
else:
    raw = subprocess.run(['git', 'show', f'{ORIGINAL_REV}:{MAP}'], cwd=ROOT, capture_output=True, check=True).stdout
a = np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA')).astype(np.float64) / 255
H, W = a.shape[:2]
hdr = a[..., :3] * a[..., 3:4] * RANGE

# Floor top faces in lightmap UV space, from the GLB.
dump = subprocess.run(['node', '--input-type=module', '-e', '''
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
await MeshoptDecoder.ready
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read('public/gallery-baked-assets/gallery.glb')
const out = []
for (const n of doc.getRoot().listNodes()) {
  const e = n.getExtras()
  if (e.galleryBakeLabel !== 'floor' || !n.getMesh()) continue
  for (const p of n.getMesh().listPrimitives()) {
    const uv = p.getAttribute('TEXCOORD_' + (e.galleryBakeUV || 0)), nor = p.getAttribute('NORMAL'), idx = p.getIndices().getArray()
    for (let i = 0; i < idx.length; i += 3) {
      const t = [idx[i], idx[i + 1], idx[i + 2]]
      if (t.some(j => nor.getElement(j, [])[1] < 0.9)) continue
      out.push(t.flatMap(j => uv.getElement(j, [])))
    }
  }
}
process.stdout.write(JSON.stringify(out))
'''], cwd=ROOT, capture_output=True, check=True, text=True).stdout
tris = json.loads(dump)
img = Image.new('L', (W * SS, H * SS), 0)
draw = ImageDraw.Draw(img)
for t in tris:
    draw.polygon([(t[0] * W * SS, t[1] * H * SS), (t[2] * W * SS, t[3] * H * SS), (t[4] * W * SS, t[5] * H * SS)], fill=255)
mask = np.asarray(img.resize((W, H), Image.BOX)) > 127
print(f'floor top: {len(tris)} triangles, {mask.mean() * 100:.1f}% of the map')

dist = nd.distance_transform_edt(mask)              # texels to the island's edge
band = mask & (dist <= BAND)
out = hdr.copy()
bins = np.clip(np.floor(dist * 2).astype(int), 0, BAND * 2)
for b in range(1, BAND * 2 + 1):
    m = (bins == b) & band
    if not m.any(): continue
    w = nd.gaussian_filter(m.astype(np.float64), SIGMA)
    for c in range(3):
        s = nd.gaussian_filter(np.where(m, hdr[..., c], 0), SIGMA)
        out[..., c] = np.where(m, s / np.maximum(w, 1e-9), out[..., c])
blend = np.clip((BAND - dist) / FADE, 0, 1)[..., None] * band[..., None]
out = hdr * (1 - blend) + out * blend
# The padding just outside the island is what bilinear filtering blends in at the
# very edge, and it still holds the old lumps: refill it from the nearest band texel.
# A last 1-texel blur inside the band evens out the texel staircase of the edge
# (it left a row of little dashes along it).
bm = band.astype(np.float64); wb = nd.gaussian_filter(bm, 1.0)
for c in range(3):
    out[..., c] = np.where(band, nd.gaussian_filter(out[..., c] * bm, 1.0) / np.maximum(wb, 1e-9), out[..., c])
outside, (iy, ix) = nd.distance_transform_edt(~mask, return_indices=True)
pad = ~mask & (outside <= 8)
out[pad] = out[iy[pad], ix[pad]]
band = band | pad

# RGBM encode with the same range (see encode-gallery-hdr.py).
px = np.maximum(out, 0)
mul = np.maximum(np.ceil(px.max(axis=-1) / RANGE * 255) / 255, 1 / 255)
rgb = px / (mul[..., None] * RANGE)
enc = np.round(np.concatenate([rgb, mul[..., None]], -1) * 255).clip(0, 255).astype(np.uint8)
enc[~band] = (a[~band] * 255).round().astype(np.uint8)     # everything outside the band byte-identical
Image.fromarray(enc).save(ROOT / MAP, optimize=True)
lum = lambda x: np.einsum('...c,c->...', x, np.array([.2126, .7152, .0722]))
dev = lambda x: np.abs(lum(x) - nd.median_filter(lum(x), 5))[band].mean()
print(f'band texels: {band.sum()}, along-edge roughness {dev(hdr):.4f} -> {dev(out):.4f} (band + 8 px padding)')
