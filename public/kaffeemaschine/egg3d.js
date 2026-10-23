// The machine drawn as the real 3D egg (Lucas, 2026-10-23): egg body, bezel, logo button
// and the six side buttons are the modelled parts from the old 3D scene (egg.glb, exported
// by scripts/kaffeemaschine/export-egg.mjs), rendered into a canvas behind the HTML. The
// HTML stays the app: the screen content sits on the 3D screen, and the buttons stay
// <button>s — invisible now, placed exactly over their 3D counterparts — so pressButton(),
// the chevron rules (.chev-active) and the press shrink (.phys-pressed) are unchanged and
// this file only mirrors those classes onto the 3D parts:
//   .phys-pressed  → the 3D button shrinks to 90 % about its own centre, chevron with it
//                    (the logo: the RLB letters with it), and sinks a hair into the egg;
//   .chev-active   → the chevron lights up red; otherwise it is grey, as before.
// If WebGL or the model fails, nothing is hidden and the flat SVG egg stays.
//
// Materials: egg = brushed-able metal, buttons/bezel/logo button = shiny white plastic,
// tuned by Lucas with a dial (removed 2026-10-23; window.Egg3D.set() still takes new values
// from the console, and the dial is in git history: public/kaffeemaschine/egg-dial.js).
import * as THREE from 'three'
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js'

export const DEFAULTS = {   // Lucas's dial values, 2026-10-23 (light: preset 5 = "Window + rim")
  metal:   { r: 0.403, g: 0.41, b: 0.429, brightness: 0.63, metalness: 0.95, roughness: 0, clearcoat: 0, brushed: 0 },
  plastic: { brightness: 0.85, roughness: 0, clearcoat: 1, glow: 0 },
  chevron: { glow: 0 },
  light:   { env: 0.82, key: 0.4, exposure: 1.29, preset: 5 },
}
// Where the light comes from (Lucas: "not entirely from the top"). Each preset places the
// key light (with its shadow), a soft opposite fill/rim, and turns the studio environment
// whose bright panels otherwise all sit overhead. 0 is the look that was tuned first.
export const LIGHT_PRESETS = [
  { name: 'Top left',      key: [-2.0, 2.8, 1.6],  fill: [2, -1, 2],    fillI: 0,    env: [0, 0, 0] },
  { name: 'Side left',     key: [-3.2, 0.5, 1.4],  fill: [2.5, 0.3, 1], fillI: 0.25, env: [0, -1.2, 0] },
  { name: 'Front 3/4',     key: [-1.4, 0.9, 3.2],  fill: [2, 0.5, 2],   fillI: 0.2,  env: [0.5, -0.5, 0] },
  { name: 'Side right',    key: [3.2, 0.7, 1.4],   fill: [-2.5, 0.3, 1],fillI: 0.25, env: [0, 1.2, 0] },
  { name: 'Low left',      key: [-2.0, -1.6, 2.4], fill: [1.5, 2, 1.5], fillI: 0.3,  env: [Math.PI, 0, 0] },
  { name: 'Window + rim',  key: [-3.0, 1.2, 0.9],  fill: [2.6, 1.4, -1.2], fillI: 1.2, env: [0, -1.57, 0] },
]
const CHEV_ON = new THREE.Color('#ff7171'), CHEV_OFF = new THREE.Color('#939393')
const FRAME = { w: 969, h: 1344, egg: { x0: 22, x1: 946, y0: 91.54, y1: 1187.07 } }   // Figma frame of the flat egg
const BTNS = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3']

const machine = document.querySelector('.machine')
const values = structuredClone(DEFAULTS)

let renderer
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
} catch (e) { console.warn('Egg3D: no WebGL, keeping the flat egg', e) }

if (renderer) start().catch(e => console.warn('Egg3D failed, keeping the flat egg', e))

async function start() {
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping   // keeps the coral red, ACES washed it pink
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.className = 'egg3d-canvas'
  machine.prepend(canvas)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  const key = new THREE.DirectionalLight(0xffffff, 1)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.002
  key.shadow.radius = 4
  const fill = new THREE.DirectionalLight(0xffffff, 0)   // no shadow: only shape
  scene.add(key, key.target, fill)

  const gltf = await new GLTFLoader().loadAsync('egg.glb')
  const model = gltf.scene
  scene.add(model)
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model.getObjectByName('egg-body'))
  const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3())
  model.position.sub(c)                             // egg centred on the origin, front = +z
  model.updateMatrixWorld(true)
  const S = s => model.getObjectByName(s)

  // Orthographic camera framed so the egg lands exactly where the flat Figma egg was:
  // every HTML position in this file keeps its meaning.
  const pxPerUnit = (FRAME.egg.x1 - FRAME.egg.x0) / size.x
  const fw = FRAME.w / pxPerUnit, fh = FRAME.h / pxPerUnit
  const eggMidY = (FRAME.egg.y0 + FRAME.egg.y1) / 2
  const camY = (eggMidY - FRAME.h / 2) / pxPerUnit   // egg sits above the frame's middle
  const camera = new THREE.OrthographicCamera(-fw / 2, fw / 2, fh / 2 + camY, -fh / 2 + camY, 0.01, 20)
  camera.position.set(0, 0, 5)
  key.target.position.set(0, 0, 0)
  const sb = Math.max(fw, fh) / 2
  Object.assign(key.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 0.5, far: 8 })

  let dirty = true
  // ── materials ──
  const brushed = brushedTexture()
  const metal = new THREE.MeshPhysicalMaterial({ roughnessMap: brushed, bumpMap: brushed })
  const plastic = new THREE.MeshPhysicalMaterial()
  const screen = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15 })
  const coral = new THREE.MeshStandardMaterial({ color: CHEV_ON, roughness: 0.6 })
  model.traverse(o => {
    if (!o.isMesh) return
    o.castShadow = o.receiveShadow = true
    const n = o.name
    o.material = n === 'egg-body' ? metal
      : n === 'display-screen' ? screen
      : n === 'logo-RLB' ? coral
      : n.startsWith('chev-') ? new THREE.MeshStandardMaterial({ color: CHEV_OFF.clone(), roughness: 0.6 })
      : plastic
  })
  S('egg-body').castShadow = false
  // The egg has no UVs; the brushed streaks need some. Planar, from the front: x along
  // the brush, so the grain runs horizontally across the egg.
  {
    const eb = S('egg-body'), pos = eb.geometry.attributes.position, v = new THREE.Vector3()
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(eb.matrixWorld)
      uv[i * 2] = v.x / size.x + 0.5; uv[i * 2 + 1] = v.y / size.y + 0.5
    }
    eb.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }
  const apply = () => {
    const m = values.metal, p = values.plastic, l = values.light
    metal.color.setRGB(m.r, m.g, m.b).multiplyScalar(m.brightness)
    metal.metalness = m.metalness
    metal.roughness = Math.min(1, m.roughness)
    metal.bumpScale = m.brushed * 0.6
    metal.clearcoat = m.clearcoat
    metal.clearcoatRoughness = 0.08
    plastic.color.setScalar(0.95 * p.brightness)
    plastic.roughness = p.roughness
    plastic.clearcoat = p.clearcoat
    plastic.clearcoatRoughness = 0.1
    plastic.emissive.setScalar(0.95)
    plastic.emissiveIntensity = p.glow
    scene.environmentIntensity = l.env
    const pr = LIGHT_PRESETS[Math.round(l.preset)] || LIGHT_PRESETS[0]
    key.position.fromArray(pr.key)
    fill.position.fromArray(pr.fill)
    fill.intensity = pr.fillI * l.key
    scene.environmentRotation.set(pr.env[0], pr.env[1], pr.env[2])
    key.intensity = l.key
    renderer.toneMappingExposure = l.exposure
    dirty = true
  }

  // ── buttons: each 3D button (+ its chevron / the logo letters) in a group whose origin
  //    is the button's centre, so a scale shrinks it in place ──
  const parts = {}
  const group = (btnName, extra, el) => {
    const btn = S(btnName), b = new THREE.Box3().setFromObject(btn)
    const g = new THREE.Group()
    g.position.copy(model.worldToLocal(b.getCenter(new THREE.Vector3())))
    model.add(g); g.updateMatrixWorld(true)
    g.attach(btn); if (extra) g.attach(extra)
    return { g, box: b, el, baseZ: g.position.z, chev: extra && extra.name.startsWith('chev-') ? extra : null, s: 1, z: 0, glow: 0 }
  }
  for (const id of BTNS) parts[id] = group('btn-' + id, S('chev-' + id), machine.querySelector('.btn-' + id))
  parts.LOGO = group('logo-btn', S('logo-RLB'), machine.querySelector('.logo-btn'))

  // ── place the HTML over the 3D: buttons as invisible hit areas, the screen on the screen ──
  const toFrame = b => {   // world box → % of the machine frame
    const a = b.min.clone().project(camera), z = b.max.clone().project(camera)
    const x0 = (Math.min(a.x, z.x) + 1) / 2, x1 = (Math.max(a.x, z.x) + 1) / 2
    const y0 = (1 - Math.max(a.y, z.y)) / 2, y1 = (1 - Math.min(a.y, z.y)) / 2
    return { left: x0 * 100 + '%', top: y0 * 100 + '%', width: (x1 - x0) * 100 + '%', height: (y1 - y0) * 100 + '%' }
  }
  for (const id in parts) Object.assign(parts[id].el.style, toFrame(parts[id].box))
  const scr = toFrame(new THREE.Box3().setFromObject(S('display-screen')))
  const disp = machine.querySelector('.display')
  Object.assign(disp.style, scr)

  // ── mirror the app's classes onto the 3D parts ──
  const sync = () => {
    for (const id in parts) {
      const p = parts[id]
      p.target = p.el.classList.contains('phys-pressed') ? 1 : 0
      p.lit = id !== 'LOGO' && p.el.classList.contains('chev-active') ? 1 : 0
    }
    dirty = true
  }
  new MutationObserver(sync).observe(machine, { subtree: true, attributes: true, attributeFilter: ['class'] })
  sync()
  for (const id in parts) parts[id].glow = parts[id].lit   // no fade on first paint

  // ── size + render loop (renders only while something moves) ──
  let last = performance.now()
  const resize = () => {
    const r = machine.getBoundingClientRect()
    if (!r.width) return
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(r.width, r.height, false)
    dirty = true
  }
  new ResizeObserver(resize).observe(machine)
  resize()
  apply()
  const tick = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    let moving = false
    for (const id in parts) {
      const p = parts[id]
      const ts = p.target ? 0.9 : 1, tz = p.target ? -0.006 : 0
      const k = 1 - Math.exp(-dt / 0.035)            // ~the CSS 0.06 s ease
      p.s += (ts - p.s) * k; p.z += (tz - p.z) * k
      p.glow += (p.lit - p.glow) * (1 - Math.exp(-dt / 0.06))
      if (Math.abs(ts - p.s) > 1e-4 || Math.abs(p.lit - p.glow) > 1e-3) moving = true
      p.g.scale.setScalar(p.s)
      p.g.position.z = p.baseZ + p.z
      if (p.chev) {
        p.chev.material.color.copy(CHEV_OFF).lerp(CHEV_ON, p.glow)
        p.chev.material.emissive.copy(CHEV_ON).multiplyScalar(values.chevron.glow * p.glow)
      }
    }
    if (moving || dirty) { renderer.render(scene, camera); dirty = false }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(t => { last = t; tick(t) })
  renderer.compile(scene, camera)
  renderer.render(scene, camera)
  machine.classList.add('egg3d-ready')                // hides the flat SVG egg and HTML button art

  window.Egg3D = {
    values, defaults: DEFAULTS,
    presets: LIGHT_PRESETS,
    set(next) { for (const k in next) Object.assign(values[k], next[k]); apply() },
  }
  window.dispatchEvent(new Event('egg3d-ready'))
}

// Brushed-metal streaks (same recipe as the gallery's metal): per-row noise, low-passed
// along x, used as roughness + bump map.
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
      v += (row + (rnd() - 0.5) * 0.35 - v) * 0.08
      const p = (y * w + x) * 4, b = Math.max(0, Math.min(255, v * 255))
      img.data[p] = img.data[p + 1] = img.data[p + 2] = b; img.data[p + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 8)
  t.colorSpace = THREE.NoColorSpace
  return t
}
