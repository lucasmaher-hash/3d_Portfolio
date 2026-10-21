import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
const backup = '/Users/lucasmaher/TEMP/glb-backups/gallery-floor-ceiling-approved'
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
const basis = JSON.parse(await fs.readFile(`${backup}/slab-hashes.json`))
for (const [name, expected] of Object.entries(basis)) assert.equal(hash(await fs.readFile(`public/gallery-assets/lightmaps/${name}`)), expected, `Approved slab lighting changed: ${name}`)
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const before = await io.read(`${backup}/gallery.glb`), after = await io.read('public/gallery-assets/gallery.glb')
for (const prefix of ['Floor |', 'Ceiling |']) {
 const material = doc => doc.getRoot().listNodes().find(node=>node.getName().startsWith(prefix)).getMesh().listPrimitives()[0].getMaterial()
 const a=material(before), b=material(after)
 assert.equal(hash(a.getEmissiveTexture().getImage()), hash(b.getEmissiveTexture().getImage()), 'Approved ambient texture must stay identical')
 assert.equal(a.getRoughnessFactor(), b.getRoughnessFactor())
 assert.deepEqual(a.getEmissiveFactor(), b.getEmissiveFactor())
}
console.log('PASS: all 12 floor/ceiling light fields, embedded ambient images and satin material values remain identical')
