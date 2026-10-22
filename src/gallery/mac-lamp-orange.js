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
// Under `npm run dev` the grey-metal dial (bottom right) is shown; nothing of it ships.
// Values dialled in by Lucas on 2026-10-22.
export const LAMP_ORANGE = { opacity: 0.92, glow: 0.43, roughness: 0 }

// The light grey parts (Lamp_Grey: also black metal + grey glow) become brushed metal: darker,
// truly metallic so they reflect the gallery's probe, with a fine streak texture driving
// roughness and bump. `brightness` is the linear base colour, `texture` the streak strength.
export const LAMP_GREY = { brightness: 0.75, metalness: 1, roughness: 0.32, glow: 0.22, texture: 0.3 }

const NAMES = ['Base_Orange_Table', 'VerticalPlate_Orange_Table']
const GREY_NAMES = ['Back_Grey_Panel_Table', 'KB_Grey_Panel_Table', 'Trackpad_Back_Grey_Table', 'Trackpad_Front_Grey_Table']
const ORANGE = new THREE.Color().setRGB(0.913, 0.147, 0.0123)   // the authored emissive colour

// Brushed-metal streaks: per-row noise stretched along x, drawn once into a canvas.
function brushedTexture() {
  const w = 512, h = 512, c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d'), img = g.createImageData(w, h)
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let y = 0; y < h; y++) {
    const row = 0.5 + (rnd() - 0.5) * 0.5
    let v = row
    for (let x = 0; x < w; x++) {
      v += (row + (rnd() - 0.5) * 0.35 - v) * 0.08   // low-passed along the brush direction
      const p = (y * w + x) * 4, b = Math.max(0, Math.min(255, v * 255))
      img.data[p] = img.data[p + 1] = img.data[p + 2] = b; img.data[p + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4)
  t.colorSpace = THREE.NoColorSpace
  return t
}

function metalGrey(model) {
  // Still being dialled in (2026-10-22): local dev only, the live site keeps the old grey.
  if (!import.meta.env.DEV) return
  const meshes = GREY_NAMES.map(n => model.getObjectByName(n)).filter(o => o && o.isMesh)
  const materials = meshes.flatMap(m => [m.material].flat())
  if (!materials.length) return
  const tex = brushedTexture()
  const grey = new THREE.Color().setRGB(0.58, 0.58, 0.58)   // the authored emissive grey
  for (const mat of materials) {
    mat.roughnessMap = tex
    mat.bumpMap = tex
    mat.emissive.copy(grey)
    mat.needsUpdate = true
  }
  const apply = () => {
    const k = LAMP_GREY
    for (const mat of materials) {
      mat.color.setScalar(k.brightness)
      mat.metalness = k.metalness
      // roughnessMap multiplies: the streaks (~0.5 mean) swing roughness around the set value.
      mat.roughness = Math.min(1, k.roughness * (1 + k.texture))
      mat.bumpScale = k.texture * 0.6
      mat.emissiveIntensity = k.glow
    }
  }
  apply()
  if (import.meta.env.DEV) addDial('Mac-Lamp grey metal', LAMP_GREY, [
    ['brightness', 'Brightness', 0.05, 1, 0.01], ['metalness', 'Metalness', 0, 1, 0.01],
    ['roughness', 'Roughness', 0, 1, 0.01], ['glow', 'Glow', 0, 1, 0.01], ['texture', 'Brush texture', 0, 1.5, 0.01],
  ], apply)
}

export async function roundAndTintMacLamp(model, gltfLoader) {
  metalGrey(model)
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
}

// DEV ONLY (npm run dev): a small panel to dial the look in. Never in the build.
function addDial(title, values, rows, apply) {
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9998;background:rgba(20,20,24,.82);color:#eee;' +
    'font:12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;width:230px'
  const out = document.createElement('div')
  out.style.cssText = 'margin-top:6px;opacity:.75;user-select:all;word-break:break-all'
  const show = () => { out.textContent = JSON.stringify(values) }
  box.innerHTML = '<b>' + title + '</b>'
  for (const [key, label, min, max, step] of rows) {
    const wrap = document.createElement('label')
    wrap.style.cssText = 'display:block;margin-top:6px'
    const val = document.createElement('span')
    const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: values[key] })
    input.style.cssText = 'width:100%'
    const sync = () => { values[key] = +input.value; val.textContent = ' ' + (+input.value).toFixed(2); apply(); show() }
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
