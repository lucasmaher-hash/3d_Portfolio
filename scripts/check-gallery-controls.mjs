import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

const settings = JSON.parse(await fs.readFile('public/gallery-assets/scene.json'))
assert.equal(settings.independentLights, true)
assert.deepEqual(settings.defaultLightLevels, [.41,.30,.25,.25,.25,.25])
assert.equal(settings.exposure, .56)
assert.equal(settings.ambientLevel, .59)
await MeshoptDecoder.ready
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read('public/gallery-assets/gallery.glb')
const labels = [...new Set(doc.getRoot().listNodes().map(node => node.getExtras().galleryBakeLabel).filter(Boolean))]
assert.equal(labels.length, 15)
const floorHashes = new Set()
for (const label of labels) for (let light = 1; light <= 6; light++) {
  const file = `public/gallery-assets/lightmaps/light-${String(light).padStart(2,'0')}-${label}.jpg`
  const bytes = await fs.readFile(file)
  const metadata = await sharp(bytes).metadata()
  assert(metadata.width >= 128 && metadata.height >= 128, `Valid lightmap required: ${file}`)
  if (label === 'floor') {
    floorHashes.add(crypto.createHash('sha256').update(bytes).digest('hex'))
    const stats = await sharp(bytes).stats()
    assert(stats.channels.some(channel => channel.max > 30), `Light ${light} must illuminate the floor`)
  }
}
assert.equal(floorHashes.size, 6, 'Each source needs a distinct illumination field')
console.log('PASS: six distinct ceiling-light fields, 90 usable maps, ambient separation and darker defaults')
