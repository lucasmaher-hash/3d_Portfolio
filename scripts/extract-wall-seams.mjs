// Finds the vertical panel seams in the gallery walls and writes them to
// public/gallery-baked-assets/wall-seams.json, one entry per seam: [x, z, tx, tz]
// = a point on the seam at mid height and the wall's horizontal tangent there.
// The seams are real V-grooves in the geometry (~8 mm wide), but the bake gave them
// too few lightmap texels to keep their shading, so most read as gone. main.js
// (drawWallSeams) redraws them from these planes. Run after every wall re-export:
//   node scripts/extract-wall-seams.mjs
import fs from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'

await MeshoptDecoder.ready
const root = new URL('../public/gallery-baked-assets/', import.meta.url)
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read(new URL('gallery.glb', root).pathname)

const SLICE = 0.004      // half-height of the horizontal slice the seams are read from
const NEAR = 0.12        // neighbourhood that decides a vertex's panel normal
const SEAM_DOT = 0.8     // |n · panel normal| below this = groove side wall
const CLUSTER = 0.05     // groove vertices closer than this belong to one seam
const PAIR = 0.12        // the 9 cm wall's front and back seam are one plane

function grid(points, cell) {
  const g = new Map()
  points.forEach((p, i) => {
    const k = Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell)
    if (!g.has(k)) g.set(k, []); g.get(k).push(i)
  })
  return (p, r) => {
    const out = [], x0 = Math.floor((p[0] - r) / cell), x1 = Math.floor((p[0] + r) / cell)
    const z0 = Math.floor((p[1] - r) / cell), z1 = Math.floor((p[1] + r) / cell)
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++)
      for (const i of g.get(x + ',' + z) || []) {
        const q = points[i]
        if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 <= r * r) out.push(i)
      }
    return out
  }
}

const result = {}
for (const node of doc.getRoot().listNodes()) {
  const e = node.getExtras()
  if (e.galleryRole !== 'wall' || !node.getMesh()) continue
  const m = new THREE.Matrix4().fromArray(node.getWorldMatrix())
  const nm = new THREE.Matrix3().getNormalMatrix(m)
  const yMid = new THREE.Vector3().setFromMatrixPosition(m).y
  const pts = [], nrm = []
  const v = new THREE.Vector3(), n = new THREE.Vector3()
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL')
    for (let i = 0; i < pos.getCount(); i++) {
      v.fromArray(pos.getElement(i, [])).applyMatrix4(m)
      if (Math.abs(v.y - yMid) > SLICE) continue
      n.fromArray(nor.getElement(i, [])).applyMatrix3(nm).normalize()
      const l = Math.hypot(n.x, n.z)
      if (l < 0.3) continue
      pts.push([v.x, v.z]); nrm.push([n.x / l, n.z / l])
    }
  }
  const near = grid(pts, NEAR)
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
  const panel = pts.map((p, i) => {
    const nb = near(p, NEAR)
    let best = nrm[i], bestCount = -1
    for (const a of nb) {
      let c = 0
      for (const b of nb) if (Math.abs(dot(nrm[a], nrm[b])) > 0.95) c++
      if (c > bestCount) { bestCount = c; best = nrm[a] }
    }
    return best
  })
  const isSeam = pts.map((_, i) => Math.abs(dot(nrm[i], panel[i])) < SEAM_DOT)
  // Union-find the groove vertices into seams.
  const seamIdx = pts.map((_, i) => i).filter(i => isSeam[i])
  const parent = new Map(seamIdx.map(i => [i, i]))
  const find = i => { while (parent.get(i) !== i) { parent.set(i, parent.get(parent.get(i))); i = parent.get(i) } return i }
  const seamNear = grid(seamIdx.map(i => pts[i]), CLUSTER)
  seamIdx.forEach((i, a) => { for (const b of seamNear(pts[i], CLUSTER)) parent.set(find(i), find(seamIdx[b])) })
  const groups = new Map()
  for (const i of seamIdx) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i) }
  let seams = [...groups.values()].map(g => {
    const c = [0, 0]; for (const i of g) { c[0] += pts[i][0] / g.length; c[1] += pts[i][1] / g.length }
    // Tangent from the panel normals around the groove (flat faces, not the groove).
    const ref = panel[g[0]], acc = [0, 0]
    for (const i of near(c, 0.15)) if (!isSeam[i]) { const s = Math.sign(dot(nrm[i], ref)) || 1; acc[0] += nrm[i][0] * s; acc[1] += nrm[i][1] * s }
    const l = Math.hypot(acc[0], acc[1]) || 1
    return [c[0], c[1], -acc[1] / l, acc[0] / l]
  })
  // Front and back face of one wall shell: same plane, keep one.
  const kept = []
  for (const s of seams) {
    const twin = kept.find(k => Math.hypot(k[0] - s[0], k[1] - s[1]) < PAIR && Math.abs(k[2] * s[2] + k[3] * s[3]) > 0.98)
    if (twin) { twin[0] = (twin[0] + s[0]) / 2; twin[1] = (twin[1] + s[1]) / 2 } else kept.push([...s])
  }
  result[e.galleryBakeLabel] = kept.map(s => s.map(x => +x.toFixed(5)))
  console.log(`${node.getName().split(' |')[0]}: ${seams.length} grooves in the slice → ${kept.length} seam planes`)
}
await fs.writeFile(new URL('wall-seams.json', root), JSON.stringify(result))
