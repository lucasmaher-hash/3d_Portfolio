import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import sharp from 'sharp'
import * as THREE from 'three'

await MeshoptDecoder.ready
const path = process.argv[2] || 'public/gallery-assets/gallery.glb'
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read(path)
const node = doc.getRoot().listNodes().find(n => n.getName().startsWith('Inner Ring |'))
const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix())
let tested = 0, discontinuous = 0, maximum = 0
for (const primitive of node.getMesh().listPrimitives()) {
  const texture = primitive.getMaterial().getEmissiveTexture()
  if (!texture) continue
  const { data, info } = await sharp(texture.getImage()).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const a = primitive.getAttribute('POSITION'), t = primitive.getAttribute('TEXCOORD_0')
  const position = new THREE.BufferAttribute(a.getArray(), 3, a.getNormalized())
  const uv = new THREE.BufferAttribute(t.getArray(), 2, t.getNormalized())
  const indices = primitive.getIndices().getArray()
  const sample = index => {
    const x = Math.max(0, Math.min(info.width - 1, Math.round(uv.getX(index) * (info.width - 1))))
    const y = Math.max(0, Math.min(info.height - 1, Math.round(uv.getY(index) * (info.height - 1))))
    const offset = (y * info.width + x) * info.channels
    return [...data.subarray(offset, offset + 3)].map(x => x / 255)
  }
  for (let i = 0; i < indices.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const ai = indices[i + j], bi = indices[i + (j + 1) % 3]
      const pa = new THREE.Vector3().fromBufferAttribute(position, ai).applyMatrix4(matrix)
      const pb = new THREE.Vector3().fromBufferAttribute(position, bi).applyMatrix4(matrix)
      const distance = pa.distanceTo(pb)
      // Limit the check to the crown itself; the lower curved profile includes
      // intentional narrow grooves with real shadow transitions.
      // Compare along level rim edges. Across the rounded profile, the centre
      // light creates legitimate gradients as the surface turns away from it.
      // Physically adjacent points along the crown should not alternate between
      // dark and light. This catches the mottled rim in the reported screenshots.
      if (pa.y < 4.86 || pb.y < 4.86 || distance < .005 || distance > .15 || Math.abs(pa.y - pb.y) > .0005) continue
      const ca = sample(ai), cb = sample(bi)
      const delta = Math.max(...ca.map((x, c) => Math.abs(x - cb[c])))
      tested++; maximum = Math.max(maximum, delta)
      if (delta > .14) discontinuous++
    }
  }
}
console.log(JSON.stringify({ testedRimEdges: tested, abruptColorEdges: discontinuous, maximumJump: maximum }))
if (!tested || discontinuous > 12) {
  console.error('FAIL: visible discontinuities in the baked inner-room crown')
  process.exitCode = 1
} else console.log('PASS: inner-room crown lighting is continuous')
