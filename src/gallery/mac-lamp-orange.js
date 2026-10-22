import * as THREE from 'three'

// Mac-Lamp's orange parts: rounded convex edges + translucent orange (2026-10-22, Lucas).
//
// Geometry: public/models/mac-lamp-orange-rounded.glb holds ONLY the two orange meshes, in the
// same local space as gallery.glb (same node transforms), with every convex edge (> 30°)
// bevelled 0.010 local units (~7 mm in the scene), 4 segments, hardened normals. Concave edges
// are untouched. Built by scripts/mac-lamp/: extract-orange.mjs pulls the two meshes out of
// gallery.glb, bevel-orange.py rounds them in a headless Blender. gallery.glb itself is not
// touched — if it is re-exported with different lamp geometry, re-run both scripts.
//
// Material: the authored Lamp_Orange is a black metal whose colour is all emissive glow, so
// lowering opacity alone would read as grey ghost-metal. It becomes an orange dielectric with
// part of the glow kept, then transparent. depthWrite off so the two parts never punch holes
// into each other; FrontSide so a part does not show its own inside walls.
export const LAMP_ORANGE = { opacity: 0.6, glow: 0.35, roughness: 0.3 }

const NAMES = ['Base_Orange_Table', 'VerticalPlate_Orange_Table']
const ORANGE = new THREE.Color().setRGB(0.913, 0.147, 0.0123)   // the authored emissive colour

export async function roundAndTintMacLamp(model, gltfLoader) {
  const targets = NAMES.map(n => model.getObjectByName(n)).filter(o => o && o.isMesh)
  try {
    const rounded = (await gltfLoader.loadAsync('/models/mac-lamp-orange-rounded.glb?v=1')).scene
    for (const mesh of targets) {
      const src = rounded.getObjectByName(mesh.name)
      if (!src || !src.isMesh) continue
      mesh.geometry.dispose()
      mesh.geometry = src.geometry
    }
  } catch (err) {
    console.warn('Mac-Lamp: rounded geometry not loaded, keeping the original edges', err)
  }
  const materials = targets.flatMap(m => [m.material].flat())
  for (const mat of materials) {
    mat.color.copy(ORANGE)
    mat.metalness = 0
    mat.emissive.copy(ORANGE)
    mat.transparent = true
    mat.depthWrite = false
    mat.side = THREE.FrontSide
    mat.needsUpdate = true
  }
  const apply = () => {
    for (const mat of materials) {
      mat.opacity = LAMP_ORANGE.opacity
      mat.emissiveIntensity = LAMP_ORANGE.glow
      mat.roughness = LAMP_ORANGE.roughness
    }
  }
  apply()
  if (import.meta.env.DEV && materials.length) addDial(apply)
}

// DEV ONLY (npm run dev): a small panel to dial the look in. Never in the build.
function addDial(apply) {
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9998;background:rgba(20,20,24,.82);color:#eee;' +
    'font:12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;width:230px'
  const rows = [['opacity', 'Transparency (opacity)', 0.05, 1, 0.01], ['glow', 'Glow', 0, 1.5, 0.01], ['roughness', 'Roughness', 0, 1, 0.01]]
  const out = document.createElement('div')
  out.style.cssText = 'margin-top:6px;opacity:.75;user-select:all'
  const show = () => { out.textContent = JSON.stringify(LAMP_ORANGE) }
  box.innerHTML = '<b>Mac-Lamp orange</b>'
  for (const [key, label, min, max, step] of rows) {
    const wrap = document.createElement('label')
    wrap.style.cssText = 'display:block;margin-top:6px'
    const val = document.createElement('span')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: LAMP_ORANGE[key] })
    input.style.cssText = 'width:100%'
    const sync = () => { LAMP_ORANGE[key] = +input.value; val.textContent = ' ' + (+input.value).toFixed(2); apply(); show() }
    input.addEventListener('input', sync)
    // Keys typed here must not walk the camera.
    for (const t of ['keydown', 'keyup', 'pointerdown', 'mousedown', 'wheel']) input.addEventListener(t, e => e.stopPropagation())
    wrap.append(label, val, input)
    box.append(wrap)
    sync()
  }
  for (const t of ['pointerdown', 'mousedown', 'click', 'wheel', 'touchstart']) box.addEventListener(t, e => e.stopPropagation())
  box.append(out)
  document.body.append(box)
}
