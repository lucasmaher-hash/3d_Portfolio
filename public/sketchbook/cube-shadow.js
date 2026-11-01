// Cast shadow of the cube on a floor that shares the cube's own tilt (it lives
// inside .stack's preserve-3d space, at the bottom of the sheets). Light comes
// from behind-left, so the shadow falls toward the viewer and to the right.
// Richtung is relative to the cube's rotateY, so the shadow keeps its screen
// direction when the layout tuner turns the cube (70° = front right, Lucas's values 2026-11-01). Always applied with the saved values;
// the dial shows with ?shadow=1 or ?tune=1.
const KEY = 'portfolio-sketchbook-shadow-v3'
const defaults = { angle: 70, length: 67, blur: 40, opacity: 39, tip: 8, color: '#000000', gap: 0 }
const fields = {
  angle: ['Richtung', '°', -90, 180], length: ['Länge', '%', 0, 250], blur: ['Weichheit', 'px', 0, 80],
  opacity: ['Intensität', '%', 0, 100], tip: ['Ende (Deckkraft)', '%', 0, 100], gap: ['Bodenabstand', 'px', -40, 80],
}

let values = { ...defaults }
try { Object.assign(values, JSON.parse(localStorage.getItem(KEY)) || {}) } catch {}

const button = document.querySelector('.stack-button')
const stack = document.querySelector('.stack')
const NS = 'http://www.w3.org/2000/svg'
const floor = document.createElement('span')
floor.className = 'cube-shadow'
floor.setAttribute('aria-hidden', 'true')
const svg = document.createElementNS(NS, 'svg')
svg.innerHTML = '<defs><linearGradient id="cube-shadow-fade" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1"/></linearGradient></defs><polygon fill="url(#cube-shadow-fade)"/>'
floor.append(svg)
stack.prepend(floor)
const [stopA, stopB] = svg.querySelectorAll('stop')
const grad = svg.querySelector('linearGradient')
const poly = svg.querySelector('polygon')

let rotateY = 147
window.addEventListener('sketchbook-orientation', e => { rotateY = Number(e.detail) || 0; apply() })
window.addEventListener('resize', () => apply())

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const q of p) { while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q) }
  for (const q of p.reverse()) { while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q) }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

// Depth the remaining (not yet viewed) sheets occupy, as fractions of the
// stack depth from the front plane (0) to the back plane (1). The shadow's
// footprint covers only that range and eases to it when a sheet is removed.
const span = { a: 0, b: 1, ta: 0, tb: 1 }
function readStack() {
  const st = window.__sketchStack
  if (!st || st.total < 2) return
  const n = st.total - 1
  if (st.reverse) { span.ta = 0; span.tb = (n - st.index) / n }
  else { span.ta = st.index / n; span.tb = 1 }
}
let easing = 0
function ease() {
  span.a += (span.ta - span.a) * 0.18; span.b += (span.tb - span.b) * 0.18
  if (Math.abs(span.ta - span.a) + Math.abs(span.tb - span.b) < 0.001) { span.a = span.ta; span.b = span.tb; easing = 0; apply(); return }
  apply(); easing = requestAnimationFrame(ease)
}
window.addEventListener('sketchbook-stack', () => {
  readStack()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { span.a = span.ta; span.b = span.tb; apply(); return }
  if (!easing) easing = requestAnimationFrame(ease)
})
readStack(); span.a = span.ta; span.b = span.tb

function apply() {
  const v = values
  const W = button.clientWidth, H = button.clientHeight, D = W
  if (!W) return
  // Screen direction on the floor -> cube-local floor axes (x along the sheet, z through the stack).
  const a = (v.angle - rotateY) * Math.PI / 180
  const L = W * v.length / 100
  const du = Math.sin(a) * L, dv = -Math.cos(a) * L   // element v axis points away from the viewer after rotateX(90deg) (measured)
  const pad = Math.max(W, L) + v.blur * 3
  Object.assign(floor.style, {
    position: 'absolute', left: '0', top: `calc(100% + ${v.gap}px)`, width: `${W}px`, height: `${D}px`,
    pointerEvents: 'none', transformOrigin: '50% 0', transform: `translateZ(${-D}px) rotateX(90deg)`,
  })
  Object.assign(svg.style, { position: 'absolute', left: `${-pad}px`, top: `${-pad}px`, width: `${W + 2 * pad}px`, height: `${D + 2 * pad}px`, overflow: 'visible', filter: `blur(${v.blur}px)` })
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${W + 2 * pad} ${D + 2 * pad}`)
  const thin = 0.03 // a single sheet still throws a sliver of shadow
  const mid = (span.a + span.b) / 2, half = Math.max(thin / 2, (span.b - span.a) / 2)
  const v0 = D * (1 - Math.min(1, mid + half)), v1 = D * (1 - Math.max(0, mid - half))
  const base = [[0, v0], [W, v0], [W, v1], [0, v1]]
  poly.setAttribute('points', hull(base.concat(base.map(([x, y]) => [x + du, y + dv]))).map(p => p.join(',')).join(' '))
  grad.setAttribute('x1', W / 2); grad.setAttribute('y1', (v0 + v1) / 2)
  grad.setAttribute('x2', W / 2 + du * 1.5); grad.setAttribute('y2', (v0 + v1) / 2 + dv * 1.5)
  stopA.setAttribute('stop-color', v.color); stopA.setAttribute('stop-opacity', v.opacity / 100)
  stopB.setAttribute('stop-color', v.color); stopB.setAttribute('stop-opacity', v.opacity / 100 * v.tip / 100)
}
apply()
requestAnimationFrame(apply)

const q = new URLSearchParams(location.search)
if (q.get('shadow') === '1' || q.get('tune') === '1') {
  const panel = document.createElement('section')
  panel.style.cssText = 'position:fixed;left:20px;bottom:20px;z-index:9999;width:min(300px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:14px;border-radius:20px;background:rgba(240,240,245,.92);box-shadow:0 8px 30px rgba(0,0,0,.18);font:12px/1.4 "Roboto Flex UI",sans-serif;color:#222'
  panel.addEventListener('keydown', e => e.stopPropagation())
  panel.innerHTML = '<strong style="display:block;margin-bottom:8px">Würfel-Schatten</strong>'
  const rows = {}
  const out = Object.assign(document.createElement('textarea'), { readOnly: true, rows: 2 })
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(values)) } catch {} ; out.value = JSON.stringify(values) }
  const row = (label, input, extra) => {
    const l = document.createElement('label'); l.style.cssText = 'display:grid;grid-template-columns:96px minmax(0,1fr) 44px;gap:6px;align-items:center;margin:4px 0'
    l.append(Object.assign(document.createElement('span'), { textContent: label }), input)
    if (extra) l.append(extra)
    panel.append(l)
  }
  for (const [k, [label, unit, min, max]] of Object.entries(fields)) {
    const r = Object.assign(document.createElement('input'), { type: 'range', min, max, step: 1, value: values[k] })
    const n = Object.assign(document.createElement('span'), { textContent: values[k] + unit, style: 'text-align:right' })
    r.addEventListener('input', () => { values[k] = r.valueAsNumber; n.textContent = values[k] + unit; apply(); save() })
    rows[k] = [r, n, unit]
    row(label, r, n)
  }
  const c = Object.assign(document.createElement('input'), { type: 'color', value: values.color })
  c.addEventListener('input', () => { values.color = c.value; apply(); save() })
  row('Farbe', c)
  out.style.cssText = 'width:100%;margin-top:8px;font:11px monospace'
  out.value = JSON.stringify(values)
  const reset = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Zurücksetzen' })
  reset.style.cssText = 'margin-top:8px'
  reset.addEventListener('click', () => {
    values = { ...defaults }; apply(); save(); c.value = values.color
    for (const [k, [r, n, unit]] of Object.entries(rows)) { r.value = values[k]; n.textContent = values[k] + unit }
  })
  panel.append(out, reset)
  document.body.append(panel)
}
