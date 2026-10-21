import * as THREE from 'three'
import { prepareLighting } from './lighting.js'

// This scene retains Blender's origin. No automatic bbox recentering: [0,0,0]
// is the centre of the circular room and its opening faces glTF +Z.
export async function prepareGallery(model, scene, renderer) {
  const response = await fetch('/gallery-assets/scene.json?v=20261021-walls-v3')
  if (!response.ok) throw new Error(`Gallery settings: HTTP ${response.status}`)
  const settings = await response.json()
  for (const child of [...scene.children]) if (child.isLight) scene.remove(child)
  scene.fog = null
  scene.background = new THREE.Color(0x071012)
  scene.environment = null
  renderer.shadowMap.enabled = false
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = settings.exposure ?? 1
  renderer.domElement.tabIndex = 0
  renderer.domElement.addEventListener('pointerdown', () => renderer.domElement.focus({ preventScroll: true }))

  const collidables = []
  const reflectiveSlabs = []
  model.traverse(mesh => {
    if (!mesh.isMesh) return
    const role = mesh.userData.galleryRole
    if (role === 'wall' || role === 'podium') collidables.push(mesh)
    if (role === 'floor' || mesh.name.startsWith('Ceiling |')) reflectiveSlabs.push(mesh)
    for (const material of [mesh.material].flat()) {
      // Diffuse illumination is already baked into emissiveMap. Adding room
      // lights would illuminate it twice. The environment supplies specular only.
      if (mesh.userData.galleryBaked) {
        material.color.set(0x000000)
        material.envMapIntensity = (role === 'floor' || mesh.name.startsWith('Ceiling |')) ? 0.08 : 0.015
      }
    }
  })
  // Exhibits retain their PBR materials. Baked architecture has black diffuse
  // albedo, so these lights add specular highlights without doubling its bake.
  const fixtureLights = []
  for (const [x, z, y] of settings.fixtures || []) {
    const light = new THREE.SpotLight(0xc7fff0, 75, 12, Math.PI / 3, .8, 2)
    light.position.set(x, y, z)
    light.target.position.set(x, 0, z)
    scene.add(light, light.target)
    fixtureLights.push(light)
  }
  const lighting = await prepareLighting(model, settings, scene, renderer, fixtureLights)
  scene.add(model)
  model.updateMatrixWorld(true)

  // A local reflection probe sees the actual baked room and luminous fixtures.
  // Hide the glossy slabs during capture to avoid self-reflection.
  const cubeTarget = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
  const probe = new THREE.CubeCamera(0.1, 100, cubeTarget)
  probe.position.set(0, settings.eyeHeight, 0)
  for (const slab of reflectiveSlabs) slab.visible = false
  // Keep the approved floor/ceiling reflection level independent of wall fill.
  lighting?.setWallPreview(false)
  probe.update(renderer, scene)
  lighting?.setWallPreview(true)
  for (const slab of reflectiveSlabs) slab.visible = true
  const pmrem = new THREE.PMREMGenerator(renderer)
  const reflection = pmrem.fromCubemap(cubeTarget.texture)
  scene.environment = reflection.texture
  scene.environmentIntensity = 1
  cubeTarget.dispose()
  pmrem.dispose()

  return { settings, collidables, lighting }
}
