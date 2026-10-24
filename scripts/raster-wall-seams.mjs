// Helper for clean-wall-lightmaps.py: rasterises each gallery wall into its lightmap's
// texel grid and writes, per texel, the seam distance (m, interpolated from the vertices
// exactly as the shader sees it) and the world position. Output: <dir>/<label>.bin =
// Float32 [W*H d][W*H x][W*H y][W*H z][W*H nx][W*H ny][W*H nz], d = -1 where no triangle
// covers the texel. The normal is what keeps the cleaner from mixing the wall's front and
// back faces (9 cm apart in world space, but one lit and one dark).
//   node scripts/raster-wall-seams.mjs <outdir>
import fs from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'

await MeshoptDecoder.ready
const root = new URL('../public/gallery-baked-assets/', import.meta.url)
const out = process.argv[2]
const settings = JSON.parse(fs.readFileSync(new URL('scene.json', root)))
const levelsAll = JSON.parse(fs.readFileSync(new URL('wall-seams.json', root)))
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read(new URL('gallery.glb', root).pathname)

const CELL = 0.5, MAX_D = 0.9
for (const node of doc.getRoot().listNodes()) {
  const e = node.getExtras()
  if (e.galleryRole !== 'wall' || !node.getMesh() || !levelsAll[e.galleryBakeLabel]) continue
  const lm = settings.lightmaps[e.galleryBakeLabel], W = lm.width, H = lm.height
  const levels = new Map()
  for (const [key, flat] of Object.entries(levelsAll[e.galleryBakeLabel])) {
    const grid = new Map()
    for (let i = 0; i < flat.length; i += 2) {
      const k = Math.floor(flat[i] / 1e4 / CELL) + ',' + Math.floor(flat[i + 1] / 1e4 / CELL)
      if (!grid.has(k)) grid.set(k, []); grid.get(k).push([flat[i] / 1e4, flat[i + 1] / 1e4])
    }
    levels.set(+key, grid)
  }
  const m = new THREE.Matrix4().fromArray(node.getWorldMatrix())
  const buf = new Float32Array(W * H * 7), S = W * H
  const D = buf.subarray(0, S).fill(-1), X = buf.subarray(S, 2 * S), Y = buf.subarray(2 * S, 3 * S), Z = buf.subarray(3 * S, 4 * S)
  const NX = buf.subarray(4 * S, 5 * S), NY = buf.subarray(5 * S, 6 * S), NZ = buf.subarray(6 * S)
  const nm = new THREE.Matrix3().getNormalMatrix(m)
  for (const prim of node.getMesh().listPrimitives()) {
    const nor = prim.getAttribute('NORMAL'), pos = prim.getAttribute('POSITION'), uvA = prim.getAttribute('TEXCOORD_' + (e.galleryBakeUV || 0)), idx = prim.getIndices().getArray()
    const n = pos.getCount(), P = new Float64Array(n * 3), U = new Float64Array(n * 2), d = new Float64Array(n), N = new Float64Array(n * 3)
    const v = new THREE.Vector3(), nv = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.fromArray(pos.getElement(i, [])).applyMatrix4(m); P.set([v.x, v.y, v.z], i * 3)
      nv.fromArray(nor.getElement(i, [])).applyMatrix3(nm).normalize(); N.set([nv.x, nv.y, nv.z], i * 3)
      const uv = uvA.getElement(i, []); U[i * 2] = uv[0] * W - 0.5; U[i * 2 + 1] = uv[1] * H - 0.5
      const grid = levels.get(Math.round(v.y * 1000)); let best = 10
      if (grid) {
        const gx = Math.floor(v.x / CELL), gz = Math.floor(v.z / CELL)
        for (let x = gx - 1; x <= gx + 1; x++) for (let z = gz - 1; z <= gz + 1; z++)
          for (const p of grid.get(x + ',' + z) || []) { const dd = Math.hypot(v.x - p[0], v.z - p[1]); if (dd < best) best = dd }
        if (best > MAX_D) best = 10
      }
      d[i] = best
    }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2]
      const ax = U[a * 2], ay = U[a * 2 + 1], bx = U[b * 2], by = U[b * 2 + 1], cx = U[c * 2], cy = U[c * 2 + 1]
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
      if (Math.abs(den) < 1e-12) continue
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)))
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)))
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const l0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den
        const l1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den
        const l2 = 1 - l0 - l1
        if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue
        const k = y * W + x
        D[k] = l0 * d[a] + l1 * d[b] + l2 * d[c]
        X[k] = l0 * P[a * 3] + l1 * P[b * 3] + l2 * P[c * 3]
        Y[k] = l0 * P[a * 3 + 1] + l1 * P[b * 3 + 1] + l2 * P[c * 3 + 1]
        Z[k] = l0 * P[a * 3 + 2] + l1 * P[b * 3 + 2] + l2 * P[c * 3 + 2]
        NX[k] = l0 * N[a * 3] + l1 * N[b * 3] + l2 * N[c * 3]
        NY[k] = l0 * N[a * 3 + 1] + l1 * N[b * 3 + 1] + l2 * N[c * 3 + 1]
        NZ[k] = l0 * N[a * 3 + 2] + l1 * N[b * 3 + 2] + l2 * N[c * 3 + 2]
      }
    }
  }
  fs.writeFileSync(`${out}/${e.galleryBakeLabel}.bin`, Buffer.from(buf.buffer))
  let cov = 0, near = 0; for (let k = 0; k < W * H; k++) { if (D[k] >= 0) { cov++; if (D[k] < 0.06) near++ } }
  console.log(`${e.galleryBakeLabel}: ${W}x${H}, covered ${(cov / W / H * 100).toFixed(1)}%, within 6 cm of a seam ${(near / cov * 100).toFixed(1)}%`)
}
