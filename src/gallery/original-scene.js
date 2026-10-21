import * as THREE from 'three'
import { finishCeilingRecesses } from './ceiling-recesses.js'

// This scene retains Blender's origin. No automatic bbox recentering: [0,0,0]
// is the centre of the circular room and its opening faces glTF +Z.
export async function prepareOriginalGallery(model, scene, renderer) {
  const response = await fetch('/gallery-original-assets/scene.json')
  if (!response.ok) throw new Error(`Gallery settings: HTTP ${response.status}`)
  const settings = await response.json()
  for (const child of [...scene.children]) if (child.isLight) scene.remove(child)
  scene.fog = null
  scene.background = new THREE.Color(0x071012)
  scene.environment = null
  renderer.shadowMap.enabled = false
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1
  renderer.domElement.tabIndex = 0
  renderer.domElement.addEventListener('pointerdown', () => renderer.domElement.focus({ preventScroll: true }))

  finishCeilingRecesses(model, settings)

  const collidables = []
  const floors = []
  model.traverse(mesh => {
    if (!mesh.isMesh) return
    const role = mesh.userData.galleryRole
    if (role === 'wall' || role === 'podium') collidables.push(mesh)
    if (role === 'floor' || mesh.userData.galleryBakeLabel === 'ceiling') floors.push(mesh)
    for (const material of [mesh.material].flat()) {
      // Diffuse illumination is already baked into emissiveMap. Adding room
      // lights would illuminate it twice. The environment supplies specular only.
      if (mesh.userData.galleryBaked) {
        material.color.set(0x000000)
        material.envMapIntensity = (role === 'floor' || mesh.userData.galleryBakeLabel === 'ceiling') ? 0.08 : 0.025
      }
    }
  })
  // Only the newly added PBR exhibits need realtime diffuse illumination.
  // Restrict these lights to their layer so the original baked room is unchanged.
  const exhibitLayer = 3
  model.traverse(mesh => { if (mesh.isMesh && mesh.userData.galleryRole === 'project') mesh.layers.enable(exhibitLayer) })
  for (const [x,z,y] of settings.fixtures) {
    const light = new THREE.SpotLight(0xc7fff0, 75, 12, Math.PI/3, .8, 2)
    light.layers.set(exhibitLayer)
    light.position.set(x,y,z)
    light.target.position.set(x,0,z)
    scene.add(light, light.target)
  }
  scene.add(model)
  model.updateMatrixWorld(true)

  // A local reflection probe sees the actual baked room and luminous fixtures.
  // Hide the floor during capture so it cannot reflect itself recursively.
  const cubeTarget = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
  const probe = new THREE.CubeCamera(0.1, 100, cubeTarget)
  probe.position.set(0, settings.eyeHeight, 0)
  for (const floor of floors) floor.visible = false
  probe.update(renderer, scene)
  for (const floor of floors) floor.visible = true
  const pmrem = new THREE.PMREMGenerator(renderer)
  const reflection = pmrem.fromCubemap(cubeTarget.texture)
  scene.environment = reflection.texture
  scene.environmentIntensity = 1
  cubeTarget.dispose()
  pmrem.dispose()

  return { settings, collidables }
}
