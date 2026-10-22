import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import * as THREE from 'three'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { GALLERY_PROJECTS, GALLERY_RETURN_STATE_KEY, prepareGalleryProjectInteractions,
  readGalleryReturnPose } from '../src/gallery/project-interactions.js'

// Exercise the actual old portfolio animation, rather than a test imitation.
const source = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8')
const animationSource = source.slice(source.indexOf('function startPop('), source.indexOf('// ── ?perf readout'))
assert(animationSource.includes('function updatePops('))
const animation = { THREE, POP_SCALE: 1.15, POP_DURATION: .28, popAnims: [], renderer: { shadowMap: {} } }
vm.runInNewContext(animationSource, animation)

// Decode the real retained gallery, including the exact multipart web bottle.
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const document = await io.readBinary(execFileSync('git', ['show', 'gallery-third-preserved-2026-10-22:public/gallery-original-assets/gallery.glb'], { maxBuffer: 100 * 1024 * 1024 }))
const scene = new THREE.Scene(), model = new THREE.Group()
scene.add(model)
for (const node of document.getRoot().listNodes()) {
  if (!node.getMesh()) continue
  const group = new THREE.Group()
  group.name = node.getName().replace(/\s/g, '_')
  group.userData = node.getExtras()
  new THREE.Matrix4().fromArray(node.getWorldMatrix()).decompose(group.position, group.quaternion, group.scale)
  for (const primitive of node.getMesh().listPrimitives()) {
    const a = primitive.getAttribute('POSITION')
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(a.getArray(), 3, a.getNormalized()))
    group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()))
  }
  model.add(group)
}
const clickables = [], projectArrows = [], arrowMaterial = new THREE.MeshStandardMaterial()
const bindings = prepareGalleryProjectInteractions({ roots: [model], scene, clickables, projectArrows, arrowMaterial })
assert.equal(bindings.members.size, 5)
assert.equal(projectArrows.length, 4, 'Preserve old no-arrow decision for Unify')
assert.equal(bindings.members.get('Double Packaging').length, 3, 'Bottle body, lid and label form one pop')
assert.equal(bindings.members.get('Mac-Lamp').length, 6, 'All six lamp pieces form one pop')
for (const project of GALLERY_PROJECTS) {
  const mesh = bindings.members.get(project.title)[0]
  const pop = bindings.resolvePopTargets(mesh)
  assert.equal(pop.bottom, project.bottom)
  const bounds = () => {
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3()
    for (const part of pop.targets) box.union(new THREE.Box3().setFromObject(part))
    return box
  }
  const before = bounds()
  const rest = pop.targets.map(mesh => ({ position: mesh.position.clone(), scale: mesh.scale.clone() }))
  animation.startPop(pop.targets, null, pop.bottom)
  animation.updatePops(.14)
  const peak = bounds()
  if (project.bottom) assert(Math.abs(peak.min.y - before.min.y) < 1e-6, `${project.title} must stay above its podium`)
  else assert(Math.abs(peak.getCenter(new THREE.Vector3()).y - before.getCenter(new THREE.Vector3()).y) < 1e-6)
  assert(Math.abs(peak.getSize(new THREE.Vector3()).y / before.getSize(new THREE.Vector3()).y - 1.15) < 1e-6)
  animation.updatePops(.14)
  pop.targets.forEach((mesh, i) => {
    assert(mesh.position.equals(rest[i].position)); assert(mesh.scale.equals(rest[i].scale))
  })
}
const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
const pose = { x: 1, y: 1.9386, z: 2, yaw: .5, pitch: -.1 }
for (const project of GALLERY_PROJECTS) {
  bindings.resetNavigation()
  const mesh = bindings.members.get(project.title)[0]
  let navigations = 0
  const activate = () => bindings.activate(mesh, { startPop: animation.startPop, readPose: () => pose, storage,
    navigate: (url, direction) => { navigations++; assert.equal(url, `${project.url}?from=3d&scene=gallery-baked`); assert.equal(direction, 'left') } })
  assert(activate()); assert(activate())
  assert.equal(navigations, 0)
  animation.updatePops(.14); assert.equal(navigations, 0)
  animation.updatePops(.14); assert.equal(navigations, 1, 'Navigate once after the old pulse finishes')
  assert.deepEqual(readGalleryReturnPose(storage), pose)
}
storage.setItem(GALLERY_RETURN_STATE_KEY, '{invalid')
assert.equal(readGalleryReturnPose(storage), null)
storage.setItem(GALLERY_RETURN_STATE_KEY, JSON.stringify({ ...pose, x: null }))
assert.equal(readGalleryReturnPose(storage), null)
const podium = model.children.find(node => node.userData.galleryRole === 'podium').children[0]
assert.equal(bindings.resolvePopTargets(podium), null, 'Podiums themselves must not navigate')
for (const { mesh, baseY } of projectArrows) {
  assert.equal(bindings.resolvePopTargets(mesh).targets[0], mesh)
  assert.equal(mesh.position.y, baseY)
}
bindings.dispose()
assert.equal(clickables.length, 0); assert.equal(projectArrows.length, 0)

// Test the actual shared Exit script up to its button creation; unrelated DOM
// styling/scroll behaviour below that point remains the original implementation.
const exit = await fs.readFile(new URL('../public/js/exit-3d.js', import.meta.url), 'utf8')
for (const [search, expected] of [['?from=3d', '/'], ['?from=3d&scene=gallery-baked', '/gallery-4.html'],
  ['?from=3d&scene=https://example.com', '/'], ['?from=2d', null]]) {
  const appended = []
  const document = { getElementById: () => null, querySelector: () => null,
    createElement: () => ({ style: {} }), head: { appendChild() {} }, body: { appendChild: node => appended.push(node) } }
  vm.runInNewContext(exit.slice(0, exit.indexOf('  // Same button-pop')) + '\n})();', { document, location: { search }, URLSearchParams })
  assert.equal(appended[0]?.href ?? null, expected)
}
console.log('PASS: five real project groups, original pulse timing/scale, seated bottoms fixed, four old-style arrows, deferred single navigation, camera return storage and fourth-only Exit routing')
