import * as THREE from 'three'

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

// compileAsync alone does not upload textures/geometry, and transmission draws
// opaque materials with NoToneMapping. Warm BOTH configurations, then draw all
// meshes once so turning toward a new exhibit doesn't do that work mid-walk.
export async function warmGallery(renderer, scene, camera, model, textures) {
  const toneMapping = renderer.toneMapping
  for (const mode of [toneMapping, THREE.NoToneMapping]) {
    renderer.toneMapping = mode
    try {
      let timeout
      await Promise.race([
        renderer.compileAsync(scene, camera),
        new Promise(resolve => { timeout = setTimeout(resolve, 4000) }),
      ]).finally(() => clearTimeout(timeout))
    } finally {
      renderer.toneMapping = toneMapping
    }
  }

  const pending = new Set(textures)
  scene.traverse(object => {
    for (const material of [object.material].flat()) {
      if (!material) continue
      for (const value of Object.values(material)) if (value?.isTexture) pending.add(value)
    }
  })
  let batchStart = performance.now()
  for (const texture of pending) {
    renderer.initTexture(texture)
    if (performance.now() - batchStart > 8) {
      await nextFrame()
      batchStart = performance.now()
    }
  }

  const drawables = []
  const wasVisible = model.visible
  scene.traverse(object => {
    if (!object.isMesh) return
    drawables.push([object, object.visible, object.frustumCulled])
    object.visible = true
    object.frustumCulled = false
  })
  model.visible = true
  try {
    // Both renders happen in the same task. Only the restored, correct view
    // reaches the compositor; there is no flash of distant arrows/hidden parts.
    renderer.render(scene, camera)
  } finally {
    for (const [object, visible, culled] of drawables) {
      object.visible = visible
      object.frustumCulled = culled
    }
    model.visible = wasVisible
  }
  model.visible = true
  renderer.render(scene, camera)
  await nextFrame()
}
