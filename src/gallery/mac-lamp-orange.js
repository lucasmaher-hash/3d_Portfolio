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
// Under `npm run dev` the silver dials (bottom right) are shown; nothing of them ships.
// Values dialled in by Lucas on 2026-10-22.
export const LAMP_ORANGE = { opacity: 0.92, glow: 0.43, roughness: 0 }

// Metal finish for three exhibits, one value set each (same five dials):
//  - Mac-Lamp's light grey parts (Lamp_Grey, authored as black metal + grey glow), values
//    dialled in by Lucas on 2026-10-22;
//  - Cybercoffee's silver egg (M_Silver_Egg), Lucas's values, live;
//  - Virtual Cooking's silver panel (M_Silver_Panel), Lucas's values, live.
// colour = base x brightness, emissive = authored emissive x glow. The brushed streak texture
// is always attached as roughness + bump map: `texture` scales the bump and the roughness
// multiplier, and the streaks (~0.5 mean) swing roughness around the set value — so 0.11 at
// texture 0 renders as ~0.05 with a faint grain. Kept that way because it is what Lucas tuned.
export const LAMP_GREY = { brightness: 0.94, metalness: 0.61, roughness: 0.11, glow: 0.3, texture: 0 }
export const EGG_SILVER = { brightness: 1.5, metalness: 1, roughness: 0, glow: 1.05, texture: 0 }   // Lucas, 2026-10-22
export const PANEL_SILVER = { brightness: 3.17, metalness: 1, roughness: 0.14, glow: 3.89, texture: 1.5 }   // Lucas, 2026-10-22

// Virtual Cooking's step tiles above the purple one (M_Seg, a plain light grey dielectric).
// Being dialled in: dev only. glow = emissive in the tile's own colour.
export const PANEL_TILES = { brightness: 1, glow: 0, roughness: 0.5 }

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

let brushed = null
function metalFinish(materials, values, title, { base, emissive, max = {} }) {
  if (!materials.length) return
  brushed = brushed || brushedTexture()
  for (const mat of materials) {
    mat.roughnessMap = brushed
    mat.bumpMap = brushed
    if (emissive) mat.emissive.copy(emissive)
    mat.needsUpdate = true
  }
  const baseColor = base.clone(), baseEm = materials[0].emissive.clone()
  const apply = () => {
    const k = values
    for (const mat of materials) {
      mat.color.copy(baseColor).multiplyScalar(k.brightness)
      mat.metalness = k.metalness
      mat.roughness = Math.min(1, k.roughness * (1 + k.texture))
      mat.bumpScale = k.texture * 0.6
      mat.emissive.copy(baseEm)
      mat.emissiveIntensity = k.glow
    }
  }
  apply()
  if (import.meta.env.DEV && title) addDial(title, values, [
    ['brightness', 'Brightness', 0.05, max.brightness || 1.5, 0.01], ['metalness', 'Metalness', 0, 1, 0.01],
    ['roughness', 'Roughness', 0, 1, 0.01], ['glow', 'Glow', 0, max.glow || 1.5, 0.01], ['texture', 'Brush texture', 0, 1.5, 0.01],
  ], apply)
}

const materialsNamed = (model, name) => {
  const out = []
  model.traverse(o => { if (o.isMesh) for (const m of [o.material].flat()) if (m.name === name && !out.includes(m)) out.push(m) })
  return out
}

function metalGrey(model) {
  const meshes = GREY_NAMES.map(n => model.getObjectByName(n)).filter(o => o && o.isMesh)
  metalFinish(meshes.flatMap(m => [m.material].flat()), LAMP_GREY, null,
    { base: new THREE.Color(1, 1, 1), emissive: new THREE.Color().setRGB(0.58, 0.58, 0.58) })
  const egg = materialsNamed(model, 'M_Silver_Egg')
  if (egg.length) metalFinish(egg, EGG_SILVER, null, { base: egg[0].color.clone() })
  const panel = materialsNamed(model, 'M_Silver_Panel')
  if (panel.length) metalFinish(panel, PANEL_SILVER, null, { base: panel[0].color.clone() })
  // Step tiles: still being dialled in (2026-10-22), dev only — live keeps the authored look.
  if (!import.meta.env.DEV) return
  const tiles = materialsNamed(model, 'M_Seg')
  if (!tiles.length) return
  const tileBase = tiles[0].color.clone()
  const applyTiles = () => {
    for (const mat of tiles) {
      mat.color.copy(tileBase).multiplyScalar(PANEL_TILES.brightness)
      mat.emissive.copy(tileBase)
      mat.emissiveIntensity = PANEL_TILES.glow
      mat.roughness = PANEL_TILES.roughness
    }
  }
  applyTiles()
  addDial('Virtual Cooking tiles', PANEL_TILES, [
    ['brightness', 'Brightness', 0.05, 3, 0.01], ['glow', 'Glow', 0, 3, 0.01], ['roughness', 'Roughness', 0, 1, 0.01],
  ], applyTiles)
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
  let col = document.getElementById('dev-dials')
  if (!col) {
    col = document.createElement('div')
    col.id = 'dev-dials'
    col.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;gap:8px;align-items:flex-end'
    document.body.append(col)
  }
  const box = document.createElement('div')
  box.style.cssText = 'background:rgba(20,20,24,.82);color:#eee;' +
    'font:12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;width:210px'
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
  col.append(box)
}
