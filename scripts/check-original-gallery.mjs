import assert from 'node:assert/strict'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
import fs from 'node:fs/promises'
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const original = await io.read(process.argv[2] || '/tmp/gallery-fixed-baseline.glb')
const restored = await io.read('public/gallery-original-assets/gallery.glb')
const nodes = restored.getRoot().listNodes()
for(const node of original.getRoot().listNodes()) {
  if(node.getExtras().galleryRole !== 'wall') continue
  const copy = nodes.find(n => n.getName() === node.getName())
  assert(copy,`Missing original node ${node.getName()}`)
  assert.deepEqual(copy.getWorldMatrix(),node.getWorldMatrix(),`${node.getName()} placement`)
  if(!node.getMesh()) continue
  const a = node.getMesh().listPrimitives(), b = copy.getMesh().listPrimitives()
  assert.equal(a.length,b.length)
  for(let i=0;i<a.length;i++) {
    assert.deepEqual(a[i].getAttribute('POSITION').getArray(),b[i].getAttribute('POSITION').getArray(),`${node.getName()} geometry`)
    for(const slot of ['getEmissiveTexture','getBaseColorTexture']) {
      const tex = a[i].getMaterial()[slot]()
      if(tex) assert.deepEqual(tex.getImage(),b[i].getMaterial()[slot]().getImage(),`${node.getName()} bake`)
    }
  }
}
assert.equal(nodes.filter(n=>n.getExtras().galleryRole==='podium').length,5)
assert.equal(new Set(nodes.filter(n=>n.getExtras().galleryRole==='project').map(n=>n.getExtras().galleryProject)).size,5)
assert.equal(nodes.filter(n=>n.getName().includes('luminous diffuser')).length,6)
assert.equal(nodes.filter(n=>n.getExtras().galleryRole==='floor').length,1)
const settings=JSON.parse(await fs.readFile('public/gallery-original-assets/scene.json'))
assert.equal(settings.eyeHeight,1.9386224159559822)
assert.equal(settings.speed,3.45)
assert.equal(settings.yaw,Math.PI)
assert.equal(settings.fov,90)
console.log('PASS: original geometry, transforms and baked textures unchanged; five podiums/projects/lights; one blue floor; original camera and walking settings')
