// Builds public/scene-optimized.glb from public/current🟢.glb. Runs as `prebuild`, so every
// production build (and the GitHub Pages deploy, which runs `npm run build`) ships a file made
// from the GLB that is actually in the repo. The dev server never uses it (see PERF.lightGlb
// in src/main.js), so a fresh Blender export shows up in `npm run dev` straight away.
//
// What it does, all of it LOSSLESS for what three.js reads:
//   1. drops COLOR_1 (Blender's `Bleed` attribute; three.js only ever reads COLOR_0),
//   2. drops TEXCOORD_0 on primitives whose material has no texture (only the vaccine label
//      has one; the gradient code in main.js makes its own UVs where it needs them),
//   3. EXT_meshopt_compression without quantisation: byte-exact for every vertex attribute;
//      the index codec may rotate a triangle's three indices (same triangle, same winding).
// Then it reads the result back and compares it with the source, array by array. If anything
// else differs it deletes the output and the site keeps loading the original GLB (main.js
// also falls back on a failed load). It never fails the build.
import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import crypto from 'crypto'
import fs from 'fs'

const SRC = new URL('../public/current🟢.glb', import.meta.url)
const OUT = new URL('../public/scene-optimized.glb', import.meta.url)

function headerJson(path) {
  const b = fs.readFileSync(path)
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString())
}

try {
  const srcBytes = fs.readFileSync(SRC)
  const sha = crypto.createHash('sha256').update(srcBytes).digest('hex')
  if (fs.existsSync(OUT) && headerJson(OUT).asset?.extras?.sourceSha256 === sha) {
    console.log('optimize-glb: up to date')
    process.exit(0)
  }

  await MeshoptEncoder.ready
  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

  const doc = await io.readBinary(new Uint8Array(srcBytes))
  const textured = m => m && (m.getBaseColorTexture() || m.getEmissiveTexture() || m.getNormalTexture() ||
    m.getMetallicRoughnessTexture() || m.getOcclusionTexture())
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    if (p.getAttribute('COLOR_1')) p.setAttribute('COLOR_1', null)
    if (p.getAttribute('TEXCOORD_0') && !textured(p.getMaterial())) p.setAttribute('TEXCOORD_0', null)
  }
  await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR] }))
  doc.createExtension(EXTMeshoptCompression).setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
  const asset = doc.getRoot().getAsset()
  asset.extras = { ...(asset.extras || {}), sourceSha256: sha }
  const outBytes = await io.writeBinary(doc)

  // ── Read back and compare with the source ──
  const A = (await io.readBinary(new Uint8Array(srcBytes))).getRoot()
  const B = (await io.readBinary(outBytes)).getRoot()
  const problems = []
  const near = (x, y) => x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) < 1e-4)
  const an = A.listNodes(), bn = B.listNodes()
  if (an.length !== bn.length) problems.push('node count')
  an.forEach((n, i) => {
    const m = bn[i]
    if (!m || n.getName() !== m.getName()) { problems.push('node ' + n.getName()); return }
    if (!near(n.getTranslation(), m.getTranslation()) || !near(n.getRotation(), m.getRotation()) ||
        !near(n.getScale(), m.getScale())) problems.push('transform ' + n.getName())
    const pa = n.getMesh()?.listPrimitives() || [], pb = m.getMesh()?.listPrimitives() || []
    if (pa.length !== pb.length) { problems.push('primitives ' + n.getName()); return }
    pa.forEach((p, j) => {
      const q = pb[j]
      if (p.getMaterial()?.getName() !== q.getMaterial()?.getName()) problems.push('material ' + n.getName())
      for (const sem of p.listSemantics()) {
        const x = p.getAttribute(sem), y = q.getAttribute(sem)
        if (!y) { if (sem !== 'COLOR_1' && sem !== 'TEXCOORD_0') problems.push(`lost ${sem} ${n.getName()}`); continue }
        const xa = x.getArray(), ya = y.getArray()
        if (xa.constructor !== ya.constructor || xa.length !== ya.length || xa.some((v, k) => !Object.is(v, ya[k])))
          problems.push(`${sem} ${n.getName()}`)
      }
      const xi = p.getIndices()?.getArray(), yi = q.getIndices()?.getArray()
      if (!!xi !== !!yi || (xi && xi.length !== yi.length)) { problems.push('indices ' + n.getName()); return }
      if (xi) for (let t = 0; t < xi.length; t += 3) {
        const a = `${xi[t]},${xi[t + 1]},${xi[t + 2]}`
        if (a !== `${yi[t]},${yi[t + 1]},${yi[t + 2]}` && a !== `${yi[t + 1]},${yi[t + 2]},${yi[t]}` &&
            a !== `${yi[t + 2]},${yi[t]},${yi[t + 1]}`) { problems.push('triangle ' + n.getName()); break }
      }
    })
  })
  if (problems.length) {
    if (fs.existsSync(OUT)) fs.rmSync(OUT)
    console.warn(`optimize-glb: NOT written, ${problems.length} differences (${problems.slice(0, 5).join('; ')}). ` +
                 'The site falls back to current🟢.glb.')
  } else {
    fs.writeFileSync(OUT, outBytes)
    console.log(`optimize-glb: ${(srcBytes.length / 1e6).toFixed(1)} MB -> ${(outBytes.length / 1e6).toFixed(1)} MB, verified`)
  }
} catch (err) {
  try { if (fs.existsSync(OUT)) fs.rmSync(OUT) } catch {}
  console.warn('optimize-glb: skipped (' + (err && err.message || err) + '). The site falls back to current🟢.glb.')
}
