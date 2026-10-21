import * as THREE from 'three'
import './lighting.css'

const STORAGE = 'gallery-lighting-v2'
const names = ['Unify', 'Bottle', 'Mac-Lamp', 'Virtual Cooking', 'Cybercoffee', 'Center room']
const clamp = value => Math.max(0, Math.min(100, value))

export async function prepareLighting(model, settings, scene, renderer, fixtureLights) {
  if (!settings.independentLights) return
  const defaults = { overall: Math.round(settings.exposure * 100), ambient: Math.round(settings.ambientLevel * 100), lights: settings.defaultLightLevels.map(value => Math.round(value * 100)), wallFill: settings.wallFill ?? 65 }
  let saved
  try { saved = JSON.parse(localStorage.getItem(STORAGE)) } catch { /* Storage can be unavailable. */ }
  const state = { ...defaults, lights: [...defaults.lights] }
  if (saved && typeof saved.overall === 'number' && Array.isArray(saved.lights) && saved.lights.length === 6 && saved.lights.every(Number.isFinite)) {
    state.overall = clamp(saved.overall)
    state.wallFill = Number.isFinite(saved.wallFill) ? clamp(saved.wallFill) : defaults.wallFill
    state.ambient = Number.isFinite(saved.ambient) ? clamp(saved.ambient) : defaults.ambient
    state.lights = saved.lights.map(clamp)
  }
  const levels = { value: state.lights.map(value => value / 100) }
  const ambient = { value: state.ambient / 100 }
  const wallFill = { value: state.wallFill / 100 }
  const wallPower = { value: 1 }
  const wallEnabled = { value: 1 }
  const loader = new THREE.TextureLoader()
  const cache = new Map()
  const load = url => {
    if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then(texture => {
      // These external maps use the same glTF UVs as the embedded ambient map.
      texture.flipY = false
      texture.colorSpace = THREE.SRGBColorSpace
      texture.generateMipmaps = true
      return texture
    }))
    return cache.get(url)
  }
  const discs = []
  const rimMaterials = new Map()
  const jobs = []
  model.traverse(mesh => {
    if (!mesh.isMesh) return
    const match = mesh.name.match(/^Ceiling (\d{2}) \|.*luminous diffuser/)
    if (match) {
      mesh.material = mesh.material.clone()
      discs.push({ material: mesh.material, index: Number(match[1]) - 1,
        reference: mesh.material.emissiveIntensity / settings.emitterReferenceLevel })
    }
    if (!match && mesh.userData.galleryRole === 'emitter') for (const material of [mesh.material].flat()) {
      if (!rimMaterials.has(material)) rimMaterials.set(material, material.emissiveIntensity)
    }
    const isPlaster = ['wall', 'podium'].includes(mesh.userData.galleryRole)
    const label = mesh.userData.galleryBakeLabel
    if (!label) return
    jobs.push(Promise.all(names.map((_, index) => load(`/gallery-assets/lightmaps/light-${String(index + 1).padStart(2, '0')}-${label}.jpg?v=walls-v3`))).then(textures => {
      const materials = [mesh.material].flat()
      for (const material of materials) {
        material.onBeforeCompile = shader => {
          shader.uniforms.uGalleryLevels = levels
          shader.uniforms.uGalleryAmbient = ambient
          shader.uniforms.uGalleryWallFill = wallFill
          shader.uniforms.uGalleryWallPower = wallPower
          shader.uniforms.uGalleryWallEnabled = wallEnabled
          for (let i = 0; i < 6; i++) shader.uniforms[`uGalleryLight${i}`] = { value: textures[i] }
          shader.fragmentShader = `uniform float uGalleryWallFill;\nuniform float uGalleryWallPower;\nuniform float uGalleryWallEnabled;\nuniform float uGalleryLevels[6];\nuniform float uGalleryAmbient;\n${textures.map((_, i) => `uniform sampler2D uGalleryLight${i};`).join('\n')}\n` + shader.fragmentShader
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            totalEmissiveRadiance *= uGalleryAmbient;
            ${textures.map((_, i) => `totalEmissiveRadiance += uGalleryLevels[${i}] * texture2D(uGalleryLight${i}, vEmissiveMapUv).rgb;`).join('\n')}
            ${isPlaster ? 'totalEmissiveRadiance += vec3(0.34, 0.38, 0.35) * uGalleryWallFill * uGalleryWallPower * uGalleryWallEnabled;' : ''}
          `)
        }
        material.customProgramCacheKey = () => isPlaster ? 'gallery-wall-fill-v3' : 'gallery-six-lightmaps-v2'
        material.needsUpdate = true
      }
    }))
  })
  await Promise.all(jobs)

  function apply() {
    renderer.toneMappingExposure = state.overall / 100
    ambient.value = state.ambient / 100
    wallFill.value = state.wallFill / 100
    for (let i = 0; i < 6; i++) {
      levels.value[i] = state.lights[i] / 100
      fixtureLights[i].intensity = 75 * levels.value[i]
    }
    wallPower.value = levels.value.reduce((a,b) => a+b, 0) / 3 + ambient.value * .7
    for (const [material, reference] of rimMaterials) material.emissiveIntensity = reference * ambient.value
    scene.environmentIntensity = (levels.value.reduce((a,b) => a+b, 0) / 6 + ambient.value / 2) * 2
    for (const disc of discs) disc.material.emissiveIntensity = disc.reference * levels.value[disc.index]
    try { localStorage.setItem(STORAGE, JSON.stringify(state)) } catch { /* Keep live control working. */ }
  }
  apply()

  const panel = document.createElement('section')
  panel.className = 'gallery-light-panel'
  panel.setAttribute('aria-label', 'Gallery lighting controls')
  panel.innerHTML = `
    <button class="gallery-light-toggle" type="button" aria-expanded="true" aria-controls="gallery-light-body">Lighting <span aria-hidden="true">−</span></button>
    <div id="gallery-light-body" class="gallery-light-body">
      <p>Adjust the room live. Settings save on this device.</p>
      <div class="gallery-light-rows"></div>
      <button class="gallery-light-reset" type="button">Reset to darker defaults</button>
    </div>`
  const rows = panel.querySelector('.gallery-light-rows')
  const controls = []
  function add(label, key, index) {
    const row = document.createElement('label')
    row.className = 'gallery-light-row'
    row.innerHTML = `<span>${label}</span><output></output><input type="range" min="0" max="100" step="1" aria-label="${label}">`
    const input = row.querySelector('input'), output = row.querySelector('output')
    const read = () => index === undefined ? state[key] : state.lights[index]
    const sync = () => { input.value = read(); output.value = `${read()}%`; input.setAttribute('aria-valuetext', `${read()} percent`) }
    input.addEventListener('input', () => {
      const value = Number(input.value)
      if (index === undefined) state[key] = value
      else state.lights[index] = value
      sync(); apply()
    })
    sync(); controls.push(sync); rows.append(row)
  }
  add('Overall brightness', 'overall')
  add('Rim & ambient', 'ambient')
  add('Wall fill', 'wallFill')
  names.forEach((name, i) => add(`${String(i + 1).padStart(2, '0')} · ${name}`, 'lights', i))
  const toggle = panel.querySelector('.gallery-light-toggle')
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(expanded))
    panel.querySelector('.gallery-light-body').hidden = !expanded
    toggle.querySelector('span').textContent = expanded ? '−' : '+'
  })
  panel.querySelector('.gallery-light-reset').addEventListener('click', () => {
    state.overall = defaults.overall; state.ambient = defaults.ambient; state.wallFill = defaults.wallFill; state.lights = [...defaults.lights]
    controls.forEach(sync => sync()); apply()
  })
  // Native slider arrow keys must not also trigger walking or camera shortcuts.
  for (const event of ['keydown', 'keyup', 'pointerdown', 'touchstart']) panel.addEventListener(event, e => e.stopPropagation())
  document.body.append(panel)
  return { state, apply, setWallPreview: enabled => { wallEnabled.value = enabled ? 1 : 0 } }
}
