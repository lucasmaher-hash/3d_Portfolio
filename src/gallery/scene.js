import * as THREE from 'three'

// This scene retains Blender's origin. No automatic bbox recentering: [0,0,0]
// is the centre of the circular room and its opening faces glTF +Z.
export async function prepareGallery(model, scene, renderer) {
  const response = await fetch('/gallery-assets/scene.json')
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

  const collidables = []
  const floors = []
  model.traverse(mesh => {
    if (!mesh.isMesh) return
    const role = mesh.userData.galleryRole
    if (role === 'wall') collidables.push(mesh)
    if (role === 'floor') floors.push(mesh)
    for (const material of [mesh.material].flat()) {
      // Diffuse illumination is already baked into emissiveMap. Adding room
      // lights would illuminate it twice. The environment supplies specular only.
      if (mesh.userData.galleryBaked) {
        material.color.set(0x000000)
        material.envMapIntensity = role === 'floor' ? 0.45 : 0.025
      }
    }
  })
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
