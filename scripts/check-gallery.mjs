// Structural checks against the actual packaged mesh, not just its settings.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import * as THREE from 'three'

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const assetPath = process.argv[2] || new URL('../public/gallery-assets/gallery.glb', import.meta.url).pathname
const doc = await io.read(assetPath)
const settings = JSON.parse(await fs.readFile(path.join(path.dirname(assetPath), 'scene.json')))
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
// The spawn now sits below the centre light aperture; measure the slab beside it.
const ceiling = cast([3, settings.eyeHeight, 0], [0, 1, 0], 'ceiling')[0]
assert(floor && Math.abs(floor.point.y) < .003, 'Spawn floor must be at Y=0')
assert(ceiling && Math.abs(ceiling.point.y - settings.ceilingHeight) < .005, 'Room height must match the old MainRoom')
assert.equal(settings.fov, 90)
assert.equal(settings.speed, 3.45)
assert(Math.abs(settings.eyeHeight - 1.9386224159559822) < 1e-6)
assert.equal(cast(settings.spawn, [0, 0, 1], 'wall', 8).length, 0, 'Exit must be clear from center along +Z')
const wall = cast(settings.spawn, [1, 0, 0], 'wall', 10)[0]
assert(wall && Math.abs(wall.distance - 6) < .02, 'Circular room must retain its 12 m clear diameter')
assert.equal(nodes.filter(n => n.getName().includes('luminous diffuser')).length, 6)
assert(!nodes.some(n => /SAMPLE|Studio|PATH|Cream Wall/.test(n.getName())), 'No source samples/studio in shipped scene')
// Check the shipped exhibits, including hierarchy transforms and quantization.
// Product width is the maximum horizontal span, rather than an axis-aligned
// box that changes width when a product is turned towards the room centre.
const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
function horizontalSpan(points) {
  points.sort((a,b) => a[0]-b[0] || a[1]-b[1])
  const hull = []
  for (const list of [points, [...points].reverse()]) {
    const side = []
    for (const p of list) {
      while (side.length > 1 && cross(side.at(-2), side.at(-1), p) <= 0) side.pop()
      side.push(p)
    }
    hull.push(...side.slice(0,-1))
  }
  let width = 0
  for (const a of hull) for (const b of hull) width = Math.max(width, Math.hypot(a[0]-b[0], a[1]-b[1]))
  return width
}
const podiums = nodes.filter(n => n.getExtras().galleryRole === 'podium')
assert.equal(podiums.length, 5, 'Five individually fitted podiums must ship')
for (const podium of podiums) {
  const name = podium.getExtras().galleryProject
  const projects = nodes.filter(n => n.getMesh() && n.getExtras().galleryRole === 'project' && n.getExtras().galleryProject === name)
  assert(projects.length, `${name} must be present`)
  const points = []
  for (const project of projects) for (const primitive of project.getMesh().listPrimitives()) {
    const a = primitive.getAttribute('POSITION')
    const positions = new THREE.BufferAttribute(a.getArray(), 3, a.getNormalized())
    const matrix = new THREE.Matrix4().fromArray(project.getWorldMatrix())
    for (let i=0;i<a.getCount();i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix)
      points.push([p.x,p.z])
    }
  }
  const ratio = horizontalSpan(points) / podium.getExtras().top_diameter_m
  const expected = name === 'Double Packaging' ? .425 : .85
  assert(Math.abs(ratio-expected)<.005, `${name} width ratio must be ${expected}; got ${ratio}`)
}
for (const node of nodes.filter(n => n.getName().startsWith('Floor |') || n.getName().startsWith('Ceiling |'))) {
  for (const primitive of node.getMesh().listPrimitives()) {
    assert(Math.abs(primitive.getMaterial().getRoughnessFactor() - .30) < 1e-6, 'Floor and ceiling need the smooth satin finish')
  }
}
assert.equal(settings.surfaceColor, '#376478')
assert.equal(settings.exposure, .56)
assert.equal(cast(settings.spawn, [0, 1, 0], 'ceiling', settings.ceilingHeight + .02).length, 0, 'Centre ceiling aperture must be open')
assert.equal(cast([-14.063158 + 1.2, settings.eyeHeight, -7.915790], [0,-1,0], 'floor').length, 0, 'Floor cutout must follow the wider bottle podium')
const spanX = node => {
  const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix())
  let min = Infinity, max = -Infinity
  for (const primitive of node.getMesh().listPrimitives()) {
    const a = primitive.getAttribute('POSITION')
    const positions = new THREE.BufferAttribute(a.getArray(), 3, a.getNormalized())
    for (let i=0; i<a.getCount(); i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(matrix)
      min = Math.min(min,p.x); max = Math.max(max,p.x)
    }
  }
  return max-min
}
const fixture = index => nodes.find(n => n.getName().startsWith(`Ceiling ${index} |`) && n.getName().includes('luminous diffuser'))
assert(Math.abs(spanX(fixture('06'))/spanX(fixture('03')) - 1.3) < .003, 'Centre light must be 30% wider')
assert(Math.abs(podiums.find(n => n.getExtras().galleryProject === 'Double Packaging').getExtras().top_diameter_m - 1.2059763587)<.001, 'Bottle podium width must be doubled')
const orange = doc.getRoot().listMaterials().find(m => m.getName() === 'Lamp_Orange')
const targetOrange = new THREE.Color('#F56B1D').toArray()
assert(orange && orange.getEmissiveFactor().every((v,i)=>Math.abs(v-targetOrange[i])<1e-5), 'Mac-Lamp orange must be #F56B1D')
const html = await fs.readFile(new URL('../gallery.html', import.meta.url), 'utf8')
assert(html.includes('noindex, nofollow') && !html.includes("location.replace('/2D.html')"))
console.log('PASS: floor, ceiling, eye level, FOV, speed, clear exit, circular wall, six lights, five fitted exhibits, satin blue surfaces, export scope and unlisted direct entry')
