// Finds the vertical panel seams in the gallery walls and writes them to
// public/gallery-baked-assets/wall-seams.json: per wall, per height level (y in mm),
// the flat list [x, z, x, z, ...] (units of 0.1 mm) of every groove centre in that
// horizontal slice. Grooves are NOT straight planes: both coves flare, so a groove
// drifts up to ~0.65 m sideways between the middle and the floor/ceiling. Straight
// planes drew a second line next to the real groove there.
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

const NEAR = 0.12        // neighbourhood that decides a vertex's panel normal
const SEAM_DOT = 0.8     // |n · panel normal| below this = groove side wall
const CLUSTER = 0.05     // groove vertices closer than this belong to one groove

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
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]

function grooves(pts, nrm) {
  const near = grid(pts, NEAR)
  const seam = pts.map((p, i) => {
    const nb = near(p, NEAR)
    let ref = nrm[i], best = -1
    for (const a of nb) {
      let c = 0
      for (const b of nb) if (Math.abs(dot(nrm[a], nrm[b])) > 0.95) c++
      if (c > best) { best = c; ref = nrm[a] }
    }
    return Math.abs(dot(nrm[i], ref)) < SEAM_DOT
  })
  const idx = pts.map((_, i) => i).filter(i => seam[i])
  const parent = new Map(idx.map(i => [i, i]))
  const find = i => { while (parent.get(i) !== i) { parent.set(i, parent.get(parent.get(i))); i = parent.get(i) } return i }
  const sn = grid(idx.map(i => pts[i]), CLUSTER)
  idx.forEach((i, a) => { for (const b of sn(pts[i], CLUSTER)) parent.set(find(i), find(idx[b])) })
  const groups = new Map()
  for (const i of idx) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i) }
  return [...groups.values()].map(g => {
    const c = [0, 0]; for (const i of g) { c[0] += pts[i][0] / g.length; c[1] += pts[i][1] / g.length }
    return c
  })
}

const result = {}
for (const node of doc.getRoot().listNodes()) {
  const e = node.getExtras()
  if (e.galleryRole !== 'wall' || !node.getMesh()) continue
  const m = new THREE.Matrix4().fromArray(node.getWorldMatrix())
  const nm = new THREE.Matrix3().getNormalMatrix(m)
  const levels = new Map()   // y in mm -> { pts, nrm }
  const v = new THREE.Vector3(), n = new THREE.Vector3()
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL')
    for (let i = 0; i < pos.getCount(); i++) {
      v.fromArray(pos.getElement(i, [])).applyMatrix4(m)
      n.fromArray(nor.getElement(i, [])).applyMatrix3(nm).normalize()
      const l = Math.hypot(n.x, n.z)
      if (l < 0.3) continue
      const key = Math.round(v.y * 1000)
      if (!levels.has(key)) levels.set(key, { pts: [], nrm: [] })
      const L = levels.get(key); L.pts.push([v.x, v.z]); L.nrm.push([n.x / l, n.z / l])
    }
  }
  const out = {}; let total = 0
  for (const [key, L] of levels) {
    if (L.pts.length < 20) continue
    const c = grooves(L.pts, L.nrm)
    if (!c.length) continue
    out[key] = c.flatMap(p => [Math.round(p[0] * 1e4), Math.round(p[1] * 1e4)])
    total += c.length
  }
  result[e.galleryBakeLabel] = out
  console.log(`${node.getName().split(' |')[0]}: ${levels.size} levels, ${Object.keys(out).length} with grooves, ${total} groove points`)
}
await fs.writeFile(new URL('wall-seams.json', root), JSON.stringify(result))
