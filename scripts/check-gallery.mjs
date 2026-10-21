// Structural checks against the actual packaged mesh, not just its settings.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(new URL('../public/gallery-assets/gallery.glb', import.meta.url).pathname)
const settings = JSON.parse(await fs.readFile(new URL('../public/gallery-assets/scene.json', import.meta.url)))
const targets = []
const nodes = doc.getRoot().listNodes()
for (const node of nodes) {
  const role = node.getExtras().galleryRole
  if (!node.getMesh() || !['wall', 'floor', 'ceiling'].includes(role)) continue
  for (const primitive of node.getMesh().listPrimitives()) {
    const geometry = new THREE.BufferGeometry()
    const positions = primitive.getAttribute('POSITION')
    // glTF quantized attributes need their declared normalized flag.
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.getArray(), 3, positions.getNormalized()))
    if (primitive.getIndices()) geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1))
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    mesh.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()))
    mesh.updateMatrixWorld(true)
    mesh.userData.role = role
    targets.push(mesh)
  }
}
const cast = (position, direction, role, far = 100) => new THREE.Raycaster(
  new THREE.Vector3(...position), new THREE.Vector3(...direction), 0, far,
).intersectObjects(targets.filter(m => m.userData.role === role), false)
const floor = cast(settings.spawn, [0, -1, 0], 'floor')[0]
const ceiling = cast(settings.spawn, [0, 1, 0], 'ceiling')[0]
assert(floor && Math.abs(floor.point.y) < .003, 'Spawn floor must be at Y=0')
assert(ceiling && Math.abs(ceiling.point.y - settings.ceilingHeight) < .005, 'Room height must match the old MainRoom')
assert.equal(settings.fov, 90)
assert.equal(settings.speed, 3.45)
assert(Math.abs(settings.eyeHeight - 1.9386224159559822) < 1e-6)
assert.equal(cast(settings.spawn, [0, 0, 1], 'wall', 8).length, 0, 'Exit must be clear from center along +Z')
const wall = cast(settings.spawn, [1, 0, 0], 'wall', 10)[0]
assert(wall && Math.abs(wall.distance - 6) < .02, 'Circular room must retain its 12 m clear diameter')
assert.equal(nodes.filter(n => n.getName().includes('luminous diffuser')).length, 5)
assert(!nodes.some(n => /SAMPLE|Studio|PATH|Cream Wall/.test(n.getName())), 'No source samples/studio in shipped scene')
const html = await fs.readFile(new URL('../gallery.html', import.meta.url), 'utf8')
assert(html.includes('noindex, nofollow') && !html.includes("location.replace('/2D.html')"))
console.log('PASS: floor, ceiling, eye level, FOV, speed, clear exit, circular wall, five lights, export scope and unlisted direct entry')
